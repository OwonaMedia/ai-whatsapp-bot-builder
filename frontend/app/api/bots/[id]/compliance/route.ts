import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';
import { ComplianceChecker } from '@/lib/compliance/checker';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get bot
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (botError || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Get active flow
    const { data: flowData } = await supabase
      .from('bot_flows')
      .select('flow_data')
      .eq('bot_id', params.id)
      .eq('is_active', true)
      .single();

    const flow = flowData?.flow_data || null;

    // Run compliance check
    const compliance = await ComplianceChecker.checkBot(bot, flow);

    return NextResponse.json(compliance);
  } catch (error: any) {
    console.error('Compliance check error:', error);
    return NextResponse.json(
      { error: error.message || 'Compliance check failed' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { useCase } = await request.json();

    const supabase = await createRouteHandlerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update bot use case
    const { data: bot, error: updateError } = await supabase
      .from('bots')
      .update({ use_case: useCase })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !bot) {
      return NextResponse.json({ error: 'Failed to update bot' }, { status: 500 });
    }

    // Get active flow
    const { data: flowData } = await supabase
      .from('bot_flows')
      .select('flow_data')
      .eq('bot_id', params.id)
      .eq('is_active', true)
      .single();

    const flow = flowData?.flow_data || null;

    // Run compliance check
    const compliance = await ComplianceChecker.checkBot(bot, flow);

    return NextResponse.json({ bot, compliance });
  } catch (error: any) {
    console.error('Update use case error:', error);
    return NextResponse.json(
      { error: error.message || 'Update failed' },
      { status: 500 }
    );
  }
}

