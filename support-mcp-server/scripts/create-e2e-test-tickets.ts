#!/usr/bin/env tsx
/**
 * Erstellt repräsentative Test-Tickets für E2E-Tests
 * 
 * Erstellt nur die wichtigsten Ticket-Typen für realistische Tests:
 * - PDF-Upload-Problem
 * - PM2-Restart-Problem
 * - Missing Env-Variable
 * - API-Endpoint fehlt
 * - Database RLS-Policy fehlt
 * - Frontend-Config-Problem
 * 
 * Insgesamt: 6-10 Tickets (nicht 197!)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportSupabase } from '../src/services/supabaseClient.js';
import { loadConfig } from '../src/services/config.js';

// Lade .env manuell
function loadEnv() {
  const envPaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '..', 'frontend', '.env.local'),
    resolve(process.cwd(), '..', '.env.local'),
  ];

  for (const envPath of envPaths) {
    try {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            // Überspringe PLACEHOLDER_VALUE - das ist kein echter Wert
            if (value === 'PLACEHOLDER_VALUE' || value.includes('PLACEHOLDER')) {
              continue;
            }
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value;
            }
          }
        }
      }
      
      if (process.env.SUPABASE_SERVICE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) {
        if (!process.env.SUPABASE_SERVICE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          // Entferne trailing slash für URL-Validierung
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, '');
          process.env.SUPABASE_SERVICE_URL = url;
        }
        // Stelle sicher, dass die URL korrekt formatiert ist (ohne trailing slash)
        if (process.env.SUPABASE_SERVICE_URL) {
          process.env.SUPABASE_SERVICE_URL = process.env.SUPABASE_SERVICE_URL.trim().replace(/\/$/, '');
          // Prüfe ob auch SERVICE_ROLE_KEY vorhanden ist
          if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return;
          }
        }
      }
    } catch (error) {
      // Ignoriere Fehler
    }
  }

  if (!process.env.SUPABASE_SERVICE_URL) {
    console.error('❌ Keine Umgebungsvariablen gefunden!');
    console.error('Bitte stelle sicher, dass SUPABASE_SERVICE_URL und SUPABASE_SERVICE_ROLE_KEY gesetzt sind.');
    process.exit(1);
  }
}

loadEnv();

interface TestTicket {
  title: string;
  description: string;
  status: 'new' | 'investigating';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

const TEST_TICKETS: TestTicket[] = [
  {
    title: 'PDF-Upload funktioniert nicht',
    description: 'Beim Hochladen einer PDF-Datei kommt die Fehlermeldung "Worker-Modul nicht gefunden". Die Datei wird nicht verarbeitet.',
    status: 'new',
    priority: 'high',
    category: 'technical',
  },
  {
    title: 'WhatsApp Bot reagiert nicht mehr',
    description: 'Der WhatsApp Bot antwortet nicht mehr auf Nachrichten. PM2 zeigt den Status als "online", aber es kommen keine Antworten.',
    status: 'new',
    priority: 'high',
    category: 'technical',
  },
  {
    title: 'Stripe Payment schlägt fehl',
    description: 'Bei der Zahlung mit Stripe kommt der Fehler "STRIPE_SECRET_KEY is not set". Die Zahlung kann nicht abgeschlossen werden.',
    status: 'new',
    priority: 'high',
    category: 'payment',
  },
  {
    title: 'API-Endpoint /api/payments/checkout fehlt',
    description: 'Beim Aufruf von /api/payments/checkout kommt ein 404-Fehler. Die Route existiert nicht.',
    status: 'new',
    priority: 'high',
    category: 'technical',
  },
  {
    title: 'Zugriff auf knowledge_sources verweigert',
    description: 'Beim Abruf der Knowledge Sources kommt der Fehler "Row Level Security Policy fehlt". Keine Daten können abgerufen werden.',
    status: 'new',
    priority: 'high',
    category: 'database',
  },
  {
    title: 'Checkout-Komponente fehlt',
    description: 'Die Checkout-Komponente wird nicht angezeigt. Es kommt der Fehler "Component CheckoutForm not found".',
    status: 'new',
    priority: 'high',
    category: 'frontend',
  },
  {
    title: 'i18n-Übersetzung fehlt',
    description: 'Die Übersetzung für "checkout.button" fehlt in der deutschen Locale-Datei. Der Button zeigt nur den Key an.',
    status: 'new',
    priority: 'low',
    category: 'frontend',
  },
  {
    title: 'Docker Container hängt',
    description: 'Der n8n Docker Container reagiert nicht mehr. Docker ps zeigt den Container als "running", aber der Service antwortet nicht.',
    status: 'new',
    priority: 'high',
    category: 'deployment',
  },
];

async function createTestTickets() {
  console.log('🚀 Erstelle E2E-Test-Tickets...\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);

  // Erstelle oder hole Test-User in auth.users
  let testUserId: string | null = null;
  
  // Prüfe ob User bereits in auth.users existiert
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const existingAuthUser = authUsers?.users?.find(u => u.email === 'test-e2e@owona.de');
  
  if (existingAuthUser) {
    testUserId = existingAuthUser.id;
    console.log('✅ Test-User bereits vorhanden (auth.users):', testUserId);
    console.log('   🔒 Stelle sicher, dass User bestätigt ist, um E-Mail-Versand zu vermeiden...');
    
    // Stelle sicher, dass User bestätigt ist (falls nicht bereits geschehen)
    if (!existingAuthUser.email_confirmed_at) {
      console.log('   🔧 Bestätige User, um E-Mail-Versand zu vermeiden...');
      const { error: confirmError } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
        email_confirm: true, // WICHTIG: Verhindert E-Mail-Versand
      });
      if (confirmError) {
        console.error('   ❌ Fehler beim Bestätigen des Users:', confirmError);
      } else {
        console.log('   ✅ User bestätigt - KEINE E-Mail wird gesendet');
      }
    } else {
      console.log('   ✅ User ist bereits bestätigt - KEINE E-Mail wird gesendet');
    }
    
    // Zusätzliche Absicherung: Setze user_metadata um E-Mail-Versand zu verhindern
    if (!existingAuthUser.user_metadata?.test_user || !existingAuthUser.user_metadata?.skip_email_notification) {
      console.log('   🔧 Setze user_metadata, um E-Mail-Versand zu verhindern...');
      const { error: metadataError } = await supabase.auth.admin.updateUserById(existingAuthUser.id, {
        user_metadata: {
          ...existingAuthUser.user_metadata,
          skip_email_notification: true,
          test_user: true,
        },
      });
      if (metadataError) {
        console.warn('   ⚠️  Warnung beim Setzen von user_metadata:', metadataError);
      } else {
        console.log('   ✅ user_metadata gesetzt - zusätzliche Absicherung aktiv');
      }
    }
  } else {
    // Erstelle User in auth.users
    // WICHTIG: email_confirm: true verhindert E-Mail-Bestätigung
    // Supabase sendet KEINE E-Mails wenn email_confirm: true gesetzt ist
    // Zusätzlich: user_metadata kann helfen, aber email_confirm ist der Hauptmechanismus
    console.log('   🔒 Erstelle Test-User mit email_confirm: true (KEINE E-Mail wird gesendet)...');
    const { data: newAuthUser, error: authUserError } = await supabase.auth.admin.createUser({
      email: 'test-e2e@owona.de',
      password: 'test-e2e-password-123!',
      email_confirm: true, // KRITISCH: Verhindert E-Mail-Versand
      user_metadata: {
        skip_email_notification: true, // Zusätzliche Absicherung (falls unterstützt)
        test_user: true, // Markiere als Test-User
      },
    });

    if (authUserError) {
      console.error('❌ Fehler beim Erstellen des Test-Users (auth.users):', authUserError);
      // Fallback: Verwende einen existierenden User oder erstelle einen Dummy
      if (authUsers?.users && authUsers.users.length > 0) {
        testUserId = authUsers.users[0].id;
        console.log('⚠️  Verwende existierenden User als Fallback:', testUserId);
      } else {
        console.error('❌ Kein User verfügbar und kann keinen erstellen');
        process.exit(1);
      }
    } else {
      testUserId = newAuthUser.user.id;
      console.log('✅ Test-User erstellt (auth.users):', testUserId);
      console.log('   ✅ User mit email_confirm: true erstellt - KEINE E-Mail wird gesendet');
      
      // Verifiziere, dass User sofort bestätigt ist
      if (newAuthUser.user.email_confirmed_at) {
        const confirmationDelay = new Date(newAuthUser.user.email_confirmed_at).getTime() - new Date(newAuthUser.user.created_at).getTime();
        console.log(`   ✅ User ist sofort bestätigt (${confirmationDelay}ms nach Erstellung)`);
        console.log('   ✅ KEINE E-Mail-Bestätigung erforderlich - KEINE E-Mail wurde gesendet');
      } else {
        console.log('   ⚠️  WARNUNG: User ist nicht bestätigt - möglicherweise wurde eine E-Mail gesendet');
        console.log('   🔧 Versuche User manuell zu bestätigen...');
        const { error: confirmError } = await supabase.auth.admin.updateUserById(testUserId, {
          email_confirm: true,
        });
        if (confirmError) {
          console.error('   ❌ Fehler beim Bestätigen:', confirmError);
        } else {
          console.log('   ✅ User nachträglich bestätigt - keine weitere E-Mail wird gesendet');
        }
      }
    }
  }

  // Agent-ID ist optional - verwende null wenn nicht vorhanden
  const testAgentId: string | null = null;

  // Erstelle Test-Tickets
  const createdTickets: string[] = [];
  const skippedTickets: string[] = [];

  for (const ticket of TEST_TICKETS) {
    // Prüfe ob Ticket bereits existiert (basierend auf Titel)
    const { data: existingTicket } = await supabase
      .from('support_tickets')
      .select('id, title')
      .eq('title', ticket.title)
      .eq('user_id', testUserId)
      .maybeSingle();

    if (existingTicket) {
      skippedTickets.push(existingTicket.id);
      console.log(`⏭️  Ticket bereits vorhanden: "${ticket.title}" (${existingTicket.id})`);
      continue;
    }

    const ticketData: any = {
      user_id: testUserId,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
    };

    // Füge agent_id nur hinzu, wenn vorhanden
    if (testAgentId) {
      ticketData.agent_id = testAgentId;
    }

    const { data: newTicket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert(ticketData)
      .select()
      .single();

    if (ticketError) {
      console.error(`❌ Fehler beim Erstellen des Tickets "${ticket.title}":`, ticketError);
      continue;
    }

    createdTickets.push(newTicket.id);
    console.log(`✅ Ticket erstellt: "${ticket.title}" (${newTicket.id})`);
  }

  console.log('\n📊 Zusammenfassung:');
  console.log(`  - Erstellt: ${createdTickets.length} Tickets`);
  console.log(`  - Übersprungen: ${skippedTickets.length} Tickets`);
  console.log(`  - Gesamt: ${TEST_TICKETS.length} Tickets`);

  if (createdTickets.length > 0) {
    console.log('\n✅ E2E-Test-Tickets erfolgreich erstellt!');
    console.log('\n📝 Ticket-IDs:');
    createdTickets.forEach((id, index) => {
      console.log(`  ${index + 1}. ${id}`);
    });
  } else {
    console.log('\n✅ Alle Test-Tickets bereits vorhanden!');
  }

  return { createdTickets, skippedTickets };
}

// Führe Script aus
createTestTickets()
  .then(() => {
    console.log('\n🎉 Fertig!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });

