import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, createServiceRoleClient } from '@/lib/supabase';
import { apiError, apiSuccess, handleApiError, methodNotAllowed, validateMethod } from '@/lib/api-utils';

/**
 * GET /api/support-tickets
 * 
 * Ruft alle Support-Tickets des authentifizierten Benutzers ab.
 * Unterstützt Filterung nach Status, Kategorie und Pagination.
 * 
 * Query-Parameter:
 * - status: Filter nach Status (new, investigating, resolved, closed)
 * - category: Filter nach Kategorie (bug, billing, integration, ux, other)
 * - limit: Anzahl der Ergebnisse (Standard: 50, Max: 100)
 * - offset: Pagination-Offset (Standard: 0)
 * 
 * Response:
 * - 200: { tickets: [...], total: number, limit: number, offset: number }
 * - 401: Nicht authentifiziert
 * - 500: Server-Fehler
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // Authentifizierung prüfen
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      return apiError('unauthorized', 401);
    }

    const userId = authData.user.id;

    // Query-Parameter auslesen
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Query bauen
    let query = supabase
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Filter anwenden
    if (status) {
      const validStatuses = ['new', 'investigating', 'resolved', 'closed'];
      if (validStatuses.includes(status)) {
        query = query.eq('status', status);
      }
    }

    if (category) {
      const validCategories = ['bug', 'billing', 'integration', 'ux', 'other'];
      if (validCategories.includes(category)) {
        query = query.eq('category', category);
      }
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    // Query ausführen
    const { data, error, count } = await query;

    if (error) {
      return apiError(error.message || 'database_error', 400);
    }

    return apiSuccess({
      tickets: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    return handleApiError(error, 'SupportTickets API GET');
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const serviceClient = createServiceRoleClient();

    const body = await request.json();
    const { category, title, description, sourceMetadata, locale } = body ?? {};

    if (!title || !description) {
      return apiError('missing_fields', 422);
    }

    const normalisedCategory =
      ['bug', 'billing', 'integration', 'ux', 'other'].includes(category) ? category : 'other';

    const { data: authData } = await supabase.auth.getUser();
    const requesterEmail = authData?.user?.email ?? 'Kunde';

    const { data, error } = await supabase.rpc('create_support_ticket', {
      _category: normalisedCategory,
      _title: title,
      _description: description,
      _source_metadata: sourceMetadata ?? {},
      _attachments: [],
    });

    if (error) {
      return apiError(error.message || 'database_error', 400);
    }

    const ticketId = Array.isArray(data) ? data[0]?.id : data?.id;

    if (ticketId) {
      const acknowledgement = createAcknowledgementMessage({
        requesterEmail,
        category: normalisedCategory,
        locale: locale ?? 'de-DE',
      });

      try {
        await serviceClient
          .from('support_ticket_messages')
          .insert({
            ticket_id: ticketId,
            author_type: 'support',
            author_user_id: null,
            author_name: 'Tier-1 Automation',
            message: acknowledgement.message,
            metadata: acknowledgement.metadata,
          });

        await serviceClient
          .from('support_tickets')
          .update({
            status: 'investigating',
            priority: acknowledgement.priority,
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticketId);
      } catch (automationError) {
        console.warn('[SupportTickets API] Failed to enqueue acknowledgement', automationError);
      }
    }

    return apiSuccess({ ticket: data });
  } catch (error) {
    return handleApiError(error, 'SupportTickets API POST');
  }
}

type AcknowledgementOptions = {
  requesterEmail: string;
  category: string;
  locale: string;
};

function createAcknowledgementMessage({ requesterEmail, category, locale }: AcknowledgementOptions) {
  const categoryHints: Record<string, { priority: 'low' | 'normal' | 'high' | 'urgent'; hint: string }> = {
    bug: {
      priority: 'high',
      hint: 'Ich habe die Technik bereits informiert und leite das Ticket direkt an Tier 2 weiter.',
    },
    integration: {
      priority: 'high',
      hint: 'Wir prüfen sofort deine Integrationsdaten und kümmern uns um eine stabile Verbindung.',
    },
    billing: {
      priority: 'normal',
      hint: 'Unser Billing-Team checkt Abrechnung und Zahlungen – wir melden uns gleich mit Details.',
    },
    ux: {
      priority: 'normal',
      hint: 'Ich dokumentiere dein Feedback und synchronisiere es mit unserem Produktteam.',
    },
    other: {
      priority: 'normal',
      hint: 'Ich habe alle Infos notiert und verbinde dich mit dem passenden Experten.',
    },
  };

  const fallback = categoryHints.other;
  // TypeScript type guard - details ist immer definiert wegen fallback
  const safeDetails = (categoryHints[category] ?? fallback) as { priority: 'low' | 'normal' | 'high' | 'urgent'; hint: string };

  return {
    priority: safeDetails.priority,
    message: [
      `Hallo ${requesterEmail}! 👋`,
      'Danke für dein Ticket – ich habe alles übernommen und halte dich auf dem Laufenden.',
      safeDetails.hint,
      'Sobald wir ein Update haben, bekommst du automatisch eine Statusmeldung.',
      'Wenn du weitere Infos hast, kannst du direkt hier antworten – nach deiner ersten Rückmeldung eskaliere ich automatisch an Tier 2.',
    ].join('\n\n'),
    metadata: {
      kind: 'auto_acknowledgement',
      tier: 'tier1',
      category,
      locale,
    },
  };
}


