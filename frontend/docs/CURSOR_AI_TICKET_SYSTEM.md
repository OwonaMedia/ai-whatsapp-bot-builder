# Cursor AI Ticket-System Integration

## Übersicht

Ab sofort werden alle Probleme, die von Cursor AI identifiziert und gelöst werden, automatisch als Support-Tickets dokumentiert. Dies nutzt das **BESTEHENDE Ticket-System** unter `/intern` und verbessert es durch:

1. **Automatische Dokumentation** aller behobenen Probleme
2. **Nachvollziehbarkeit** der Änderungen
3. **Verbesserung des Ticket-Systems** durch reale Nutzung

## Bestehendes System

Das Ticket-System besteht aus:
- **Frontend**: `/intern` - Internes Support-Portal
- **API**: `/api/support-tickets` - REST API für Ticket-Erstellung
- **Backend**: Supabase `support_tickets` und `support_ticket_messages` Tabellen
- **MCP Server**: `support-mcp-server` - Automatische Ticket-Verarbeitung (Tier-1/Tier-2)

## Architektur

### 1. Utility-Funktion: `lib/support/createTicket.ts`

Programmatische Funktion zum Erstellen von Support-Tickets ohne Benutzer-Authentifizierung.
**Nutzt das bestehende System** - Tickets sind im internen Portal unter `/intern` sichtbar.

```typescript
import { createSupportTicket } from '@/lib/support/createTicket';

const result = await createSupportTicket({
  category: 'bug',
  title: 'Problem-Beschreibung',
  description: 'Detaillierte Beschreibung...',
  sourceMetadata: {
    source: 'cursor_ai',
    component: 'ComponentName.tsx',
    severity: 'medium',
    fixed: true,
  },
  locale: 'de',
});
```

### 2. Bestehende API-Route: `/api/support-tickets` (POST)

**Bereits vorhanden!** Die bestehende API-Route kann verwendet werden:

```bash
curl -X POST https://whatsapp.owona.de/api/support-tickets \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-xxx-auth-token=..." \
  -d '{
    "category": "bug",
    "title": "Problem-Beschreibung",
    "description": "Detaillierte Beschreibung...",
    "sourceMetadata": {
      "source": "cursor_ai",
      "component": "ComponentName.tsx"
    }
  }'
```

**Hinweis:** Diese Route erfordert Authentifizierung. Für Cursor AI verwende die Utility-Funktion `createSupportTicket()`.

### 3. Script: `scripts/create-ticket.ts`

Standalone-Script zum Erstellen von Tickets (für lokale Entwicklung).

```bash
npx tsx scripts/create-ticket.ts
```

## Verwendung in Cursor AI

### Workflow

1. **Problem identifizieren**: Cursor AI erkennt ein Problem
2. **Ticket erstellen**: Automatisch ein Ticket mit vollständiger Dokumentation erstellen
3. **Problem lösen**: Lösung implementieren
4. **Ticket aktualisieren**: Status auf "behoben" setzen, Lösung dokumentieren

### Beispiel

```typescript
// 1. Ticket erstellen
const ticket = await createSupportTicket({
  category: 'bug',
  title: 'WhatsApp-Link Button vertauscht',
  description: 'Problem-Beschreibung...',
  sourceMetadata: {
    source: 'cursor_ai',
    component: 'EmbedCodeGenerator.tsx',
    severity: 'medium',
  },
});

// 2. Problem lösen
// ... Code-Änderungen ...

// 3. Ticket-Update (optional, via Support-System)
// Das MCP Support-System erkennt automatisch, wenn ein Problem behoben wurde
```

## Ticket-Kategorien

- **bug**: Technische Fehler
- **billing**: Zahlungs- und Abrechnungsprobleme
- **integration**: Integrationsprobleme (WhatsApp, Stripe, etc.)
- **ux**: Benutzerfreundlichkeitsprobleme
- **other**: Sonstige Probleme

## Source Metadata

Empfohlene Felder in `sourceMetadata`:

```typescript
{
  source: 'cursor_ai',           // Immer 'cursor_ai' für automatisch erstellte Tickets
  component: 'ComponentName.tsx', // Betroffene Komponente
  severity: 'low' | 'medium' | 'high' | 'critical',
  affectedFeature: 'feature-name', // Betroffenes Feature
  fixed: true | false,            // Ob das Problem bereits behoben wurde
  fixedAt: '2025-01-01T00:00:00Z', // ISO-Timestamp
  filesChanged: ['path/to/file.ts'], // Geänderte Dateien
}
```

## Integration mit bestehendem MCP Support-System

Das **bestehende** MCP Support-System (`support-mcp-server`) überwacht automatisch neue Tickets und:

1. **Tier-1 Automation**: Erstellt automatische Antworten (bereits implementiert)
2. **Tier-2 Escalation**: Leitet komplexe Probleme an spezialisierte Agenten weiter (bereits implementiert)
3. **Auto-Fix Pipeline**: Erkennt bekannte Muster und wendet automatische Fixes an (bereits implementiert)

**Alle Tickets**, die von Cursor AI erstellt werden, werden automatisch vom MCP-System verarbeitet!

## Best Practices

1. **Immer Tickets erstellen**: Für jedes identifizierte Problem ein Ticket erstellen
2. **Vollständige Dokumentation**: Problem, Ursache, Lösung und getestete Szenarien dokumentieren
3. **Source Metadata**: Immer `source: 'cursor_ai'` setzen für automatisch erstellte Tickets
4. **Status aktualisieren**: Nach erfolgreicher Lösung den Status auf "behoben" setzen

## Vorteile

1. **Transparenz**: Alle Änderungen sind nachvollziehbar
2. **Wissensbasis**: Tickets werden zur Wissensbasis für zukünftige Probleme
3. **System-Verbesserung**: Reale Nutzung verbessert das Ticket-System kontinuierlich
4. **Automatisierung**: MCP-System kann bekannte Probleme automatisch lösen

## Nächste Schritte

1. ✅ Utility-Funktion erstellt
2. ✅ API-Route erstellt
3. ✅ Script erstellt
4. ⏳ Integration in Cursor AI Workflow
5. ⏳ Automatische Ticket-Erstellung bei Problem-Erkennung
6. ⏳ Automatische Status-Updates nach Lösung

---

**Erstellt:** 2025-01-XX  
**Status:** ✅ Implementiert  
**Version:** 1.0.0

