import { NextRequest, NextResponse } from 'next/server';

// Facebook sends signed_request when a user removes the app.
// We decode it to log the user ID and acknowledge the deauthorization event.
function parseSignedRequest(signedRequest: string) {
  try {
    const [encodedSig, encodedPayload] = signedRequest.split('.');
    const payload = JSON.parse(Buffer.from(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return { encodedSig, payload };
  } catch (error) {
    console.error('[FB Deauthorize] Failed to parse signed_request:', error);
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

    console.log('[FB Deauthorize] Received deauth event', {
      userId: parsed.payload?.user_id,
      issuedAt: parsed.payload?.issued_at,
    });

    // In a fuller implementation, you could revoke tokens or flag the account here.

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[FB Deauthorize] Error handling request:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
