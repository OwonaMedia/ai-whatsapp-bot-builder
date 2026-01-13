import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getTemplateByUseCase, customizeTemplate } from '@/lib/templates/useCaseTemplates';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
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

    // Get use case
    const useCase = bot.use_case;

    if (!useCase) {
      return NextResponse.json({ error: 'No use case defined' }, { status: 400 });
    }

    // Get template
    const template = getTemplateByUseCase(useCase);

    if (!template) {
      return NextResponse.json({ error: 'No template found for use case' }, { status: 404 });
    }

    // Customize template
    const customizedFlow = customizeTemplate(template, bot.name, bot.description || undefined);

    return NextResponse.json({ template, flow: customizedFlow });
  } catch (error: any) {
    console.error('Template fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { templateId, companyName } = await request.json();

    const supabase = createClient();
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

    // Get template
    const template = getTemplateByUseCase(templateId);

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Customize template
    const customizedFlow = customizeTemplate(template, bot.name, companyName || bot.description || undefined);

    // Save flow to bot
    const { data: existingFlow } = await supabase
      .from('bot_flows')
      .select('id')
      .eq('bot_id', params.id)
      .eq('is_active', true)
      .single();

    if (existingFlow) {
      // Update existing flow
      const { error: updateError } = await supabase
        .from('bot_flows')
        .update({
          flow_data: customizedFlow,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingFlow.id);

      if (updateError) throw updateError;
    } else {
      // Create new flow
      const { error: insertError } = await supabase
        .from('bot_flows')
        .insert({
          bot_id: params.id,
          name: customizedFlow.name,
          flow_data: customizedFlow,
          is_active: true,
        });

      if (insertError) throw insertError;
    }

    // Update bot use case if not set
    if (!bot.use_case) {
      await supabase
        .from('bots')
        .update({ use_case: template.useCaseType })
        .eq('id', params.id);
    }

    return NextResponse.json({ success: true, flow: customizedFlow });
  } catch (error: any) {
    console.error('Template apply error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to apply template' },
      { status: 500 }
    );
  }
}

