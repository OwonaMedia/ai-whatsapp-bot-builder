# 🚀 WhatsApp Bot Builder SaaS - Fertigstellungs-Roadmap

**Domain:** whatsapp.owona.de  
**Server:** Hetzner 91.99.232.126  
**Status:** MVP läuft, Fertigstellung erforderlich  
**Datum:** 10. Januar 2026  
**Zielgruppe:** Internationale Kundschaft (DACH, Afrika, Global)

---

## 📊 Executive Summary

Der WhatsApp Bot Builder ist ein **White-Label SaaS für DSGVO-konforme, AI-gestützte WhatsApp Business Bots ohne Code**. Das MVP ist technisch funktionsfähig auf whatsapp.owona.de, aber mehrere kritische Features und Fixes sind für den Production-Launch erforderlich.

### Kritische Einschränkungen:
- ⚠️ **Andere Systeme MÜSSEN unberührt bleiben:**
  - salomonowona.com
  - automat.owona.de (n8n)
  - n8n-Workflows und Datenbank
  - Caddy Reverse Proxy für bestehende Services

---

## 🎯 Aktueller Stand (Status Quo)

### ✅ Funktioniert (MVP)

#### 1. Infrastruktur
- ✅ **Hetzner Server:** 91.99.232.126
- ✅ **Domain:** whatsapp.owona.de (DNS bei Goneo)
- ✅ **Reverse Proxy:** Nginx konfiguriert (HTTP Port 80)
- ✅ **Process Manager:** PM2 (`whatsapp-bot-builder`)
- ✅ **Backend:** Supabase PostgreSQL (EU, GDPR-konform)
- ✅ **n8n Integration:** Workflow-System auf automat.owona.de

#### 2. Authentication & User Management
- ✅ Login/Signup (Supabase Auth)
- ✅ Email-Verifizierung
- ✅ Session Management
- ✅ Forgot Password Flow
- ✅ OTP Verification
- ✅ Password Reset
- ✅ Multi-Language (de, en, fr, sw, ha, yo, am, zu)

#### 3. Core Features
- ✅ **Bot Builder:** Visueller Drag & Drop Editor (@xyflow/react)
- ✅ **6 Node-Typen:** Trigger, Message, Question, Condition, AI, End
- ✅ **Knowledge Base:** RAG-basierte Demo (PDF, URL, Text)
- ✅ **Templates:** Template-System implementiert
- ✅ **Dashboard:** User Dashboard mit Bot-Übersicht
- ✅ **Support System:** Support-Tickets (Frontend + API)

#### 4. Frontend (Next.js 15)
- ✅ Responsive Design (Tailwind CSS)
- ✅ Multi-Language (next-intl)
- ✅ SEO-optimiert
- ✅ TypeScript
- ✅ Security Headers (CSP, XSS, CSRF)
- ✅ Error Boundaries

---

## ❌ Kritische Probleme (Production-Blocker)

### 1. ❌ SSL/HTTPS nicht konfiguriert
**Status:** HTTP läuft, HTTPS fehlt  
**Impact:** 🔴 **KRITISCH** - Produktions-Blocker  
**Problem:**
- Nur HTTP (Port 80) funktioniert
- Let's Encrypt SSL-Zertifikat fehlt
- HTTPS-Redirect fehlt

**Lösung:**
```bash
ssh root@91.99.232.126
certbot --nginx -d whatsapp.owona.de
```

**Anforderungen:**
- DNS muss propagiert sein
- Nginx konfiguriert (✅ erledigt)
- Port 443 offen

**Priorität:** 🔴 **P0 - SOFORT**

---

### 2. ❌ SMTP-Konfiguration (Goneo) funktioniert nicht
**Status:** Konfiguriert, aber E-Mails kommen nicht an  
**Impact:** 🔴 **KRITISCH** - Auth-E-Mails blockiert  

**Problem:**
- SMTP (info@owona.de via Goneo) konfiguriert
- E-Mails werden nicht versendet
- Auth-Flows blockiert (Email-Verifizierung, Password-Reset)

**Aktuelle Konfiguration:**
```env
E-Mail: info@owona.de
Passwort: Afidi2008!
SMTP Host: smtp.goneo.de
SMTP Port: 465 (SSL) oder 587 (STARTTLS)
```

**Nächste Schritte:**
1. Supabase SMTP Logs analysieren
2. Port 587 (STARTTLS) testen
3. Goneo-Account verifizieren
4. Fallback: SendGrid/Mailgun einrichten

**Priorität:** 🔴 **P0 - SOFORT**

---

### 3. ❌ WhatsApp Business API Integration fehlt
**Status:** Nicht implementiert  
**Impact:** 🔴 **KRITISCH** - Core-Feature fehlt  

**Problem:**
- WhatsApp Business API Integration fehlt komplett
- Bots können nicht mit WhatsApp verbunden werden
- Keine Webhook-Handler für WhatsApp-Nachrichten

**Anforderungen:**
1. WhatsApp Business API Account (BSP erforderlich)
2. Webhook-Server für eingehende Nachrichten
3. API-Integration für ausgehende Nachrichten
4. Message-Template-Verwaltung
5. Facebook Developer Console Setup

**Referenz:** Siehe `WHATSAPP_BOT_REVERSE_ENGINEERING_DATABASE.md`
- Facebook Webhook Setup dokumentiert
- n8n Workflow `🤖 WhatsApp Afrika MCP Bot (INTELLIGENT)` als Referenz
- Supabase Edge Function `afrika-chat` als Beispiel

**Priorität:** 🔴 **P0 - KRITISCH**

---

### 4. ❌ AI-Integration (GROQ) unvollständig
**Status:** Partiell implementiert  
**Impact:** 🟡 **HOCH** - AI-Features eingeschränkt  

**Problem:**
- GROQ API Key konfigurierbar, aber nicht vollständig integriert
- AI-Nodes im Bot Builder ohne Backend-Implementation
- RAG-Chat funktioniert (Demo), aber nicht in Production-Bots

**Anforderungen:**
1. GROQ API vollständig integrieren
2. AI-Node Backend-Handler implementieren
3. Context-Management für Conversations
4. Rate-Limiting für AI-Anfragen
5. Error-Handling und Fallbacks

**Priorität:** 🟡 **P1 - HOCH**

---

### 5. ❌ Payment-System (Stripe) nicht produktionsreif
**Status:** Skeleton vorhanden, TODOs offen  
**Impact:** 🔴 **KRITISCH** - Keine Monetarisierung  

**Problem (aus docs/ZAHLUNGSSYSTEME_IMPLEMENTIERUNGSSTAND.md):**
- Stripe Webhook-Handler mit TODOs
- Keine Payments-Tabelle in Supabase
- Keine Subscription-Aktivierung
- PayPal, Mobile Money, etc. nicht implementiert

**Offene TODOs:**
- ❌ Payments-Tabelle in Supabase
- ❌ Stripe Webhook-Signatur-Verifizierung
- ❌ Subscription-Aktivierung nach Payment
- ❌ Retry-Mechanismus
- ❌ Polling für Payment-Status
- ❌ Internationale Zahlungsmethoden (PayPal, M-Pesa, etc.)

**Priorität:** 🔴 **P0 - KRITISCH**

---

### 6. ❌ Environment Variables nicht vollständig konfiguriert
**Status:** `.env.local` vorhanden, aber nicht vollständig  
**Impact:** 🟡 **HOCH** - Features eingeschränkt  

**Fehlende/zu verifizieren:**
- Supabase Service Role Key (verschlüsselt?)
- GROQ API Key (produktiv?)
- WhatsApp API Credentials (fehlen)
- Stripe API Keys (Test vs. Production)
- SMTP Credentials (Goneo - zu testen)

**Priorität:** 🟡 **P1 - HOCH**

---

## ⚠️ Mittlere Priorität (Post-MVP)

### 7. ⚠️ Analytics Dashboard fehlt
**Status:** Frontend vorhanden, Backend fehlt  
**Impact:** 🟡 **MITTEL** - Reporting eingeschränkt  

**Anforderungen:**
- Bot-Performance-Metriken
- User-Engagement-Tracking
- Conversation-Analytics
- WhatsApp Message-Statistiken

**Priorität:** 🟡 **P2 - MITTEL**

---

### 8. ⚠️ Template-System unvollständig
**Status:** Frontend vorhanden, wenig Inhalte  
**Impact:** 🟡 **MITTEL** - User-Experience leidet  

**Anforderungen:**
- 10+ Bot-Templates erstellen
- Template-Kategorisierung
- Template-Preview
- One-Click-Installation

**Priorität:** 🟡 **P2 - MITTEL**

---

### 9. ⚠️ Content-Mismatch bei französischer Übersetzung
**Status:** Minor Issue  
**Impact:** 🟢 **NIEDRIG** - Nur Test-Skript betroffen  

**Problem:**
- `/fr/auth/forgot-password` lädt (HTTP 200)
- Test findet erwarteten Text nicht
- Wahrscheinlich französische Übersetzung unvollständig

**Priorität:** 🟢 **P3 - NIEDRIG**

---

## 📋 Fertigstellungs-Roadmap

### Phase 1: Production-Ready (P0 - KRITISCH)
**Ziel:** System produktionsreif machen  
**Zeitrahmen:** 1-2 Wochen  

#### Sprint 1.1: Infrastruktur-Fixes (Tag 1-2)
- [ ] 1.1.1 SSL/HTTPS einrichten (Let's Encrypt)
  - DNS Propagation prüfen
  - Certbot auf Server ausführen
  - HTTPS-Redirect testen
  - SSL-Rating verifizieren (SSL Labs)

- [ ] 1.1.2 SMTP-Konfiguration debuggen
  - Supabase SMTP Logs analysieren
  - Port 587 testen
  - Goneo-Account verifizieren
  - Test-E-Mail versenden
  - Fallback (SendGrid) vorbereiten

#### Sprint 1.2: WhatsApp API Integration (Tag 3-7)
- [ ] 1.2.1 WhatsApp Business API Account einrichten
  - BSP auswählen (Meta Cloud API oder Partner)
  - Business Account verifizieren
  - Phone Number ID erhalten
  - Access Token generieren

- [ ] 1.2.2 Webhook-Handler implementieren
  - Route: `/api/webhooks/whatsapp`
  - GET-Handler (Facebook Verification)
  - POST-Handler (Incoming Messages)
  - Signature-Verifizierung
  - Message-Type-Handling

- [ ] 1.2.3 Outgoing Messages API
  - API Client implementieren
  - Text-Nachrichten senden
  - Media-Nachrichten senden
  - Template-Nachrichten senden
  - Error-Handling

- [ ] 1.2.4 Bot-Execution-Engine
  - Flow-Interpreter implementieren
  - Node-Handler (Trigger, Message, Question, AI, etc.)
  - State-Management für Conversations
  - Supabase Integration (Bot-Config laden)

#### Sprint 1.3: Payment-System (Tag 8-10)
- [ ] 1.3.1 Payments-Tabelle in Supabase
  - Schema erstellen (siehe docs/ZAHLUNGSSYSTEME_*)
  - RLS Policies
  - Migrations anwenden

- [ ] 1.3.2 Stripe Webhook-Handler
  - Signature-Verifizierung implementieren
  - Payment Success Handler
  - Subscription Activation
  - Retry-Mechanismus

- [ ] 1.3.3 Frontend Payment-Flow
  - Stripe Elements integrieren
  - Payment-Status-Polling
  - Success/Error-Handling
  - Redirect-URLs konfigurieren

#### Sprint 1.4: Environment & Deployment (Tag 11-12)
- [ ] 1.4.1 Environment Variables vervollständigen
  - Alle API Keys eintragen
  - Supabase Service Role Key
  - WhatsApp Credentials
  - Stripe Production Keys
  - Secrets in .env.local

- [ ] 1.4.2 Production Build & Deployment
  - Build-Prozess testen
  - PM2 konfigurieren
  - Auto-Restart bei Fehlern
  - Logging einrichten

- [ ] 1.4.3 Monitoring & Health Checks
  - PM2 Monitoring
  - Nginx Logs
  - Supabase Logs
  - Error-Tracking (Sentry?)

---

### Phase 2: Feature-Completion (P1 - HOCH)
**Ziel:** Core-Features vervollständigen  
**Zeitrahmen:** 2-3 Wochen  

#### Sprint 2.1: AI-Integration (Woche 3)
- [ ] 2.1.1 GROQ API vollständig integrieren
- [ ] 2.1.2 AI-Node Backend-Handler
- [ ] 2.1.3 Context-Management
- [ ] 2.1.4 Rate-Limiting
- [ ] 2.1.5 Fallback-Strategien

#### Sprint 2.2: Analytics Dashboard (Woche 4)
- [ ] 2.2.1 Metrics-Sammlung implementieren
- [ ] 2.2.2 Analytics-Tabellen in Supabase
- [ ] 2.2.3 Dashboard-Komponenten
- [ ] 2.2.4 Echtzeit-Updates (Supabase Realtime?)

#### Sprint 2.3: Template-System (Woche 5)
- [ ] 2.3.1 10+ Bot-Templates erstellen
- [ ] 2.3.2 Template-Kategorien
- [ ] 2.3.3 One-Click-Installation
- [ ] 2.3.4 Template-Preview

---

### Phase 3: Internationalisierung & Skalierung (P2 - MITTEL)
**Ziel:** Internationale Kundschaft unterstützen  
**Zeitrahmen:** 3-4 Wochen  

#### Sprint 3.1: Zahlungsmethoden (Woche 6-7)
- [ ] 3.1.1 PayPal Integration
- [ ] 3.1.2 Mobile Money (M-Pesa, MTN, Airtel)
- [ ] 3.1.3 Regional Payment Providers
  - Mercado Pago (Latam)
  - Paystack (Afrika)
  - Flutterwave (Afrika)
  - Razorpay (Indien)

#### Sprint 3.2: Übersetzungen vervollständigen (Woche 8)
- [ ] 3.2.1 Französisch (vollständig)
- [ ] 3.2.2 Swahili (vollständig)
- [ ] 3.2.3 Hausa, Yoruba (erweitern)
- [ ] 3.2.4 Amharisch, Zulu (erweitern)

#### Sprint 3.3: Performance-Optimierung (Woche 9)
- [ ] 3.3.1 CDN einrichten (Cloudflare?)
- [ ] 3.3.2 Image-Optimierung
- [ ] 3.3.3 Database Query-Optimierung
- [ ] 3.3.4 Caching-Strategien

---

## 🔒 Sicherheits-Checkliste

### Vor Production-Launch:
- [ ] SSL/HTTPS eingerichtet (Let's Encrypt)
- [ ] Security Headers konfiguriert (✅ bereits vorhanden)
- [ ] CSP Policy aktiv (✅ bereits vorhanden)
- [ ] Supabase RLS Policies geprüft
- [ ] API Rate-Limiting implementiert
- [ ] CORS richtig konfiguriert
- [ ] Environment Variables verschlüsselt
- [ ] Secrets nicht in Git
- [ ] SQL Injection Prevention (Supabase ✅)
- [ ] XSS Protection (✅ bereits vorhanden)
- [ ] CSRF Protection (✅ bereits vorhanden)
- [ ] Webhook Signature-Verifizierung (WhatsApp, Stripe)

---

## 🎯 Erfolgs-Kriterien (Production-Ready)

### Minimum Launch Requirements:
1. ✅ HTTPS mit gültigem SSL-Zertifikat
2. ✅ SMTP funktioniert (E-Mail-Verifizierung läuft)
3. ✅ WhatsApp API vollständig integriert
4. ✅ Bots können erstellt und deployed werden
5. ✅ AI-Integration funktioniert (GROQ)
6. ✅ Payment-System produktionsreif (Stripe)
7. ✅ Dashboard zeigt Bots und Analytics
8. ✅ Support-System funktioniert
9. ✅ Multi-Language (mindestens de, en, fr)
10. ✅ DSGVO-konform (RLS, Consent, DPA)

---

## 📊 Abhängigkeiten & Risiken

### Externe Abhängigkeiten:
1. **DNS Propagation** (Goneo)
   - Risiko: Verzögerung bei SSL-Setup
   - Mitigation: DNS-Status regelmäßig prüfen

2. **WhatsApp Business API Approval** (Meta)
   - Risiko: Verzögerung bei Account-Freischaltung
   - Mitigation: Early Application, BSP-Partner nutzen

3. **Stripe Account-Verifizierung**
   - Risiko: Verzögerung bei Production-Access
   - Mitigation: Test-Mode parallel entwickeln

4. **Goneo SMTP**
   - Risiko: SMTP funktioniert nicht
   - Mitigation: Fallback zu SendGrid/Mailgun vorbereiten

### Technische Risiken:
1. **n8n-Integration nicht brechen**
   - Risiko: Bestehende Workflows stoppen
   - Mitigation: Keine Änderungen an automat.owona.de, n8n-Datenbank

2. **Caddy/Nginx Konflikte**
   - Risiko: Reverse Proxy für andere Services überschreiben
   - Mitigation: Separate Nginx-Config für whatsapp.owona.de

3. **Supabase Rate-Limits**
   - Risiko: API-Limits bei hoher Last
   - Mitigation: Caching, Connection Pooling

---

## 🚦 Nächste Schritte (Sofort)

### Tag 1: Infrastruktur-Fixes
1. **SSL/HTTPS einrichten** (1-2 Stunden)
   ```bash
   ssh root@91.99.232.126
   # DNS-Propagation prüfen
   nslookup whatsapp.owona.de
   # Certbot ausführen
   certbot --nginx -d whatsapp.owona.de
   # Nginx neu laden
   systemctl reload nginx
   # HTTPS testen
   curl -I https://whatsapp.owona.de
   ```

2. **SMTP debuggen** (2-3 Stunden)
   - Supabase Dashboard → Project Settings → Auth → SMTP
   - Logs analysieren (Auth Logs, Edge Function Logs)
   - Port 587 testen
   - Test-E-Mail versenden

3. **Environment Variables vervollständigen** (1 Stunde)
   - `.env.local` auf Server prüfen
   - Fehlende Keys ergänzen
   - Build neu erstellen
   - PM2 neu starten

### Tag 2: WhatsApp API Vorbereitung
1. **WhatsApp Business API Account beantragen**
2. **Facebook Developer Console Setup**
3. **Webhook-Route implementieren** (`/api/webhooks/whatsapp`)

---

## 📚 Dokumentations-Referenzen

### Verwendete Dokumentationen:
1. ✅ **SERVER_KONFIGURATIONEN_OVERVIEW.md**
   - Hetzner Server Details
   - Caddy/Nginx Konfiguration
   - Domain-Setup

2. ✅ **AGENT_BASIERTE_REVERSE_ENGINEERING.md**
   - Agent-basierte Fix-Strategien
   - Dokumentation als Wissensquelle

3. ✅ **SUPABASE_N8N_DATABASE_ACCESS_GUIDE.md**
   - Supabase-Verbindung
   - PostgreSQL Credentials
   - n8n Docker Integration
   - Encryption Key Management

4. ✅ **WHATSAPP_BOT_REVERSE_ENGINEERING_DATABASE.md**
   - WhatsApp-Integration Beispiel
   - n8n Workflow als Referenz
   - Supabase Edge Function
   - Facebook Developer Setup

5. ✅ **PROJEKT_STATUS.md**
   - Aktueller Feature-Stand
   - Offene Probleme
   - SMTP-Konfiguration

6. ✅ **CURRENT_STATUS.md**
   - Knowledge Base (RAG) Status
   - Background-Processing Fixes
   - RLS Policies

---

## ⚠️ Wichtige Einschränkungen (NICHT ÄNDERN!)

### System-Bereiche die unberührt bleiben müssen:
1. **salomonowona.com**
   - Persönliche Website
   - Läuft auf Caddy
   - Files in `/var/www/html/salomonowona`

2. **automat.owona.de**
   - n8n Workflow Platform
   - Port 5678
   - Produktive Workflows laufen hier
   - KEINE Änderungen an n8n Container

3. **n8n Datenbank (Supabase)**
   - Schema: `n8n`
   - KEINE Schema-Änderungen
   - KEINE Workflow-Änderungen

4. **Caddy Reverse Proxy**
   - Läuft parallel zu Nginx
   - automat.owona.de über Caddy
   - salomonowona.com über Caddy
   - whatsapp.owona.de über Nginx (separate Config!)

5. **Docker Networks**
   - `n8n-network` nicht ändern
   - Bestehende Container nicht stoppen

---

## 🎯 Erfolgs-Definition

**Production-Ready bedeutet:**
1. ✅ User können sich registrieren und anmelden
2. ✅ E-Mail-Verifizierung funktioniert
3. ✅ Bots können erstellt werden (Visual Editor)
4. ✅ Bots können mit WhatsApp Business API verbunden werden
5. ✅ Nachrichten werden empfangen und verarbeitet
6. ✅ AI-Integration funktioniert (GROQ)
7. ✅ Zahlungen können abgewickelt werden (Stripe)
8. ✅ Dashboard zeigt Metriken
9. ✅ Support-System funktioniert
10. ✅ System ist DSGVO-konform
11. ✅ HTTPS mit gültigem SSL
12. ✅ Multi-Language (mindestens de, en, fr)

**Bereit für erste Kunden:** ✅ = Alle 12 Punkte erfüllt

---

**Erstellt:** 10. Januar 2026  
**Version:** 1.0  
**Nächste Aktualisierung:** Nach Phase 1 (Sprint 1.4)
