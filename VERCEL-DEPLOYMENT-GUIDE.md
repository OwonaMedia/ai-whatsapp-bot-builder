# Vercel Deployment Guide

Komplette Anleitung für erfolgreiches Deployment mit GitHub und Vercel - allgemein und speziell für den WhatsApp Bot Builder.

## Inhaltsverzeichnis

1. [Allgemeine Vercel Deployment Basics](#allgemeine-vercel-deployment-basics)
2. [Monorepo-Projekte mit Vercel](#monorepo-projekte-mit-vercel)
3. [WhatsApp Bot Builder Spezifika](#whatsapp-bot-builder-spezifika)
4. [Häufige Probleme und Lösungen](#häufige-probleme-und-lösungen)
5. [Best Practices](#best-practices)

---

## Allgemeine Vercel Deployment Basics

### 1. Projekt mit Vercel verbinden

#### Via Vercel Dashboard (empfohlen für Ersteinrichtung)

1. Gehe zu [vercel.com](https://vercel.com) und melde dich an
2. Klicke auf "Add New Project"
3. Wähle dein GitHub Repository aus
4. Vercel erkennt automatisch das Framework (Next.js, React, etc.)
5. Konfiguriere Build-Einstellungen falls nötig
6. Klicke auf "Deploy"

#### Via Vercel CLI

```bash
# Vercel CLI installieren
npm install -g vercel

# Im Projektverzeichnis
vercel login
vercel link

# Deployment
vercel --prod
```

### 2. Grundlegende Konfiguration

#### Umgebungsvariablen

1. Im Vercel Dashboard → Projekt → Settings → Environment Variables
2. Füge alle notwendigen Variablen hinzu:
   - `NEXT_PUBLIC_*` Variablen sind im Browser sichtbar
   - Andere Variablen sind nur serverseitig verfügbar

#### Build-Einstellungen

Standard für Next.js:
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Development Command:** `npm run dev`

---

## Monorepo-Projekte mit Vercel

### Was ist ein Monorepo?

Ein Monorepo enthält mehrere Projekte/Pakete in einem Repository, z.B.:

```
projekt/
├── frontend/          # Next.js App
├── backend/           # API
├── shared/            # Gemeinsamer Code
└── docs/             # Dokumentation
```

### Konfiguration für Monorepos

#### Option 1: Vercel Projekteinstellungen (empfohlen)

Setze `rootDirectory` über das Dashboard oder API:

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/YOUR_PROJECT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rootDirectory": "frontend"
  }'
```

**Wichtig:** `rootDirectory` darf NICHT in `vercel.json` gesetzt werden - das führt zu Fehlern!

#### Option 2: Separate Vercel-Projekte

Erstelle für jedes deploybare Paket ein eigenes Vercel-Projekt:
- Ein Projekt für `frontend/`
- Ein Projekt für `backend/`
- Etc.

### .vercelignore für Monorepos

Minimale `.vercelignore` im Root:

```
# Standard ignores
node_modules
.git
.env.local
.DS_Store

# Build artifacts
.next
dist
build
coverage
.cache
```

**Nicht zu viel ignorieren!** Mit `rootDirectory` deployed Vercel automatisch nur das richtige Verzeichnis.

---

## WhatsApp Bot Builder Spezifika

### Projektstruktur

```
ai-whatsapp-bot-builder/
├── frontend/              # Next.js App (wird deployed)
│   ├── app/              # Next.js App Router
│   ├── lib/              # Utilities & Logic
│   ├── components/       # React Components
│   ├── public/           # Statische Assets
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.js
├── docs/                 # Dokumentation
├── scripts/              # Build Scripts
└── support-mcp-server/   # MCP Server
```

### Erfolgreiche Konfiguration

#### 1. Vercel Projekteinstellungen

```json
{
  "framework": "nextjs",
  "rootDirectory": "frontend",
  "buildCommand": "npm run build",
  "installCommand": "npm install --legacy-peer-deps --no-audit --no-fund",
  "outputDirectory": ".next",
  "nodeVersion": "24.x"
}
```

**Setzen via API:**

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/prj_33hiedh7W8JUSzePPR0m5JePu8fJ" \
  -H "Authorization: Bearer YOUR_VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "framework": "nextjs",
    "rootDirectory": "frontend",
    "buildCommand": "npm run build",
    "installCommand": "npm install --legacy-peer-deps --no-audit --no-fund",
    "outputDirectory": ".next"
  }'
```

#### 2. tsconfig.json (frontend/tsconfig.json)

**Kritisch:** `baseUrl` muss gesetzt sein für Path Aliases!

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    // ... andere Optionen
  }
}
```

#### 3. Git-Einstellungen

Deaktiviere `requireVerifiedCommits` wenn du keine GPG-signierten Commits verwendest:

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/YOUR_PROJECT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gitProviderOptions": {
      "requireVerifiedCommits": false,
      "createDeployments": "enabled"
    }
  }'
```

#### 4. Keine vercel.json im Root!

Für Monorepos mit `rootDirectory` sollte **keine** `vercel.json` im Root-Verzeichnis existieren. Die Konfiguration erfolgt über Projekteinstellungen.

Falls eine `vercel.json` im `frontend/` Ordner existiert:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install --legacy-peer-deps --no-audit --no-fund",
  "framework": "nextjs"
}
```

#### 5. .vercelignore (Root)

```
# Standard ignores
node_modules
.git
.env.local
.DS_Store

# Build artifacts
.next
dist
build
coverage
.cache
```

---

## Häufige Probleme und Lösungen

### Problem 1: "Module not found: Can't resolve '@/lib/...'"

**Ursache:** `baseUrl` fehlt in `tsconfig.json`

**Lösung:**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Problem 2: "Deployment canceled - unverified commit"

**Ursache:** `requireVerifiedCommits` ist aktiviert, aber Commits sind nicht GPG-signiert

**Lösung 1:** Deaktiviere die Einstellung (siehe oben)

**Lösung 2:** Signiere deine Commits mit GPG:

```bash
# GPG Key erstellen
gpg --full-generate-key

# Git konfigurieren
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true

# GitHub GPG Key hinzufügen
gpg --armor --export YOUR_KEY_ID
# Kopiere Output zu GitHub → Settings → SSH and GPG keys
```

### Problem 3: "Invalid vercel.json - should NOT have additional property 'rootDirectory'"

**Ursache:** `rootDirectory` ist in `vercel.json` definiert (nicht erlaubt für CLI-Deploys)

**Lösung:** Entferne `vercel.json` und setze `rootDirectory` über Projekteinstellungen (siehe oben)

### Problem 4: Build läuft, aber nur 262 statt 950 Dateien

**Ursache:** `.vercelignore` blockiert zu viele Dateien (z.B. `*.md`, `*.js`, `*.sh`)

**Lösung:** Vereinfache `.vercelignore`:

```
node_modules
.git
.env.local
.DS_Store
.next
dist
build
```

### Problem 5: "Command 'npm run build' exited with 1"

**Debugging:**

1. **Lokaler Test:**
   ```bash
   cd frontend
   rm -rf .next node_modules
   npm install --legacy-peer-deps
   npm run build
   ```

2. **Environment Variables prüfen:**
   - Sind alle notwendigen Variablen in Vercel gesetzt?
   - Haben Production-Variablen die richtigen Werte?

3. **Build-Logs in Vercel prüfen:**
   - Dashboard → Deployments → Failed Deployment → View Function Logs

### Problem 6: Deployment friert bei "Installing dependencies"

**Ursache:** Peer Dependency Konflikte oder Timeout

**Lösung:**

```json
{
  "installCommand": "npm install --legacy-peer-deps --no-audit --no-fund"
}
```

---

## Best Practices

### 1. Umgebungsvariablen Management

```bash
# Entwicklung
.env.local              # Lokal, nicht in Git

# Production
Vercel Dashboard        # Environment Variables
```

**Präfixe beachten:**
- `NEXT_PUBLIC_*` → Client-seitig sichtbar
- Ohne Präfix → Nur server-seitig

### 2. Git Workflow

```bash
# Feature Branch erstellen
git checkout -b feature/neue-funktion

# Entwickeln und committen
git add .
git commit -m "feat: neue Funktion hinzugefügt"

# Pushen
git push origin feature/neue-funktion

# Pull Request erstellen
# Vercel erstellt automatisch Preview Deployment

# Nach Merge in main
# Vercel deployed automatisch zu Production
```

### 3. Preview Deployments nutzen

- Jeder Push zu einem Branch erstellt ein Preview Deployment
- Teste Features vor dem Merge zu main
- Teile Preview-URLs mit dem Team

### 4. Deployment-Hooks

Für automatische Actions nach Deployment:

```bash
curl -X POST "https://api.vercel.com/v1/integrations/deploy-hooks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Deploy Hook",
    "url": "https://your-webhook-endpoint.com"
  }'
```

### 5. Performance Monitoring

1. Enable Speed Insights in Vercel Dashboard
2. Enable Web Analytics
3. Nutze Vercel Analytics für Real User Monitoring

### 6. Rollbacks

Bei Problemen:

```bash
# Via Dashboard
Deployments → Previous Deployment → Promote to Production

# Via CLI
vercel rollback
```

### 7. Build Cache optimieren

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm ci --legacy-peer-deps"
}
```

`npm ci` ist schneller und deterministischer als `npm install`.

### 8. Domain-Konfiguration

Für Custom Domain (z.B. whatsapp.owona.de):

1. Vercel Dashboard → Projekt → Domains
2. Domain hinzufügen: `whatsapp.owona.de`
3. DNS-Records bei deinem Provider hinzufügen:
   ```
   Type: CNAME
   Name: whatsapp
   Value: cname.vercel-dns.com
   ```

---

## Deployment Checklist

### Vor dem ersten Deployment

- [ ] Repository mit Vercel verbunden
- [ ] Framework erkannt (Next.js)
- [ ] `rootDirectory` gesetzt (falls Monorepo)
- [ ] Build Command konfiguriert
- [ ] Install Command konfiguriert
- [ ] Environment Variables hinzugefügt
- [ ] `requireVerifiedCommits` deaktiviert (falls keine GPG-Signierung)

### Vor jedem Deployment

- [ ] Lokaler Build funktioniert (`npm run build`)
- [ ] Tests laufen durch
- [ ] Environment Variables aktualisiert
- [ ] Dependencies aktualisiert (`npm audit`)
- [ ] TypeScript Errors behoben
- [ ] ESLint Warnings geprüft

### Nach dem Deployment

- [ ] Production URL funktioniert
- [ ] Alle Routen erreichbar
- [ ] API-Endpunkte funktionieren
- [ ] Environment Variables korrekt
- [ ] Performance prüfen (Lighthouse Score)
- [ ] Error Monitoring checken

---

## Nützliche Befehle

### Vercel CLI

```bash
# Login
vercel login

# Link zu Projekt
vercel link

# Environment Variables lokal herunterladen
vercel env pull

# Production Deployment
vercel --prod

# Preview Deployment
vercel

# Logs anzeigen
vercel logs [deployment-url]

# Projekt Info
vercel inspect [deployment-url]

# Alias setzen
vercel alias set [deployment-url] [domain]
```

### Project Info via API

```bash
# Projekt Details
curl "https://api.vercel.com/v9/projects/PROJECT_ID" \
  -H "Authorization: Bearer TOKEN"

# Latest Deployments
curl "https://api.vercel.com/v6/deployments?projectId=PROJECT_ID&limit=5" \
  -H "Authorization: Bearer TOKEN"

# Deployment Details
curl "https://api.vercel.com/v13/deployments/DEPLOYMENT_ID" \
  -H "Authorization: Bearer TOKEN"
```

---

## Ressourcen

- [Vercel Dokumentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel CLI Dokumentation](https://vercel.com/docs/cli)
- [Vercel API Dokumentation](https://vercel.com/docs/rest-api)
- [GitHub Integration](https://vercel.com/docs/git/vercel-for-github)

---

## Support

Bei Problemen:

1. **Vercel Logs prüfen:** Dashboard → Deployments → View Logs
2. **Lokalen Build testen:** `npm run build`
3. **Vercel Community:** [vercel.com/community](https://vercel.com/community)
4. **GitHub Issues:** Projektspezifische Issues

---

**Letzte Aktualisierung:** Januar 2026
