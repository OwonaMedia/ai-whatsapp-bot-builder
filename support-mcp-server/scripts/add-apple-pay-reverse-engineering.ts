/**
 * Fügt Apple Pay/Checkout Reverse Engineering Dokumentation zu Supabase hinzu
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportContext } from '../src/services/supportContext.js';
import { createLogger } from '../src/utils/logger.js';

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
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value;
            }
          }
        }
      }
      
      if (process.env.SUPABASE_SERVICE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) {
        if (!process.env.SUPABASE_SERVICE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          process.env.SUPABASE_SERVICE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        }
        if (process.env.SUPABASE_SERVICE_URL) {
          return;
        }
      }
    } catch (error) {
      // Ignoriere Fehler
    }
  }

  if (!process.env.SUPABASE_SERVICE_URL) {
    console.error('❌ Keine Umgebungsvariablen gefunden!');
    process.exit(1);
  }
}

loadEnv();

const APPLE_PAY_REVERSE_ENGINEERING = `# Payment & Checkout System - Reverse Engineering

## Übersicht

Das WhatsApp Bot Builder System verwendet Stripe für Zahlungsabwicklung mit Unterstützung für:
- Kreditkarten (Visa, Mastercard, etc.)
- Apple Pay
- Google Pay
- PayPal (über separate Route)
- Mobile Money (für Afrika)

## Frontend-Konfigurationen

### Checkout-Seite
**Datei:** \`app/[locale]/checkout/page.tsx\`
- Route: \`/[locale]/checkout\`
- Funktion: Zeigt Checkout-Formular mit Payment-Methoden
- Abhängigkeiten:
  - \`@/components/payments/CheckoutForm\`
  - \`@/lib/supabase-server\`
  - \`@/lib/subscriptions\`

### CheckoutForm Komponente
**Datei:** \`components/payments/CheckoutForm.tsx\`
- Client Component (\`'use client'\`)
- Verwendet Stripe Elements für Payment Processing
- Unterstützt:
  - Apple Pay (via \`PaymentRequestButtonElement\`)
  - Google Pay (via \`PaymentRequestButtonElement\`)
  - Kreditkarten (via \`CardElement\`)
  - PayPal (Redirect)
  - Mobile Money (Polling)

**Wichtige Konfigurationen:**
- Stripe Publishable Key: \`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\`
- Payment Request für Apple Pay/Google Pay
- Error Handling für verschiedene Stripe-Fehler
- Redirect nach erfolgreicher Zahlung

**Potenzielle Probleme:**
- Apple Pay Button funktioniert nicht
- Payment Request nicht verfügbar
- Stripe Client Secret fehlt
- Payment Intent Status-Probleme
- Redirect nach Payment funktioniert nicht
- \`canMakePayment()\` gibt \`false\` zurück
- Payment Request nicht initialisiert
- \`paymentmethod\` Event nicht gefeuert
- \`confirmCardPayment()\` fehlgeschlagen
- Authentifizierung erforderlich (\`requires_action\`)

### PaymentMethodSelector
**Datei:** \`components/payments/PaymentMethodSelector.tsx\`
- Zeigt verfügbare Payment-Methoden
- Filtert Methoden basierend auf Verfügbarkeit

### PaymentStatus
**Datei:** \`components/payments/PaymentStatus.tsx\`
- Zeigt Payment-Status (pending, success, error)

## API-Endpoints

### Payment Creation
**Route:** \`app/api/payments/create/route.ts\`
- Erstellt Payment Intent für Stripe
- Validiert User-Authentifizierung
- Setzt Payment Method

**Potenzielle Probleme:**
- Payment Intent Creation fehlgeschlagen
- Authentifizierung fehlt
- Invalid Amount
- Stripe API Error

### Payment Webhooks
**Route:** \`app/api/payments/webhook/route.ts\`
- Verarbeitet Stripe Webhooks
- Aktualisiert Subscription-Status
- Verifiziert Webhook-Signature

**Potenzielle Probleme:**
- Webhook-Signature-Verifizierung fehlgeschlagen
- Webhook-Event nicht verarbeitet
- Subscription-Update fehlgeschlagen

## Environment Variables

### Stripe
- \`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\` - Stripe Publishable Key (Frontend)
- \`STRIPE_SECRET_KEY\` - Stripe Secret Key (Backend)
- \`STRIPE_WEBHOOK_SECRET\` - Webhook Secret für Signature-Verifizierung

**Potenzielle Probleme:**
- Stripe Keys fehlen oder sind falsch
- Webhook Secret fehlt
- Keys haben falsches Format

## Apple Pay Spezifische Konfiguration

### Implementation Details
- Verwendet Stripe \`paymentRequest()\` API
- Prüft Verfügbarkeit via \`canMakePayment()\`
- Verwendet \`PaymentRequestButtonElement\` von \`@stripe/react-stripe-js\`
- Länder: DE (Deutschland) standardmäßig
- Währung: EUR standardmäßig

**Potenzielle Probleme:**
- \`canMakePayment()\` gibt \`false\` zurück
- Payment Request nicht initialisiert
- \`paymentmethod\` Event nicht gefeuert
- \`confirmCardPayment()\` fehlgeschlagen
- Authentifizierung erforderlich (\`requires_action\`)

### Häufige Fehler
- "Apple Pay konnte nicht verarbeitet werden"
- "Authentifizierung für Apple Pay erforderlich"
- "Apple Pay konnte nicht abgeschlossen werden"
- Payment Request Button wird nicht angezeigt
- Button funktioniert nicht
- Apple Pay Button fehlt

## Checkout Flow

1. User wählt Payment-Methode (Apple Pay, Google Pay, Karte)
2. Für Apple Pay/Google Pay:
   - Payment Request wird erstellt
   - \`canMakePayment()\` prüft Verfügbarkeit
   - Button wird angezeigt wenn verfügbar
   - User klickt Button → \`paymentmethod\` Event
   - \`confirmCardPayment()\` wird aufgerufen
3. Für Kreditkarte:
   - CardElement wird angezeigt
   - User gibt Daten ein
   - \`handleSubmit()\` erstellt Payment Intent
   - \`confirmCardPayment()\` wird aufgerufen
4. Nach erfolgreicher Zahlung:
   - Redirect zu \`/dashboard?payment=success\`

**Potenzielle Probleme:**
- Payment Request nicht verfügbar (Browser/Device nicht unterstützt)
- Payment Intent Creation fehlgeschlagen
- \`confirmCardPayment()\` fehlgeschlagen
- Redirect funktioniert nicht
- Payment Status wird nicht aktualisiert

## Database Settings

### Tabellen
- \`subscriptions\` - User-Subscriptions
- \`payments\` - Payment-Historie
- \`payment_intents\` - Stripe Payment Intents

**Potenzielle Probleme:**
- RLS-Policies blockieren Zugriff
- Foreign Key Constraints verletzt
- Payment Intent nicht in DB gespeichert

## Deployment Configurations

### Stripe Webhook
- Endpoint: \`https://whatsapp.owona.de/api/payments/webhook\`
- Events: \`payment_intent.succeeded\`, \`payment_intent.payment_failed\`, etc.

**Potenzielle Probleme:**
- Webhook nicht konfiguriert
- Webhook-Endpoint nicht erreichbar
- Events nicht verarbeitet
`;

async function main() {
  const logger = createLogger();
  console.log('📝 FÜGE APPLE PAY REVERSE ENGINEERING ZU SUPABASE HINZU\n');

  try {
    const context = await createSupportContext(logger);

    // Versuche verschiedene mögliche Tabellennamen
    const possibleTables = [
      'support_reverse_engineering', // NEU: Primäre Tabelle
      'support_knowledge',
      'reverse_engineering_docs',
      'knowledge_documents',
    ];

    let inserted = false;
    for (const tableName of possibleTables) {
      try {
        // Prüfe ob Tabelle existiert
        const { error: checkError } = await context.supabase
          .from(tableName)
          .select('id')
          .limit(1);

        if (!checkError) {
          console.log(`✅ Tabelle gefunden: ${tableName}`);

          // Prüfe ob Dokument bereits existiert
          const { data: existing } = await context.supabase
            .from(tableName)
            .select('*')
            .ilike('title', '%Apple Pay%')
            .limit(1);

          if (existing && existing.length > 0) {
            console.log(`⚠️  Apple Pay Dokument existiert bereits in ${tableName}`);
            console.log(`   ID: ${existing[0].id}`);
            console.log(`   Titel: ${existing[0].title}`);
            
            // Update vorhandenes Dokument
            const { error: updateError } = await context.supabase
              .from(tableName)
              .update({
                content: APPLE_PAY_REVERSE_ENGINEERING,
                title: 'Payment & Checkout System - Reverse Engineering',
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing[0].id);

            if (updateError) {
              console.error(`❌ Fehler beim Update: ${updateError.message}`);
            } else {
              console.log(`✅ Dokument aktualisiert`);
              inserted = true;
            }
          } else {
            // Erstelle neues Dokument
            // Für support_reverse_engineering: Standard-Spalten
            if (tableName === 'support_reverse_engineering') {
              const { error: insertError } = await context.supabase
                .from(tableName)
                .insert({
                  title: 'Payment & Checkout System - Reverse Engineering',
                  content: APPLE_PAY_REVERSE_ENGINEERING,
                  category: 'payment',
                  project: 'whatsapp-bot-builder',
                  tags: ['apple-pay', 'checkout', 'payment', 'stripe', 'frontend'],
                  created_by: 'system',
                  metadata: {
                    source: 'cursor_ai',
                    version: '1.0',
                    created_at: new Date().toISOString(),
                  },
                });

              if (!insertError) {
                console.log(`✅ Dokument erfolgreich in ${tableName} eingefügt`);
                inserted = true;
              } else {
                console.error(`❌ Fehler beim Insert: ${insertError.message}`);
              }
            } else {
              // Fallback für andere Tabellen
              const insertData: any = {
                title: 'Payment & Checkout System - Reverse Engineering',
                content: APPLE_PAY_REVERSE_ENGINEERING,
                category: 'reverse_engineering',
                project: 'whatsapp-bot-builder',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              // Versuche verschiedene mögliche Spaltennamen
              const columnVariations = [
                { content: 'content', title: 'title' },
                { content: 'text', title: 'name' },
                { content: 'document', title: 'title' },
                { content: 'body', title: 'title' },
              ];

              for (const cols of columnVariations) {
                try {
                  const { error: insertError } = await context.supabase
                    .from(tableName)
                    .insert({
                      [cols.title]: insertData.title,
                      [cols.content]: insertData.content,
                      ...insertData,
                    });

                  if (!insertError) {
                    console.log(`✅ Dokument erfolgreich in ${tableName} eingefügt`);
                    inserted = true;
                    break;
                  }
                } catch (err) {
                  // Versuche nächste Variation
                }
              }
            }
          }

          if (inserted) {
            break;
          }
        }
      } catch (error) {
        // Tabelle existiert nicht, versuche nächste
        continue;
      }
    }

    if (!inserted) {
      console.error('❌ Konnte Dokument nicht in Supabase einfügen');
      console.error('   Mögliche Ursachen:');
      console.error('   - Keine passende Tabelle gefunden');
      console.error('   - Tabelle hat andere Spaltennamen');
      console.error('   - RLS-Policies blockieren Insert');
      console.error('\n   Bitte prüfe:');
      console.error('   1. Welche Tabelle die Reverse Engineering Dokumentation speichert');
      console.error('   2. Welche Spalten die Tabelle hat');
      console.error('   3. Ob RLS-Policies korrekt konfiguriert sind');
      process.exit(1);
    }

    console.log('\n✅ APPLE PAY REVERSE ENGINEERING ERFOLGREICH HINZUGEFÜGT');
    console.log('   Das System sollte jetzt Apple Pay/Checkout-Probleme besser erkennen können.');
    process.exit(0);
  } catch (error) {
    console.error('❌ FEHLER:', error);
    process.exit(1);
  }
}

main();

