import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

function parseAllowedIPs(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(',')
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);
}

function isAllowedIP(clientIP: string, allowedIPs: string[]): boolean {
  return allowedIPs.some((allowedIP) => {
    if (allowedIP === clientIP) return true;
    if (allowedIP.endsWith('.*')) {
      const prefix = allowedIP.slice(0, -2);
      return clientIP.startsWith(prefix);
    }
    return false;
  });
}

export async function GET() {
  const h = await headers();
  const forwardedFor = h.get('x-forwarded-for');
  const realIP = h.get('x-real-ip');
  const cfConnectingIP = h.get('cf-connecting-ip');

  const clientIP =
    forwardedFor?.split(',')[0]?.trim() || realIP || cfConnectingIP || 'unknown';

  const allowedIPsEnv = process.env.ALLOWED_IPS;
  const allowedIPs = parseAllowedIPs(allowedIPsEnv);
  const allowed = clientIP !== 'unknown' && isAllowedIP(clientIP, allowedIPs);

  const payload = {
    clientIP,
    allowedIPs,
    allowed,
    envPresent: typeof allowedIPsEnv === 'string',
    note:
      'This endpoint helps verify runtime env & matching. Values come from process.env and request headers.',
  };

  return NextResponse.json(payload, { status: 200 });
}
