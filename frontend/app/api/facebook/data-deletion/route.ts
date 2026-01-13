import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Facebook sends signed_request when a user requests data deletion.
function parseSignedRequest(signedRequest: string) {
  try {
    const [encodedSig, encodedPayload] = signedRequest.split('.');
    const payload = JSON.parse(Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return { encodedSig, payload };
  } catch (error) {
    console.error('[FB Data Deletion] Failed to parse signed_request:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const signedRequest = form.get('signed_request')?.toString();

    if (!signedRequest) {
      return NextResponse.json({ error: 'signed_request missing' }, { status: 400 });
    }

    const parsed = parseSignedRequest(signedRequest);
    if (!parsed) {
      return NextResponse.json({ error: 'Invalid signed_request' }, { status: 400 });
    }

    const confirmationCode = randomBytes(8).toString('hex');

    console.log('[FB Data Deletion] Request received', {
      userId: parsed.payload?.user_id,
      issuedAt: parsed.payload?.issued_at,
      confirmationCode,
    });

    // Facebook expects a JSON with url + confirmation_code.
    // The url should point to a page where the user can check status or learn more.
    const statusUrl = `https://whatsapp.owona.de/de/legal/privacy?code=${confirmationCode}`;

    return NextResponse.json({ url: statusUrl, confirmation_code: confirmationCode });
  } catch (error: any) {
    console.error('[FB Data Deletion] Error handling request:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
