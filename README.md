# 🤖 AI WhatsApp Business Bot Builder
**Domain:** whatsapp.owona.de

White-Label-Plattform zum Erstellen von DSGVO-konformen, AI-gestützten WhatsApp Business Bots ohne Code.

---

## 🚀 Features

### ✅ **Implementiert (MVP):**
- ✅ **Authentifizierung** (Login, Signup, Session Management)
- ✅ **User Dashboard** (Bot-Übersicht)
- ✅ **Visueller Bot-Builder** (Drag & Drop Flow-Editor)
- ✅ **6 Node-Typen** (Trigger, Message, Question, Condition, AI, End)
- ✅ **Supabase Integration** (Backend, Auth, Database)
- ✅ **Security Features** (Headers, CSP, XSS Protection, CSRF)
- ✅ **DSGVO-Compliance** (Consent Management, Data Tracking)
- ✅ **Error Handling** (Error Boundaries, Loading States)

### ⏳ **In Entwicklung:**
- ⏳ WhatsApp Business API Integration
- ⏳ AI-Integration (GROQ API)
- ⏳ Analytics Dashboard
- ⏳ Template-System

---

## 🏗️ Tech Stack

- **Frontend:** Next.js 14 (App Router)
- **Backend:** Supabase (PostgreSQL + Auth)
- **Styling:** Tailwind CSS
- **Flow Editor:** @xyflow/react
- **TypeScript:** Vollständig typisiert
- **AI:** GROQ API (geplant)
- **WhatsApp:** Business API via BSP (geplant)

---

## 📦 Installation

### **Voraussetzungen:**
- Node.js 20+
- Supabase Account
- WhatsApp Business API Account (via BSP)
- GROQ API Key

### **Setup:**

```bash
# 1. Repository klonen
cd products/ai-whatsapp-bot-builder

# 2. Frontend Setup
cd frontend
npm install

# 3. Environment Variables
cp ../config/.env.example .env.local
# .env.local bearbeiten und Werte eintragen

# 4. Supabase Schema importieren
# In Supabase SQL Editor: supabase/migrations/*.sql ausführen

# 5. Development Server starten
npm run dev
```

App läuft auf: http://localhost:3000

---

## 🔧 Konfiguration

### **Domain: whatsapp.owona.de**

Alle Konfigurationen sind für die Domain **whatsapp.owona.de** vorbereitet.

### **Environment Variables:**

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# WhatsApp
WHATSAPP_BSP_API_KEY=your_whatsapp_api_key
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret
WHATSAPP_VERIFY_TOKEN=your_verify_token

# AI
GROQ_API_KEY=your_groq_api_key
```

---

## 📚 Projektstruktur

```
products/ai-whatsapp-bot-builder/
├── frontend/                 # Next.js App
│   ├── app/                 # App Router
│   │   ├── auth/            # Authentifizierung
│   │   ├── dashboard/       # Dashboard
│   │   ├── bots/            # Bot-Management
│   │   └── api/             # API Routes
│   ├── components/
│   │   ├── auth/            # Auth Components
│   │   ├── bot-builder/     # Bot-Builder Components
│   │   ├── bots/            # Bot Components
│   │   ├── dashboard/       # Dashboard Components
│   │   └── ui/              # UI Components
│   ├── lib/                 # Utilities
│   └── types/               # TypeScript Types
│
├── supabase/
│   └── migrations/          # Database Migrations
│
├── docs/                    # Dokumentation
│   ├── DEPLOYMENT.md
│   └── EXPERTEN_REVIEW_*.md
│
└── config/                  # Konfiguration
```

---

## 🚀 Deployment

Siehe `docs/DEPLOYMENT.md` für vollständige Anleitung.

**Domain:** https://whatsapp.owona.de

---

## 🔒 Compliance

- ✅ DSGVO-konform
- ✅ EU-Datenhaltung
- ✅ Consent Management
- ✅ Automatische Datenschutzerklärung
- ✅ Betroffenenrechte (Art. 15-22 DSGVO)

---

## 📊 Status

**Version:** 0.1.0 (MVP)  
**Status:** In aktiver Entwicklung  
**Domain:** whatsapp.owona.de

### **Abgeschlossen:**
- ✅ Basis-Architektur
- ✅ Authentifizierung
- ✅ Dashboard
- ✅ Bot-Builder (Basis)

### **In Arbeit:**
- ⏳ WhatsApp Integration
- ⏳ AI-Integration
- ⏳ Analytics

---

## 📝 License

MIT

---

**Letzte Aktualisierung:** 2025-01-XX
