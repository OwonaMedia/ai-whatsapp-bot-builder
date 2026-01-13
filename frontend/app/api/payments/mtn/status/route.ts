import { NextRequest, NextResponse } from 'next/server';

import { checkMTNMobileMoneyPaymentStatus } from '@/lib/payments/mtn-mobile-money';
import {
  ensureMtnMobileMoneyConfigured,
  PaymentConfigError,
} from '@/lib/payments/config-resolver';

/**
 * GET /api/payments/mtn/status?referenceId=UUID
 * Liest den aktuellen Status eines MTN Mobile Money RequestToPay Vorgangs aus.
 */
export async function GET(request: NextRequest) {
  const referenceId = request.nextUrl.searchParams.get('referenceId');

  if (!referenceId) {
    return NextResponse.json(
      { error: 'referenceId query parameter is required' },
      { status: 400 },
    );
  }

  try {
    await ensureMtnMobileMoneyConfigured();
    const payment = await checkMTNMobileMoneyPaymentStatus(referenceId);

    return NextResponse.json({
      success: true,
      provider: 'mtn-mobile-money',
      referenceId: payment.referenceId,
      financialTransactionId: payment.financialTransactionId,
      externalId: payment.externalId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      payer: payment.payer,
      reason: payment.reason || null,
      errorCode: payment.errorCode || null,
    });
  } catch (error: any) {
    if (error instanceof PaymentConfigError) {
      console.warn('[MTN Mobile Money Status] Config error:', error.message);
      return NextResponse.json(
        {
          error: error.message,
          provider: error.provider,
          code: error.code,
        },
        { status: 503 },
      );
    }
    console.error('[MTN Mobile Money Status] Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve MTN Mobile Money payment status', message: error.message },
      { status: 500 },
    );
  }
}

