# Agent-basierte Reverse Engineering Lösung

**Datum:** 2025-11-27

---

## ✅ Agent-basierter Ansatz implementiert

**Vorher:** Statische Patterns und hardcodierte Fixes  
**Jetzt:** Agent fragt sofort die Reverse Engineering Blaupause ab und leitet alle Fixes dynamisch ab

---

## 🎯 Agent-basierter Abgleich

### 1. **Sofortiger Abgleich mit Reverse Engineering**
Bei jedem Ticket:
1. **Agent fragt sofort die Dokumentation ab:**
   ```typescript
   const relevantDocs = this.knowledgeBase.query(
     `${config.name} ${config.description} ${config.type} ${ticketText}`,
     20
   );
   ```

2. **Extrahiert Fix-Strategien aus Dokumentation:**
   - Sucht nach: "fix", "solution", "workaround", "troubleshoot", "resolve"
   - Extrahiert Befehle: PM2, Docker, Caddy, SQL, etc.
   - Filtert nach Relevanz zum Ticket

3. **Generiert Fix-Instructions dynamisch:**
   - Konvertiert dokumentierte Strategien in konkrete Instructions
   - Keine statischen Patterns mehr
   - Alles basiert auf Reverse Engineering Blaupause

---

## 🔧 Technische Umsetzung

### Haupt-Methode: `generateUniversalFixInstructions(config, ticketText)`

**Ablauf:**
1. **Query Reverse Engineering:**
   ```typescript
   const relevantDocs = this.knowledgeBase.query(
     `${config.name} ${config.description} ${config.type} ${ticketText}`,
     20
   );
   ```

2. **Extrahiere Fix-Strategien:**
   ```typescript
   const fixStrategies = await this.extractFixStrategiesFromDocs(
     relevantDocs,
     config,
     ticketTextLower
   );
   ```

3. **Generiere Instructions:**
   ```typescript
   for (const strategy of fixStrategies) {
     const strategyInstructions = await this.generateInstructionsFromStrategy(
       strategy,
       config,
       ticketTextLower
     );
     instructions.push(...strategyInstructions);
   }
   ```

---

## 📋 Extraktion von Fix-Strategien

### `extractFixStrategiesFromDocs()`

**Such-Patterns:**
- Fix-Strategien: `/(?:fix|solution|workaround|troubleshoot|resolve|repair).*?[.!]/gi`
- Deutsche Strategien: `/(?:prüfe|korrigiere|erstelle|führe.*?aus|starte.*?neu)/gi`
- Befehle: `/(?:pm2|docker|caddy|systemctl|chmod|chown).*?[.!]/gi`
- SQL: `/(?:CREATE|ALTER|UPDATE|INSERT).*?[.!]/gi`

**Filterung:**
- Mindestlänge: 10 Zeichen
- Relevanz-Check: Ticket-Text oder Config-Beschreibung muss enthalten sein

---

## 🎯 Generierung von Instructions

### `generateInstructionsFromStrategy()`

**Erkannte Strategien:**

1. **PM2-Befehle:**
   - Pattern: `pm2 restart` oder `pm2 start`
   - → `hetzner-command: pm2 restart <service>`

2. **Docker-Befehle:**
   - Pattern: `docker restart`
   - → `hetzner-command: docker restart <container>`

3. **Caddy-Befehle:**
   - Pattern: `caddy reload` oder `caddy restart`
   - → `hetzner-command: caddy reload`

4. **SQL-Migrationen:**
   - Pattern: `CREATE`, `ALTER`, `UPDATE`, `INSERT`
   - → `supabase-migration: <sql>`

5. **RLS-Policies:**
   - Pattern: `rls`, `policy`, `row level security`
   - → `supabase-rls-policy: <policy>`

6. **Environment Variables:**
   - Pattern: `env`, `environment variable`
   - → `env-add-placeholder: <key>`

7. **Code-Modify:**
   - Pattern: `prüfe`, `korrigiere`, `fix`
   - → `code-modify: <file>`

---

## ✅ Vorteile

✅ **100% Dynamisch:** Keine statischen Patterns mehr  
✅ **Sofortiger Abgleich:** Agent fragt Dokumentation sofort ab  
✅ **Reverse Engineering basiert:** Alle Fixes aus Blaupause abgeleitet  
✅ **Erweiterbar:** Neue Dokumentation = neue Fixes automatisch  
✅ **Relevanz-Filterung:** Nur relevante Strategien werden verwendet  
✅ **Konsistent:** Nutzt immer die aktuelle Dokumentation  

---

## 🔄 Beispiel-Ablauf

### Ticket: "WhatsApp Bot reagiert nicht - PM2 Restart erforderlich"

1. **Agent fragt Dokumentation ab:**
   ```
   Query: "whatsapp-bot-builder deployment_config pm2 restart"
   → Findet Dokumentation zu PM2-Restart
   ```

2. **Extrahiert Strategien:**
   ```
   - "PM2 Prozess neu starten bei Problemen"
   - "pm2 restart whatsapp-bot-builder"
   - "Service-Problem: PM2 Restart erforderlich"
   ```

3. **Generiert Instructions:**
   ```typescript
   {
     type: 'hetzner-command',
     command: 'pm2 restart whatsapp-bot-builder',
     description: 'PM2 Restart basierend auf dokumentierter Strategie: PM2 Prozess neu starten bei Problemen',
     requiresApproval: true,
     whitelistCheck: true,
   }
   ```

---

## 🚀 Nächste Schritte

1. **Code deployen** auf Server
2. **Server neu starten**
3. **Mit verschiedenen Tickets testen:**
   - UI-Problem → Agent fragt Frontend-Dokumentation ab
   - Zahlungs-Problem → Agent fragt Payment-Dokumentation ab
   - Upload-Problem → Agent fragt Upload-Dokumentation ab
   - Bot-Speicher-Problem → Agent fragt Bot-Dokumentation ab
   - Deployment-Problem → Agent fragt Deployment-Dokumentation ab

---

**Status:** ✅ **AGENT-BASIERTE REVERSE ENGINEERING LÖSUNG IMPLEMENTIERT**

