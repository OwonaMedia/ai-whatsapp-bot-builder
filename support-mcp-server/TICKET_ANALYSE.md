# Ticket-Analyse: WhatsApp Bot läuft nicht - PM2 Restart erforderlich

**Ticket ID:** `e8e0e5dc-82ad-402f-bc5a-cb83ed70d21b`  
**Datum:** 2025-11-27 17:44:20 UTC

---

## 🔍 Aktueller Status

### ✅ Was funktioniert hat:
1. **Ticket wurde erstellt** ✅
2. **Auto-Acknowledgement wurde gesendet** ✅
3. **Problem-Verifikation wurde durchgeführt** ✅
4. **Reverse Engineering wurde ausgeführt** ✅

### ❌ Was nicht funktioniert hat:
1. **AutoFix hat falsches Pattern erkannt:**
   - Erkannt: `config-api_endpoint-/api/webhooks/whatsapp`
   - Erwartet: `hetzner-command` mit `pm2 restart whatsapp-bot-builder`

2. **Keine Telegram-Bestätigung:**
   - Keine `support_automation_events` Einträge
   - Keine n8n Executions nach Ticket-Erstellung

3. **Ticket-Status zurückgesetzt:**
   - Von `new` → `waiting_customer`
   - AutoFix hat keine Lösung gefunden

---

## 🐛 Root Cause

**Problem:** Es gibt kein Pattern in `autopatchPatterns.ts`, das "PM2 Restart" oder "Hetzner-Befehl" in der Ticket-Beschreibung erkennt.

**Aktuelle Patterns:**
- `missing-translation` - erkennt MISSING_MESSAGE
- `type-error-null-guard` - erkennt Null/Undefined Fehler
- `reference-error-missing-import` - erkennt ReferenceError
- `config-api_endpoint-*` - erkennt fehlende API-Routen
- **KEIN Pattern für PM2/Hetzner-Befehle** ❌

**Was passiert ist:**
1. Ticket wurde erstellt mit Beschreibung: "PM2 Prozess neu starten"
2. AutoFix hat nach Patterns gesucht
3. Pattern `config-api_endpoint-/api/webhooks/whatsapp` wurde gefunden (falsch!)
4. AutoFix hat versucht, eine API-Route zu erstellen (falsche Lösung)
5. Keine AutoFix-Instructions für Hetzner-Befehl wurden erstellt
6. Ticket wurde auf `waiting_customer` zurückgesetzt

---

## 💡 Lösung

### Option 1: Pattern für PM2/Hetzner-Befehle hinzufügen (Empfohlen)

**Neues Pattern in `autopatchPatterns.ts` hinzufügen:**

```typescript
{
  id: 'pm2-restart-required',
  match: (_ticket, text) => {
    // Erkenne PM2 Restart-Anfragen
    const pm2Match = text.match(/(?:pm2|PM2).*?(?:restart|neu starten|neustart)/i);
    const hetznerMatch = text.match(/(?:hetzner|server|server-befehl).*?(?:restart|neustart|neu starten)/i);
    
    if (!pm2Match && !hetznerMatch) {
      return null;
    }

    // Extrahiere App-Namen (falls vorhanden)
    const appNameMatch = text.match(/(?:pm2|PM2).*?restart.*?(\w+)/i);
    const appName = appNameMatch ? appNameMatch[1] : 'whatsapp-bot-builder';

    const summary = `Autopatch: PM2 Prozess "${appName}" neu starten.`;
    
    return {
      patternId: 'pm2-restart-required',
      summary,
      actions: [],
      customerMessage: 'Wir starten den PM2 Prozess neu, um das Problem zu beheben.',
      autoFixInstructions: [
        {
          type: 'hetzner-command',
          command: `pm2 restart ${appName}`,
          description: `PM2 Prozess "${appName}" neu starten`,
          requiresApproval: true,
          whitelistCheck: true,
        },
      ],
    };
  },
}
```

### Option 2: LLM-Client nutzen (Falls verfügbar)

Der LLM-Client sollte in der Lage sein, "PM2 Restart" in der Beschreibung zu erkennen und einen `hetzner-command` vorzuschlagen.

**Prüfe:** Wird der LLM-Client für Resolution Plans verwendet?

---

## 🔧 Nächste Schritte

### Sofort-Lösung (Manuell):
1. **Ticket-Status auf `new` setzen** (bereits gemacht)
2. **Pattern hinzufügen** (siehe Option 1)
3. **Support-MCP-Server neu starten:**
   ```bash
   pm2 restart support-mcp-server
   ```
4. **Ticket erneut verarbeiten lassen**

### Langfristige Lösung:
1. **Pattern für PM2/Hetzner-Befehle hinzufügen**
2. **Pattern für Docker-Befehle hinzufügen**
3. **Pattern für Caddy-Befehle hinzufügen**
4. **Pattern für systemctl-Befehle hinzufügen**

---

## 📋 Test-Plan

Nach Hinzufügen des Patterns:

1. **Neues Test-Ticket erstellen:**
   ```
   Titel: WhatsApp Bot läuft nicht - PM2 Restart erforderlich
   Beschreibung: PM2 Prozess whatsapp-bot-builder muss neu gestartet werden
   ```

2. **Erwartetes Ergebnis:**
   - Pattern `pm2-restart-required` wird erkannt
   - AutoFix-Instruction: `hetzner-command` mit `pm2 restart whatsapp-bot-builder`
   - Telegram-Bestätigung wird angefordert
   - Nach Bestätigung: Befehl wird ausgeführt

---

**Status:** ⚠️ **PATTERN FEHLT - MUSS HINZUGEFÜGT WERDEN**

