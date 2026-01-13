import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const SESSION_COOKIE_NAME = 'wbb_internal_session';
const SESSION_TTL_HOURS = 12;

const INTERNAL_EMAIL =
  process.env.INTERNAL_PORTAL_EMAIL?.toLowerCase().trim() ?? 'sm@owona.de';

const DEFAULT_PASSWORD_HASH = '$2b$10$mo4LzQcaCPQYpAcAAxjH.euqeRKLJV/iqRMLqUCC.NNP.7CxwgXoK';
const INTERNAL_PASSWORD_HASH =
  process.env.INTERNAL_PORTAL_PASSWORD_HASH || DEFAULT_PASSWORD_HASH;

function getSigningKey() {
  const secret = process.env.INTERNAL_PORTAL_SECRET;
  if (!secret) {
    throw new Error(
      '[Internal Auth] INTERNAL_PORTAL_SECRET fehlt. Bitte in frontend/.env.local setzen.'
    );
  }
  return new TextEncoder().encode(secret);
}

export type InternalSession = {
  email: string;
  issuedAt: number;
  expiresAt: number;
};

export async function verifyInternalCredentials(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();
  if (normalizedEmail !== INTERNAL_EMAIL) {
    return false;
  }
  return bcrypt.compare(password, INTERNAL_PASSWORD_HASH);
}

export async function createInternalSession(email: string) {
  const key = getSigningKey();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_TTL_HOURS * 60 * 60;

  const token = await new SignJWT({ email, issuedAt, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(key);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_HOURS * 60 * 60,
  });
}

export async function destroyInternalSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getInternalSession(): Promise<InternalSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return null;
    }

    const key = getSigningKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });

    const email = typeof payload.email === 'string' ? payload.email : undefined;
    const issuedAt =
      typeof payload.issuedAt === 'number'
        ? payload.issuedAt
        : typeof payload.iat === 'number'
        ? payload.iat
        : undefined;
    const expiresAt =
      typeof payload.expiresAt === 'number'
        ? payload.expiresAt
        : typeof payload.exp === 'number'
        ? payload.exp
        : undefined;

    if (!email || !issuedAt || !expiresAt) {
      return null;
    }

    if (expiresAt * 1000 < Date.now()) {
      await destroyInternalSession();
      return null;
    }

    return { email, issuedAt, expiresAt };
  } catch (error) {
    console.warn('[Internal Auth] Session konnte nicht verifiziert werden', error);
    try {
      await destroyInternalSession();
    } catch (destroyError) {
      console.warn('[Internal Auth] Session-Cookie konnte nicht gelöscht werden', destroyError);
    }
    return null;
  }
}

export function getInternalPortalEmail() {
  return INTERNAL_EMAIL;
}

