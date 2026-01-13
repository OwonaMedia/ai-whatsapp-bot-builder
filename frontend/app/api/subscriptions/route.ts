import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import {
  getUserSubscription,
  getUserUsage,
  canCreateBot,
  canSendMessage,
  hasFeature,
  getSubscriptionLimits,
} from '@/lib/subscriptions';

/**
 * GET /api/subscriptions
 * Get current user's subscription information
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getUserSubscription(user.id);
    const usage = await getUserUsage(user.id);

    return NextResponse.json({
      subscription,
      usage,
    });
  } catch (error: any) {
    console.error('Error getting subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/subscriptions/check
 * Check if user can perform an action (create bot, send message, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'create_bot': {
        const result = await canCreateBot(user.id);
        return NextResponse.json(result);
      }
      case 'send_message': {
        const result = await canSendMessage(user.id);
        return NextResponse.json(result);
      }
      case 'has_feature': {
        const { featureName } = body;
        if (!featureName) {
          return NextResponse.json({ error: 'Feature name is required' }, { status: 400 });
        }
        const hasAccess = await hasFeature(user.id, featureName);
        return NextResponse.json({ hasAccess });
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

