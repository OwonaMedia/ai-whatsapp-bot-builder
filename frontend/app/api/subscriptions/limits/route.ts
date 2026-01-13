import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionLimits } from '@/lib/subscriptions';
import type { SubscriptionTier } from '@/lib/subscriptions';

/**
 * GET /api/subscriptions/limits?tier=free
 * Get subscription limits for a specific tier
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tier = searchParams.get('tier') as SubscriptionTier;

    if (!tier) {
      return NextResponse.json({ error: 'Tier is required' }, { status: 400 });
    }

    const limits = await getSubscriptionLimits(tier);

    if (!limits) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 });
    }

    return NextResponse.json({ limits });
  } catch (error: any) {
    console.error('Error getting subscription limits:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

