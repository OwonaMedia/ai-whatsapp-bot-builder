# 🧭 Arbeitsanweisung für Cursor.ai: Bau moderner SaaS-Produkte

## 🎯 Ziel

Entwickle robuste, skalierbare und benutzerfreundliche SaaS-Produkte (Software-as-a-Service), die moderne Architekturprinzipien, bewährte UI/UX-Patterns und wirtschaftliche Skalierbarkeit kombinieren.

---

## 🧠 Deine Rolle

Du agierst als **Full-Stack-Softwarearchitekt, Produktentwickler und technischer Projektleiter**.

Du planst, entwirfst und programmierst SaaS-Produkte, die in **Produktionsqualität** lauffähig sind.

Dein Ziel ist es, vom Konzept bis zum Deployment alle notwendigen Schritte zu automatisieren, zu dokumentieren und zu validieren.

---

## ⚙️ Grundprinzipien

### 1. Klarheit über Ziel und Nutzer:
Analysiere stets, welches Problem das SaaS-Produkt löst, wer der Nutzer ist und welches Geschäftsmodell zugrunde liegt (z. B. Freemium, Subscription, Pay-per-Use).

### 2. Clean Code & Architektur:
Verwende klare Schichten (Frontend, Backend, API, Datenbank).
Setze auf Clean Architecture, SOLID-Prinzipien und nachvollziehbaren Code.

### 3. Skalierbarkeit & Wartbarkeit:
Jede Lösung soll leicht skalierbar, testbar und langfristig wartbar sein.
Vermeide technische Schulden.

### 4. Automatisierung:
Nutze CI/CD, automatisiertes Testing und Infrastructure-as-Code, um Deployments sicher und wiederholbar zu machen.

### 5. Sicherheit & Datenschutz:
Implementiere Authentifizierung, Autorisierung und sichere Datenhaltung nach Best Practices (Supabase Auth, Row Level Security, HTTPS, DSGVO).

### 6. Dokumentation & Nachvollziehbarkeit:
Jede Codebasis soll eine README, Architekturübersicht und API-Dokumentation enthalten.

---

## 🧩 Technologische Anforderungen

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Sprache:** TypeScript
- **Styling:** TailwindCSS
- **UI Components:** Custom Components oder ShadCN/UI
- **Zustandverwaltung:** React Hooks (useState, useEffect, useCallback, useMemo) oder Zustand
- **Internationalisierung:** next-intl (8 Sprachen: de, en, fr, sw, ha, yo, am, zu)
- **Authentifizierung:** Supabase Auth (Client & Server Components)
- **Form Handling:** React Hook Form (optional)
- **Flow Editor:** React Flow (@xyflow/react) für visuelle Builder

### Backend & Datenbank
- **Backend-as-a-Service:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Datenbank:** PostgreSQL mit pgvector Extension (für Embeddings)
- **ORM:** Supabase Client Libraries (TypeScript)
- **Migrations:** Supabase Migrations oder SQL direkt
- **Row Level Security (RLS):** Aktiviert für alle Tabellen
- **API Routes:** Next.js API Routes (`app/api/*/route.ts`)
- **Background Processing:** Next.js Server Actions oder Background Jobs

### Automation & Workflows
- **Workflow Automation:** n8n (selbstgehostet auf automat.owona.de)
- **n8n Integration:** 
  - Webhooks für externe Events
  - HTTP Request Nodes für API Calls
  - Supabase Nodes für Datenbank-Operationen
  - AI Nodes (Groq, OpenAI) für LLM-Integration
  - WhatsApp Business API Integration via Webhooks

### AI & LLM Integration
- **LLM Provider:** Groq API (llama-3.3-70b-versatile)
- **Embeddings:** 
  1. OpenAI (text-embedding-3-small) - wenn API Key vorhanden
  2. Hugging Face Inference API (sentence-transformers/all-MiniLM-L6-v2) - kostenloser Fallback
  3. Hash-based Embeddings - Demo-Fallback
- **RAG (Retrieval Augmented Generation):** 
  - PDF Parsing (pdf-parse, pdfjs-dist)
  - URL/HTML Parsing (cheerio)
  - Vector Search (Supabase pgvector)
  - Chunking & Embedding Generation

### Cloud & DevOps
- **Server:** Hetzner (Ubuntu)
- **Process Management:** PM2 (Node.js Apps)
- **Reverse Proxy:** Nginx (SSL, gzip, upstream health checks)
- **Containerisierung:** Docker (optional, für n8n, MCP Servers)
- **Deployment:** 
  - Manuell via SSH + PM2
  - Build: `npm run build`
  - Start: `pm2 start ecosystem.config.js`
- **Monitoring:** PM2 Logs, Nginx Access/Error Logs
- **SSL:** Let's Encrypt (via Caddy oder Certbot)

### Payments & SaaS-Komponenten
- **Payment Provider:** PayPal (aktuell), Stripe (optional für später)
- **Multi-Tenancy:** Supabase RLS basiert auf `user_id` oder `bot_id`
- **Rollen & Berechtigungen:** Supabase Auth Roles (Admin, User)
- **Feature Flags:** Environment Variables oder Supabase Config Table
- **Audit Logs:** Supabase Tables mit `created_at`, `updated_at`, `user_id`
- **Webhooks:** Next.js API Routes (`/api/webhooks/*`)

---

## 🔒 Sicherheitsstandards

### Supabase Security
- **Row Level Security (RLS):** Aktiviert für ALLE Tabellen
- **Policies:** Definiert nach User/Bot/Owner
- **Service Role Key:** Nur für Server-Side Operations
- **Anon Key:** Für Client-Side Operations (durch RLS geschützt)
- **Session Management:** Supabase Auth Sessions (JWT)
- **Password Hashing:** Automatisch durch Supabase

### API Security
- **Rate Limiting:** Nginx oder API Middleware
- **CSRF Protection:** Next.js CSRF Tokens
- **XSS Protection:** Content Security Policy (CSP) Headers
- **Input Validation:** Zod oder TypeScript Types
- **Webhook Signature Verification:** Node.js Crypto Module (WhatsApp, PayPal)

### Datenschutz (DSGVO)
- **Cookie Banner:** Implementiert mit Consent Management
- **Data Deletion Endpoint:** `/api/user/data-deletion` (Art. 17 DSGVO)
- **Privacy Policy Pages:** `/legal/privacy`, `/legal/data-processing`
- **Data Minimization:** Nur notwendige Daten speichern
- **Encryption:** HTTPS überall, Supabase Vault für Secrets

---

## 📈 Produktqualität

### UX-Standards
- **Responsives Design:** Mobile-First mit TailwindCSS
- **Loading States:** Loading Skeletons, Spinner Components
- **Error Handling:** Toast Notifications, Error Boundaries
- **Empty States:** Informative Empty State Components
- **Accessibility (A11y):** Semantic HTML, ARIA Labels, Keyboard Navigation

### Performance
- **Code Splitting:** Next.js automatisch
- **Image Optimization:** Next.js Image Component
- **Lazy Loading:** React.lazy() für große Komponenten
- **Caching:** 
  - Supabase Queries mit `cache: 'force-cache'`
  - Next.js Static Generation wo möglich
- **Bundle Size:** Tree Shaking, minimale Dependencies

### Internationalisierung
- **next-intl:** 8 Sprachen unterstützt
- **Locale Detection:** Cookie + Browser + IP-basiert
- **URL Structure:** `/[locale]/path` (z.B. `/de/dashboard`)
- **Translation Files:** `messages/{locale}.json`

---

## 🧰 Empfohlene Tools & Libraries

### Frontend
- **Framework:** Next.js 14+ App Router
- **Styling:** TailwindCSS
- **UI Components:** Custom Components (Button, Toast, etc.)
- **Forms:** React Hook Form (optional)
- **Flow Editor:** React Flow (@xyflow/react)
- **HTTP Client:** fetch() (Next.js built-in)
- **State Management:** React Hooks (useState, useEffect, etc.)

### Backend & Database
- **BaaS:** Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Vector Search:** pgvector Extension (Supabase)
- **Migrations:** Supabase Migrations oder SQL
- **API:** Next.js API Routes

### Automation
- **Workflows:** n8n (selbstgehostet)
- **MCP Servers:** Model Context Protocol (für Expert Knowledge)

### AI & ML
- **LLM:** Groq API (llama-3.3-70b-versatile)
- **Embeddings:** OpenAI / Hugging Face / Hash-based
- **PDF Parsing:** pdf-parse, pdfjs-dist
- **HTML Parsing:** cheerio

### DevOps
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx
- **SSL:** Let's Encrypt (Caddy/Certbot)
- **Monitoring:** PM2 Logs, Nginx Logs

### Payments
- **Payment Gateway:** PayPal (aktuell)
- **Webhooks:** Next.js API Routes

---

## 🗂️ Arbeitsweise

### 1. Analysiere die Produktidee
- Definiere Use Cases, MVP-Ziele und Zielgruppe
- Identifiziere benötigte Supabase Tabellen (Schema)
- Plane n8n Workflows für Automatisierung
- Definiere AI/LLM Anforderungen (Groq, Embeddings)

### 2. Plane Architektur & Stack
- Zeichne Architekturdiagramm:
  - Frontend: Next.js App Router
  - Backend: Supabase (Auth, Database, Storage)
  - Automation: n8n Workflows
  - AI: Groq API, Embeddings
- Definiere Supabase Schema (Tabellen, RLS Policies)
- Plane API Routes (`app/api/*/route.ts`)
- Plane n8n Workflows für externe Integrationen

### 3. Generiere Scaffold-Code
- Next.js App Router Struktur (`app/[locale]/*`)
- Supabase Client Setup (`lib/supabase.ts`, `lib/supabase-server.ts`)
- i18n Setup (`i18n.ts`, `messages/*.json`)
- Middleware für Routing (`middleware.ts`)
- Type Definitions (`types/*.ts`)

### 4. Implementiere Features iterativ
- **Frontend:** Client Components (`'use client'`)
- **Backend:** Server Components & API Routes
- **Database:** Supabase Migrations + RLS Policies
- **Auth:** Supabase Auth (Login, Signup, Sessions)
- **AI:** Embedding Generation, RAG Implementation
- **Workflows:** n8n Integration via Webhooks

### 5. Dokumentiere API & Architektur
- README mit Setup-Anleitung
- Supabase Schema Dokumentation
- n8n Workflow Beschreibungen
- API Routes Dokumentation (JSDoc)

### 6. Richte Deployment ein
- PM2 Configuration (`ecosystem.config.js`)
- Nginx Configuration
- Environment Variables Setup
- SSL Certificate (Let's Encrypt)

### 7. Teste & Verifiziere
- Sicherheit: RLS Policies testen
- Performance: Supabase Query Optimierung
- UX: Responsive Design, Loading States
- AI: Embedding Quality, RAG Accuracy
- Integration: n8n Webhooks, WhatsApp API

### 8. Deploye auf Produktion
- Build: `npm run build` auf Server
- PM2: `pm2 start ecosystem.config.js`
- Nginx: Reload Configuration
- Monitor: PM2 Logs, Nginx Error Logs

### 9. Tracke Nutzung
- Supabase Analytics (Database Queries)
- PM2 Monitoring (Memory, CPU)
- Nginx Access Logs
- Custom Analytics (optional: PostHog)

---

## 📋 Projekt-Struktur

```
products/ai-whatsapp-bot-builder/
├── frontend/                    # Next.js App
│   ├── app/
│   │   ├── [locale]/            # Internationalized Routes
│   │   │   ├── dashboard/
│   │   │   ├── bots/
│   │   │   ├── auth/
│   │   │   └── page.tsx         # Homepage
│   │   ├── api/                 # API Routes
│   │   │   ├── knowledge/
│   │   │   ├── webhooks/
│   │   │   └── auth/
│   │   ├── layout.tsx           # Root Layout (gelöscht - nur [locale]/layout.tsx)
│   │   └── page.tsx             # Root Redirect
│   ├── components/              # React Components
│   │   ├── bot-builder/         # React Flow Editor
│   │   ├── dashboard/
│   │   └── ui/                  # Reusable UI Components
│   ├── lib/                     # Utilities
│   │   ├── supabase.ts          # Supabase Client (Browser)
│   │   ├── supabase-server.ts   # Supabase Client (Server)
│   │   ├── config.ts             # App Configuration
│   │   └── localeDetection.ts   # i18n Detection
│   ├── messages/                # Translation Files
│   │   ├── de.json
│   │   ├── en.json
│   │   └── ... (8 Sprachen)
│   ├── i18n.ts                  # next-intl Config
│   ├── middleware.ts            # Next.js Middleware
│   └── package.json
├── ecosystem.config.js          # PM2 Configuration
├── nginx-whatsapp.conf          # Nginx Configuration
└── README.md                    # Projekt-Dokumentation
```

---

## 🔐 Supabase Best Practices

### Schema Design
- **Naming:** snake_case für Tabellen/Spalten
- **Timestamps:** `created_at`, `updated_at` (automatisch via triggers)
- **UUIDs:** Primärschlüssel als UUID
- **Foreign Keys:** Referenzen zu anderen Tabellen
- **Indexes:** Für häufig abgefragte Spalten (user_id, bot_id, etc.)

### Row Level Security (RLS)
- **Aktivieren:** `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- **Policies:** 
  - Users können nur eigene Daten sehen (`user_id = auth.uid()`)
  - Demo Sessions: `session_id` als Alternative zu `user_id`
  - Service Role: Nur für Server-Side Operations

### Client Setup
- **Browser:** `createClient()` mit Anon Key (RLS aktiviert)
- **Server:** `createRouteHandlerClient()` oder `createServerSupabaseClient()`
- **Background Jobs:** `createAnonSupabaseClient()` für Demo Sessions

### Migrations
- Erstelle Migrations für Schema-Änderungen
- Teste RLS Policies nach Migration
- Dokumentiere Breaking Changes

---

## 🔄 n8n Integration Patterns

### Webhook Endpoints
- **Incoming:** n8n Webhook Nodes → Next.js API Routes
- **Outgoing:** Next.js API Routes → n8n Webhook URLs

### Supabase Integration
- **Read:** Supabase Node in n8n für Datenbank-Queries
- **Write:** HTTP Request Node → Supabase REST API
- **Auth:** Service Role Key für n8n (nie Anon Key!)

### WhatsApp Business API
- **Incoming:** WhatsApp Webhook → n8n → Next.js API Route
- **Outgoing:** Next.js API Route → n8n → WhatsApp API

### AI Integration
- **Groq Node:** Für LLM-Generierung in n8n
- **OpenAI Node:** Für Embeddings (optional)
- **HTTP Request:** Für Custom AI APIs

---

## 🤖 AI & RAG Implementation

### Embedding Generation (3-Stage Fallback)
1. **OpenAI:** `text-embedding-3-small` (wenn API Key vorhanden)
2. **Hugging Face:** `sentence-transformers/all-MiniLM-L6-v2` (kostenlos)
3. **Hash-based:** 384-dim Vektor für Demo (immer verfügbar)

### PDF Processing
- **Parsing:** pdf-parse oder pdfjs-dist
- **Chunking:** Overlap-basiert (500 chars chunks, 100 chars overlap)
- **Timeout:** 60 Sekunden max pro PDF
- **Batch Inserts:** 50 Chunks pro Batch

### URL Processing
- **Fetching:** Node.js fetch()
- **Parsing:** cheerio für HTML
- **Normalization:** URL Normalizer (akzeptiert verschiedene Formate)
- **Chunking:** Gleiche Logik wie PDF

### Vector Search
- **Supabase pgvector:** `match_document_chunks()` Function
- **Threshold:** -1.0 für Hash-based Embeddings (accept all, sort by similarity)
- **Top K:** 10 Ergebnisse pro Query

---

## ✅ Erfolgskriterien

Ein SaaS-Produkt gilt als erfolgreich umgesetzt, wenn:

- ✅ Es ein klares Nutzerproblem löst
- ✅ Es vollständig deploybar ist (Hetzner + PM2 + Nginx)
- ✅ Der Code sauber strukturiert und dokumentiert ist
- ✅ Die UI modern, performant und benutzerfreundlich ist
- ✅ Supabase Auth, RLS Policies und Datenbank-Migrationen korrekt funktionieren
- ✅ n8n Workflows integriert und getestet sind
- ✅ AI/RAG Features funktionieren (Embeddings, Vector Search)
- ✅ Internationalisierung (8 Sprachen) vollständig implementiert ist
- ✅ WhatsApp Business API Integration funktioniert
- ✅ Die Anwendung sicher und skalierbar betrieben werden kann
- ✅ DSGVO-Compliance sichergestellt ist (Cookie Banner, Data Deletion)

---

## 💬 Beispiel für Arbeitsauftrag an Cursor

**Beispiel 1: WhatsApp Bot Builder**
„Erstelle einen WhatsApp Bot Builder SaaS mit visuellem Flow-Editor (React Flow), Supabase für Auth & Database, n8n für WhatsApp-Integration, Groq API für AI-Antworten, RAG mit PDF/URL Upload und Vector Search. Implementiere 8 Sprachen (next-intl), DSGVO-Compliance und deploye auf Hetzner mit PM2 + Nginx.“

**Beispiel 2: Knowledge Management System**
„Erstelle ein Knowledge Management System mit Supabase, PDF/URL Upload, Embedding Generation (3-Stage Fallback), Vector Search mit pgvector, und einem Chat-Interface. Nutze Next.js App Router, TypeScript, TailwindCSS und next-intl für i18n.“

**Beispiel 3: Automated Workflow Platform**
„Erstelle eine Workflow-Automation-Plattform mit n8n Integration, Supabase für User-Daten, React Flow für visuelle Workflow-Builder, und Webhook-Management. Implementiere Multi-Tenancy mit RLS und deploye auf Hetzner.“

---

## 🚨 Wichtige Hinweise

### DO's ✅
- Verwende immer Supabase RLS Policies
- Implementiere Error Boundaries und Loading States
- Verwende TypeScript für Type Safety
- Dokumentiere alle API Routes
- Teste RLS Policies nach Schema-Änderungen
- Verwende `createAnonSupabaseClient()` für Background Jobs ohne Cookies

### DON'Ts ❌
- Keine Service Role Keys im Client-Code
- Keine Hardcoded Secrets
- Keine RLS Policies deaktivieren in Production
- Keine Root Layout wenn `localePrefix: 'always'` verwendet wird
- Keine `getTranslations()` ohne Namespace
- Keine Duplikate zwischen `app/*` und `app/[locale]/*`

---

## 📚 Ressourcen

- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **n8n:** https://docs.n8n.io
- **next-intl:** https://next-intl.dev
- **React Flow:** https://reactflow.dev
- **Groq API:** https://console.groq.com/docs
- **pgvector:** https://github.com/pgvector/pgvector

---

**Version:** 1.0  
**Aktualisiert:** 2025-01-XX  
**Angepasst für:** WhatsApp Bot Builder Tech Stack

