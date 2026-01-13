/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { revalidatePath } from 'next/cache';
import {
  createInternalSession,
  destroyInternalSession,
  getInternalPortalEmail,
  getInternalSession,
  verifyInternalCredentials,
} from '@/lib/internal-auth';
import { getServiceSupabaseClient } from '@/lib/supabase-service';

type ActionResult = {
  success: boolean;
  error?: string;
};

function sanitizeText(input: unknown) {
  if (typeof input !== 'string') {
    return '';
  }
  return input.trim();
}

export async function loginInternalAction(
  locale: string,
  _prevState: ActionResult | undefined,
  formData: FormData
): Promise<ActionResult> {
  const email = sanitizeText(formData.get('email'));
  const password = sanitizeText(formData.get('password'));

  if (!email || !password) {
    return { success: false, error: 'Bitte E-Mail & Passwort eingeben.' };
  }

  const isValid = await verifyInternalCredentials(email, password);
  if (!isValid) {
    await destroyInternalSession();
    return { success: false, error: 'Zugangsdaten ungültig.' };
  }

  await createInternalSession(getInternalPortalEmail());
  revalidatePath(`/${locale}/intern`);

  return { success: true };
}

export async function logoutInternalAction(locale: string) {
  await destroyInternalSession();
  revalidatePath(`/${locale}/intern`);
}

export async function postInternalReplyAction(params: {
  locale: string;
  ticketId: string;
  message: string;
  internalOnly?: boolean;
}): Promise<ActionResult> {
  const session = await getInternalSession();
  if (!session) {
    return { success: false, error: 'Session abgelaufen. Bitte erneut anmelden.' };
  }

  const message = params.message.trim();
  if (!message) {
    return { success: false, error: 'Nachricht darf nicht leer sein.' };
  }

  const supabase = getServiceSupabaseClient();

  const { error } = await supabase.from('support_ticket_messages').insert({
    ticket_id: params.ticketId,
    author_type: 'support',
    author_user_id: null,
    author_name: 'Support Lead',
    message,
    metadata: {
      source: 'internal-portal',
      internalOnly: Boolean(params.internalOnly),
      responder: session.email,
    },
    internal_only: Boolean(params.internalOnly),
    quick_reply_options: [],
  });

  if (error) {
    return {
      success: false,
      error: `Antwort konnte nicht gespeichert werden: ${error.message}`,
    };
  }

  await supabase
    .from('support_tickets')
    .update({
      status: params.internalOnly ? 'investigating' : 'waiting_customer',
      assigned_agent: session.email,
    })
    .eq('id', params.ticketId);

  revalidatePath(`/${params.locale}/intern`);

  return { success: true };
}

export async function updateTicketStatusAction(params: {
  locale: string;
  ticketId: string;
  status: string;
  assignedAgent?: string | null;
}): Promise<ActionResult> {
  const session = await getInternalSession();
  if (!session) {
    return { success: false, error: 'Session abgelaufen. Bitte erneut anmelden.' };
  }

  const validStatuses = new Set([
    'new',
    'investigating',
    'waiting_customer',
    'resolved',
    'closed',
  ]);

  if (!validStatuses.has(params.status)) {
    return { success: false, error: 'Ungültiger Ticketstatus.' };
  }

  const supabase = getServiceSupabaseClient();

  const { error } = await supabase
    .from('support_tickets')
    .update({
      status: params.status,
      assigned_agent: params.assignedAgent ?? session.email,
    })
    .eq('id', params.ticketId);

  if (error) {
    return {
      success: false,
      error: `Status konnte nicht aktualisiert werden: ${error.message}`,
    };
  }

  await supabase.from('support_ticket_messages').insert({
    ticket_id: params.ticketId,
    author_type: 'system',
    author_user_id: null,
    author_name: 'Support Lead',
    message: `Ticketstatus wurde auf „${params.status}” gesetzt.`,
    metadata: {
      source: 'internal-portal',
      updated_by: session.email,
    },
    internal_only: true,
    quick_reply_options: [],
  });

  revalidatePath(`/${params.locale}/intern`);
  return { success: true };
}

export async function registerKnowledgeSuggestionAction(params: {
  locale: string;
  ticketId: string;
  suggestionId: string;
  summary: string;
  relatedAgent?: string;
}): Promise<ActionResult> {
  const session = await getInternalSession();
  if (!session) {
    return { success: false, error: 'Session abgelaufen. Bitte erneut anmelden.' };
  }

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.from('support_ticket_messages').insert({
    ticket_id: params.ticketId,
    author_type: 'system',
    author_user_id: null,
    author_name: session.email,
    message: params.summary,
    metadata: {
      source: 'internal-portal',
      type: 'knowledge_request',
      suggestion_id: params.suggestionId,
      related_agent: params.relatedAgent,
    },
    internal_only: true,
    quick_reply_options: [],
  });

  if (error) {
    return {
      success: false,
      error: `Wissensanfrage konnte nicht erfasst werden: ${error.message}`,
    };
  }

  revalidatePath(`/${params.locale}/intern`);
  return { success: true };
}

