# n8n MCP Server - Intelligente Auswahl & Fallback-Strategie

## Übersicht

Wir haben zwei n8n MCP Server konfiguriert:
- **`n8n-mcp`** (STDIO): 19 Tools - Vollständige Verwaltung
- **`n8n-mcp-http`** (HTTP): 3 Tools - Workflow-Ausführung

## Automatische Server-Auswahl

### Tool-Mapping

#### STDIO-Server (`n8n-mcp`) - Primär für:
- ✅ **Workflow-Management**: `n8n_create_workflow`, `n8n_update_workflow`, `n8n_delete_workflow`
- ✅ **Workflow-Liste**: `n8n_list_workflows`
- ✅ **Workflow-Validierung**: `n8n_validate_workflow`, `n8n_autofix_workflow`
- ✅ **Node-Suche**: `search_nodes`, `get_node`
- ✅ **Template-Suche**: `search_templates`, `get_template`
- ✅ **Dokumentation**: `tools_documentation`
- ✅ **Health Checks**: `n8n_health_check`
- ✅ **Versionsverwaltung**: `n8n_workflow_versions`
- ✅ **Execution-Management**: `n8n_executions`
- ✅ **Webhook-Trigger**: `n8n_trigger_webhook_workflow`

#### HTTP-Server (`n8n-mcp-http`) - Fallback für:
- ✅ **Workflow-Suche**: `search_workflows` (wenn STDIO ausfällt)
- ✅ **Workflow-Ausführung**: `execute_workflow` (wenn STDIO ausfällt)
- ✅ **Workflow-Details**: `get_workflow_details` (wenn STDIO ausfällt)

## Fallback-Strategie

### Automatische Auswahl-Logik

1. **Primär**: Versuche immer zuerst `n8n-mcp` (STDIO)
2. **Fallback**: Bei Fehlern oder wenn nur Ausführung benötigt wird → `n8n-mcp-http`
3. **Fehlerbehandlung**: Wenn beide Server fehlschlagen → Fehlermeldung mit Details

### Tool-Verfügbarkeit

| Tool | STDIO | HTTP | Priorität |
|------|-------|------|-----------|
| Workflow erstellen | ✅ | ❌ | STDIO |
| Workflow aktualisieren | ✅ | ❌ | STDIO |
| Workflow löschen | ✅ | ❌ | STDIO |
| Workflows auflisten | ✅ | ❌ | STDIO |
| Workflow suchen | ✅ | ✅ | STDIO → HTTP |
| Workflow ausführen | ✅ | ✅ | STDIO → HTTP |
| Workflow-Details | ✅ | ✅ | STDIO → HTTP |
| Node-Suche | ✅ | ❌ | STDIO |
| Template-Suche | ✅ | ❌ | STDIO |
| Validierung | ✅ | ❌ | STDIO |
| Health Check | ✅ | ❌ | STDIO |

## HTTP-Server Erweiterung

### Aktueller Stand
Der HTTP-Server (`n8n-mcp-http`) nutzt n8n's native **MCP Server API**, die aktuell nur 3 Tools bereitstellt:
- `search_workflows`
- `execute_workflow`
- `get_workflow_details`

### Erweiterungsmöglichkeiten

#### Option 1: n8n MCP Server API erweitern (n8n-Seite)
- **Lokation**: n8n Workflow/Edge Function auf `automat.owona.de`
- **Endpoint**: `https://automat.owona.de/mcp-server/http`
- **Erforderlich**: n8n-Workflow anpassen, der die MCP Server API implementiert
- **Tools hinzufügen**: Weitere n8n Public API Calls als MCP Tools registrieren

#### Option 2: Custom MCP Server (Eigene Implementierung)
- **Lokation**: Eigener MCP Server (Node.js/Python)
- **Vorteil**: Volle Kontrolle über verfügbare Tools
- **Nachteil**: Mehr Wartungsaufwand

#### Option 3: n8n Public API direkt nutzen
- **Lokation**: Eigene API-Route im Frontend/Backend
- **Vorteil**: Direkter Zugriff auf alle n8n-Features
- **Nachteil**: Keine MCP-Integration

### Empfehlung: Option 1 (n8n MCP Server API erweitern)

**Schritte:**
1. n8n-Workflow finden, der `/mcp-server/http` bereitstellt
2. Weitere Tools zur MCP Server API hinzufügen:
   - `create_workflow` → n8n Public API: `POST /api/v1/workflows`
   - `update_workflow` → n8n Public API: `PUT /api/v1/workflows/:id`
   - `delete_workflow` → n8n Public API: `DELETE /api/v1/workflows/:id`
   - `list_workflows` → n8n Public API: `GET /api/v1/workflows`
   - `search_nodes` → n8n Public API: `GET /api/v1/nodes`
   - `get_node` → n8n Public API: `GET /api/v1/nodes/:name`
   - `search_templates` → n8n Public API: `GET /api/v1/templates`
   - `validate_workflow` → n8n Public API: `POST /api/v1/workflows/validate`

3. Tools in MCP Server API registrieren (JSON Schema)

## Implementierung: Intelligente Server-Auswahl

### Als AI-Assistent wähle ich automatisch:

```typescript
// Pseudocode für Server-Auswahl
function selectN8nServer(desiredTool: string): 'n8n-mcp' | 'n8n-mcp-http' {
  // Tools, die nur STDIO unterstützt
  const stdioOnlyTools = [
    'n8n_create_workflow',
    'n8n_update_workflow',
    'n8n_delete_workflow',
    'n8n_list_workflows',
    'search_nodes',
    'get_node',
    'search_templates',
    'get_template',
    'validate_node',
    'validate_workflow',
    'n8n_health_check',
    'n8n_workflow_versions',
    'n8n_executions',
    'n8n_trigger_webhook_workflow',
    'tools_documentation'
  ];
  
  // Tools, die beide unterstützen (mit Fallback)
  const bothServersTools = [
    'search_workflows',      // STDIO: n8n_list_workflows, HTTP: search_workflows
    'execute_workflow',      // STDIO: n8n_trigger_webhook_workflow, HTTP: execute_workflow
    'get_workflow_details'   // STDIO: n8n_get_workflow, HTTP: get_workflow_details
  ];
  
  if (stdioOnlyTools.includes(desiredTool)) {
    return 'n8n-mcp'; // Nur STDIO möglich
  }
  
  if (bothServersTools.includes(desiredTool)) {
    return 'n8n-mcp'; // Primär STDIO, HTTP als Fallback
  }
  
  // Default: STDIO
  return 'n8n-mcp';
}
```

### Fehlerbehandlung mit Fallback

```typescript
async function executeWithFallback(tool: string, params: any) {
  try {
    // Versuche STDIO-Server
    return await callTool('n8n-mcp', tool, params);
  } catch (stdioError) {
    // Prüfe, ob Tool im HTTP-Server verfügbar ist
    const httpCompatibleTools = ['search_workflows', 'execute_workflow', 'get_workflow_details'];
    
    if (httpCompatibleTools.includes(tool)) {
      try {
        // Fallback zu HTTP-Server
        return await callTool('n8n-mcp-http', tool, params);
      } catch (httpError) {
        throw new Error(`Both servers failed: STDIO: ${stdioError.message}, HTTP: ${httpError.message}`);
      }
    } else {
      throw stdioError; // Tool nicht im HTTP-Server verfügbar
    }
  }
}
```

## Nächste Schritte

### 1. HTTP-Server erweitern (Empfohlen)
- [ ] n8n-Workflow für `/mcp-server/http` finden
- [ ] Weitere Tools zur MCP Server API hinzufügen
- [ ] Tools testen und validieren

### 2. Monitoring & Logging
- [ ] Server-Auswahl loggen
- [ ] Fallback-Events tracken
- [ ] Performance-Metriken sammeln

### 3. Dokumentation aktualisieren
- [ ] Tool-Mapping dokumentieren
- [ ] Fallback-Strategie dokumentieren
- [ ] Erweiterte Tools dokumentieren

## Zusammenfassung

✅ **Beide Server sind konfiguriert und funktionsfähig**
✅ **Automatische Server-Auswahl basierend auf Tool-Verfügbarkeit**
✅ **Fallback-Strategie für kritische Operationen**
🔄 **HTTP-Server kann erweitert werden (n8n-Seite erforderlich)**

Die intelligente Auswahl erfolgt automatisch durch den AI-Assistenten basierend auf:
- Tool-Verfügbarkeit
- Server-Status
- Fehlerbehandlung

