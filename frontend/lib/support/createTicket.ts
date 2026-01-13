/**
 * Utility-Funktion zum programmatischen Erstellen von Support-Tickets
 * 
 * Diese Funktion nutzt das BESTEHENDE Ticket-System unter /intern
 * und kann von Cursor AI verwendet werden, um Probleme automatisch
 * als Tickets zu dokumentieren und zu lösen.
 * 
 * Das Ticket wird im bestehenden System erstellt und ist im internen
 * Portal unter /intern sichtbar.
 * 
 * @example
 * ```typescript
 * await createSupportTicket({
 *   category: 'bug',
 *   title: 'WhatsApp-Link Button vertauscht',
 *   description: 'Die Buttons öffnen falsche URLs...',
 *   sourceMetadata: { source: 'cursor_ai', component: 'EmbedCodeGenerator.tsx' }
 * });
 * ```
 */

import { getServiceSupabaseClient } from '../supabase-service';

export interface CreateTicketOptions {
  category: 'bug' | 'billing' | 'integration' | 'ux' | 'other';
  title: string;
  description: string;
  sourceMetadata?: Record<string, unknown>;
  userId?: string; // Optional: Falls ein spezifischer User betroffen ist
  locale?: string;
}

export interface CreateTicketResult {
  success: boolean;
  ticketId?: string;
  error?: string;
}

/**
 * Erstellt ein Support-Ticket direkt in der Datenbank
 * 
 * Diese Funktion verwendet den Service Role Client, um Tickets
 * ohne Benutzer-Authentifizierung zu erstellen. Ideal für
 * automatische Ticket-Erstellung durch Cursor AI.
 * 
 * Da die RPC-Funktion `create_support_ticket` `auth.uid()` verwendet,
 * fügen wir das Ticket direkt in die Tabellen ein.
 */
export async function createSupportTicket(
  options: CreateTicketOptions
): Promise<CreateTicketResult> {
  try {
    const supabase = getServiceSupabaseClient();
    
    const { category, title, description, sourceMetadata = {}, userId, locale = 'de' } = options;

    // Normalisiere Kategorie
    const normalisedCategory =
      ['bug', 'billing', 'integration', 'ux', 'other'].includes(category) ? category : 'other';

    // Bestimme Priorität basierend auf Kategorie
    const priority = category === 'bug' || category === 'integration' ? 'high' : 'normal';

    // Ticket direkt in die Datenbank einfügen
    // Hinweis: user_id ist NOT NULL in der Tabelle und hat Foreign Key Constraint
    // Für Cursor AI Tickets ohne User: Versuche einen System-User zu finden
    let finalUserId = userId;
    
    if (!finalUserId) {
      // Versuche einen System-User zu finden (z.B. system@owona.de oder admin@owona.de)
      // Prüfe zuerst system@owona.de
      const { data: systemUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', 'system@owona.de')
        .limit(1)
        .maybeSingle();
      
      if (systemUser?.id) {
        finalUserId = systemUser.id;
      } else {
        // Prüfe admin@owona.de
        const { data: adminUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', 'admin@owona.de')
          .limit(1)
          .maybeSingle();
        
        if (adminUser?.id) {
          finalUserId = adminUser.id;
        } else {
          // Fallback: Verwende den ersten User (falls vorhanden)
          const { data: firstUser } = await supabase
            .from('profiles')
            .select('id')
            .limit(1)
            .maybeSingle();
          
          if (firstUser?.id) {
            finalUserId = firstUser.id;
          } else {
            return {
              success: false,
              error: 'no_user_available',
            };
          }
        }
      }
    }
    
    // Verwende die gleiche Logik wie die bestehende API-Route
    // für konsistente Ticket-Erstellung
    
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: finalUserId,
        category: normalisedCategory,
        title,
        description,
        priority,
        status: 'new',
        source_metadata: {
          ...sourceMetadata,
          source: sourceMetadata.source || 'cursor_ai',
          created_via: 'programmatic',
          timestamp: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      console.error('[createSupportTicket] Insert Error:', ticketError);
      return {
        success: false,
        error: ticketError?.message || 'database_error',
      };
    }

    const ticketId = ticket.id;

    // Erste Nachricht als Customer-Nachricht hinzufügen
    const { error: messageError } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticketId,
        author_type: 'customer',
        author_user_id: userId || null,
        message: description,
        metadata: {
          attachments: [],
          source: 'cursor_ai',
        },
      });

    if (messageError) {
      console.warn('[createSupportTicket] Failed to insert initial message', messageError);
      // Ticket wurde erstellt, aber Nachricht fehlgeschlagen - nicht kritisch
    }

    // Auto-Acknowledgement über Service Client hinzufügen
    // Verwende die gleiche Logik wie die bestehende API-Route
    const acknowledgement = createAcknowledgementMessage({
      requesterEmail: userId ? `User ${userId}` : 'System (Cursor AI)',
      category: normalisedCategory,
      locale: locale,
    });

    try {
      await supabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          author_type: 'support',
          author_user_id: null,
          author_name: 'Tier-1 Automation',
          message: acknowledgement.message,
          metadata: acknowledgement.metadata,
        });

      await supabase
        .from('support_tickets')
        .update({
          status: 'investigating',
          priority: acknowledgement.priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);
    } catch (automationError) {
      console.warn('[createSupportTicket] Failed to add acknowledgement', automationError);
      // Ticket wurde erstellt, aber Acknowledgement fehlgeschlagen - nicht kritisch
    }

    return {
      success: true,
      ticketId,
    };
  } catch (error) {
    console.error('[createSupportTicket] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'unknown_error',
    };
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
      hint: 'Ich habe die Technik bereits informiert und leite das Ticket direkt an Tier 2 weiter.',
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
  const safeDetails = (categoryHints[category] ?? fallback) as { priority: 'low' | 'normal' | 'high' | 'urgent'; hint: string };

  return {
    priority: safeDetails.priority,
    message: [
      `Hallo ${requesterEmail}! 👋`,
      'Danke für dein Ticket – ich habe alles übernommen und halte dich auf dem Laufenden.',
      safeDetails.hint,
      'Sobald wir ein Update haben, bekommst du automatisch eine Statusmeldung.',
      'Wenn du weitere Infos hast, kannst du direkt hier antworten – nach deiner ersten Rückmeldung eskaliere ich automatisch an Tier 2.',
    ].join('\n\n'),
    metadata: {
      kind: 'auto_acknowledgement',
      tier: 'tier1',
      category,
      locale,
    },
  };
}

