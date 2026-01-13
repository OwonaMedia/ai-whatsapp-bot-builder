import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, createServiceRoleClient } from '@/lib/supabase';

type RouteParams = {
  params: {
    id: string;
  };
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const ticketId = params.id;
  if (!ticketId) {
    return NextResponse.json({ error: 'missing_ticket_id' }, { status: 400 });
  }

  const supabase = await createRouteHandlerClient();
  const serviceClient = createServiceRoleClient();

  try {
    const body = await request.json();
    const { message, quickReplyId, quickReplyLabel, metadata } = body ?? {};

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'missing_message' }, { status: 422 });
    }

    const trimmedMessage = message.trim();

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('[SupportTicketReply API] auth error', authError);
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const user = authData?.user;
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const enrichedMetadata = {
      ...(metadata ?? {}),
      origin: quickReplyId ? 'quick_reply' : 'manual',
      quickReplyId: quickReplyId ?? null,
      quickReplyLabel: quickReplyLabel ?? null,
      submittedAt: new Date().toISOString(),
    };

    const { error: insertError } = await supabase.from('support_ticket_messages').insert({
      ticket_id: ticketId,
      author_type: 'customer',
      author_user_id: user.id,
      author_name: user.email ?? 'Kunde',
      message: trimmedMessage,
      metadata: enrichedMetadata,
    });

    if (insertError) {
      console.error('[SupportTicketReply API] insert error', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    const { data: existingTicket, error: ticketError } = await serviceClient
      .from('support_tickets')
      .select('status, priority, escalation_path, support_ticket_messages(author_type)')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError) {
      console.warn('[SupportTicketReply API] ticket fetch error', ticketError);
    }

    const supportMessagesCount =
      existingTicket?.support_ticket_messages?.filter((msg) => msg.author_type === 'support').length ?? 0;
    const customerMessagesCount =
      existingTicket?.support_ticket_messages?.filter((msg) => msg.author_type === 'customer').length ?? 0;

    const hasPriorSupportResponse = supportMessagesCount > 0;
    const shouldEscalate = hasPriorSupportResponse && customerMessagesCount >= 1;

    const nextPriority = computePriority(existingTicket?.priority, shouldEscalate);

    const updates: Record<string, unknown> = {
      status: 'investigating',
      priority: nextPriority,
      updated_at: new Date().toISOString(),
    };

    if (shouldEscalate) {
      const currentPath = Array.isArray(existingTicket?.escalation_path)
        ? (existingTicket?.escalation_path as Array<Record<string, unknown>>)
        : [];

      const escalationEntry = {
        agent: 'tier2-automation',
        status: 'customer_followup',
        trigger: 'customer_followup_after_support',
        timestamp: new Date().toISOString(),
      };

      const alreadyLogged = currentPath.some(
        (entry) => entry?.trigger === escalationEntry.trigger && entry?.status === escalationEntry.status,
      );

      if (!alreadyLogged) {
        updates.escalation_path = [...currentPath, escalationEntry];
      }
    }

    try {
      await serviceClient.from('support_tickets').update(updates).eq('id', ticketId);
    } catch (updateError) {
      console.warn('[SupportTicketReply API] ticket update failed', updateError);
    }

    if (shouldEscalate) {
      try {
        await serviceClient.from('support_ticket_messages').insert({
          ticket_id: ticketId,
          author_type: 'support',
          author_user_id: null,
          author_name: 'Tier-1 Automation',
          message: [
            'Ich habe deine Antwort erhalten und eskaliere das Ticket jetzt an unser Tier 2 Team.',
            'Sobald die technische Analyse startet, bekommst du ein Status-Update.',
          ].join('\n\n'),
          metadata: {
            kind: 'auto_escalation_notice',
            trigger: 'customer_followup_after_support',
          },
        });
      } catch (noticeError) {
        console.warn('[SupportTicketReply API] escalation notice failed', noticeError);
      }
    }

    return NextResponse.json({
      success: true,
      escalated: shouldEscalate,
      priority: nextPriority,
    });
  } catch (error) {
    console.error('[SupportTicketReply API] Unexpected error', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}

function computePriority(
  currentPriority: string | null | undefined,
  shouldEscalate: boolean,
): 'low' | 'normal' | 'high' | 'urgent' {
  if (!shouldEscalate) {
    return (currentPriority as 'low' | 'normal' | 'high' | 'urgent') ?? 'normal';
  }

  const priorityOrder: Array<'low' | 'normal' | 'high' | 'urgent'> = ['low', 'normal', 'high', 'urgent'];
  const currentIndex = currentPriority ? priorityOrder.indexOf(currentPriority as typeof priorityOrder[number]) : -1;
  const nextIndex = Math.min(priorityOrder.length - 1, currentIndex >= 0 ? currentIndex + 1 : 2);
  return priorityOrder[nextIndex] || 'normal';
}




