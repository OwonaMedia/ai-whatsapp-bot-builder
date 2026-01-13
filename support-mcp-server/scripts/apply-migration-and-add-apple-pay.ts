/**
 * Wendet Migration an und fügt Apple Pay Reverse Engineering hinzu
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

const MIGRATION_SQL = `
-- ============================================
-- REVERSE ENGINEERING DOCUMENTATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.support_reverse_engineering (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('frontend_config', 'api_endpoint', 'env_var', 'database_setting', 'deployment_config', 'payment', 'checkout', 'general')),
  project text NOT NULL DEFAULT 'whatsapp-bot-builder',
  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_support_reverse_engineering_category ON public.support_reverse_engineering(category);
CREATE INDEX IF NOT EXISTS idx_support_reverse_engineering_project ON public.support_reverse_engineering(project);
CREATE INDEX IF NOT EXISTS idx_support_reverse_engineering_tags ON public.support_reverse_engineering USING GIN(tags);

CREATE OR REPLACE FUNCTION public.update_support_reverse_engineering_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_support_reverse_engineering_updated_at ON public.support_reverse_engineering;
CREATE TRIGGER trigger_update_support_reverse_engineering_updated_at
  BEFORE UPDATE ON public.support_reverse_engineering
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_reverse_engineering_updated_at();

ALTER TABLE public.support_reverse_engineering ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage all reverse engineering docs" ON public.support_reverse_engineering;
CREATE POLICY "Service role can manage all reverse engineering docs"
  ON public.support_reverse_engineering
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read reverse engineering docs" ON public.support_reverse_engineering;
CREATE POLICY "Authenticated users can read reverse engineering docs"
  ON public.support_reverse_engineering
  FOR SELECT
  USING (auth.role() = 'authenticated' OR (auth.jwt() ->> 'role') = 'service_role');

GRANT SELECT ON public.support_reverse_engineering TO authenticated;
GRANT ALL ON public.support_reverse_engineering TO service_role;
`;

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
- Button funktioniert nicht
- Apple Pay Button fehlt

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
  console.log('📝 WENDE MIGRATION AN UND FÜGE APPLE PAY REVERSE ENGINEERING HINZU\n');

  try {
    const context = await createSupportContext(logger);

    // 1. Prüfe ob Tabelle existiert (Migration wird separat angewendet)
    console.log('1️⃣  Prüfe ob Tabelle existiert...\n');
    console.log('   ⚠️  Migration muss manuell angewendet werden:');
    console.log('   - Über Supabase Dashboard');
    console.log('   - Oder via: npx supabase db push');
    console.log('   - Migration-Datei: supabase/migrations/20251126173834_support_reverse_engineering_docs.sql\n');

    // 2. Prüfe ob Tabelle existiert
    console.log('2️⃣  Prüfe ob Tabelle existiert...\n');
    const { data: checkData, error: checkError } = await context.supabase
      .from('support_reverse_engineering')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error(`   ❌ Tabelle existiert nicht: ${checkError.message}`);
      console.error('   Bitte wende die Migration manuell an:');
      console.error('   - Über Supabase Dashboard');
      console.error('   - Oder via: npx supabase db push');
      process.exit(1);
    }

    console.log('   ✅ Tabelle existiert\n');

    // 3. Prüfe ob Dokument bereits existiert
    console.log('3️⃣  Prüfe ob Apple Pay Dokument existiert...\n');
    const { data: existing } = await context.supabase
      .from('support_reverse_engineering')
      .select('*')
      .ilike('title', '%Apple Pay%')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`   ⚠️  Apple Pay Dokument existiert bereits`);
      console.log(`   ID: ${existing[0].id}`);
      console.log(`   Titel: ${existing[0].title}\n`);
      
      // Update vorhandenes Dokument
      const { error: updateError } = await context.supabase
        .from('support_reverse_engineering')
        .update({
          content: APPLE_PAY_REVERSE_ENGINEERING,
          title: 'Payment & Checkout System - Reverse Engineering',
          category: 'payment',
          tags: ['apple-pay', 'checkout', 'payment', 'stripe', 'frontend'],
          updated_at: new Date().toISOString(),
          metadata: {
            source: 'cursor_ai',
            version: '1.1',
            updated_at: new Date().toISOString(),
          },
        })
        .eq('id', existing[0].id);

      if (updateError) {
        console.error(`   ❌ Fehler beim Update: ${updateError.message}`);
        process.exit(1);
      } else {
        console.log(`   ✅ Dokument aktualisiert\n`);
      }
    } else {
      // Erstelle neues Dokument
      console.log('   Erstelle neues Dokument...\n');
      const { error: insertError } = await context.supabase
        .from('support_reverse_engineering')
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

      if (insertError) {
        console.error(`   ❌ Fehler beim Insert: ${insertError.message}`);
        process.exit(1);
      } else {
        console.log(`   ✅ Dokument erfolgreich eingefügt\n`);
      }
    }

    console.log('✅ APPLE PAY REVERSE ENGINEERING ERFOLGREICH HINZUGEFÜGT');
    console.log('   Das System sollte jetzt Apple Pay/Checkout-Probleme besser erkennen können.');
    process.exit(0);
  } catch (error) {
    console.error('❌ FEHLER:', error);
    process.exit(1);
  }
}

main();

