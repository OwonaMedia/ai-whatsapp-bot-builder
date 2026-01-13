import { NextRequest, NextResponse } from 'next/server';

import { detectPaymentMethods } from '@/lib/paymentDetection';
import {
  ensureMtnMobileMoneyConfigured,
  ensurePayPalConfigured,
  ensureStripeConfigured,
} from '@/lib/payments/config-resolver';

/**
 * GET /api/payments/methods
 * Get available payment methods based on user location
 */
export async function GET(request: NextRequest) {
  try {
    await Promise.allSettled([
      ensureStripeConfigured({ allowInactive: true }),
      ensurePayPalConfigured({ allowInactive: true }),
      ensureMtnMobileMoneyConfigured({ allowInactive: true }),
    ]);

    const { searchParams } = new URL(request.url);
    const userCurrency = searchParams.get('currency') || undefined;
    const userCountry = searchParams.get('country') || undefined;
    
    const result = await detectPaymentMethods(request, userCurrency, userCountry);
    const allowedMethods = new Set(['stripe', 'paypal', 'apple-pay', 'google-pay', 'mtn-mobile-money']);
    const filteredMethods = (result.paymentMethods || []).filter((method) =>
      allowedMethods.has(method.id),
    );

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        paymentMethods: filteredMethods,
      },
    });
  } catch (error: any) {
    console.error('[PaymentMethods] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to detect payment methods' },
      { status: 500 }
    );
  }
}

