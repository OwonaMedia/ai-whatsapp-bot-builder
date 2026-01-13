# 🤖 Bot Flow Execution Engine

## Übersicht

Die Flow Execution Engine führt Bot-Flows automatisch aus, basierend auf eingehenden WhatsApp-Nachrichten.

## Architektur

### **State Machine Pattern**
```typescript
interface ConversationState {
  conversationId: string;
  botId: string;
  currentNodeId: string | null;
  context: Record<string, any>;
  variables: Record<string, any>;
  history: NodeExecution[];
}
```

### **Flow Traversal**
1. **Find Trigger Node** → Start Flow
2. **Execute Current Node** → Perform Action
3. **Determine Next Node** → Based on Edges
4. **Update State** → Save Progress
5. **Continue or End** → Loop or Terminate

## Node Execution

### **1. Trigger Node**
```typescript
// Trigger Types:
// - 'message_received' → Start bei jeder Nachricht
// - 'keyword' → Start bei Keyword-Match
// - 'always' → Immer starten
```

**Execution:**
- Prüft Trigger-Bedingungen
- Startet Flow wenn Bedingung erfüllt
- Weiter zu nächstem Node

### **2. Message Node**
```typescript
config: {
  message_text: "Willkommen!",
  error_handling: "continue" | "end" | "redirect"
}
```

**Execution:**
1. Sendet Text-Nachricht via WhatsApp API
2. Speichert Message in Database
3. Wartet auf Delivery (optional)
4. Weiter zu nächstem Node

### **3. Question Node**
```typescript
config: {
  question_text: "Wie können wir helfen?",
  options: [
    { id: "help", label: "Hilfe", value: "help" },
    { id: "info", label: "Info", value: "info" }
  ],
  allow_custom_response: false
}
```

**Execution:**
1. Sendet Frage mit Buttons (max. 3)
2. Falls >3 Options: Text-Message
3. **Pausiert Flow** → Wartet auf User-Response
4. Weiter zu nächstem Node basierend auf Antwort

### **4. Condition Node**
```typescript
config: {
  condition_type: "equals" | "contains" | "greater_than" | "less_than",
  condition_field: "last_message" | "variable_name",
  condition_value: "value_to_compare"
}
```

**Execution:**
1. Liest Wert aus State (last_message oder variable)
2. Prüft Bedingung
3. Route zu TRUE oder FALSE Branch
4. Weiter zu entsprechendem Node

### **5. AI Node**
```typescript
config: {
  ai_prompt: "System prompt",
  ai_model: "groq" | "openai" | "gemini",
  use_context: true
}
```

**Execution:**
1. Baut Context aus Conversation History
2. Ruft GROQ API auf
3. Generiert AI-Response
4. Sendet Response
5. Weiter zu nächstem Node

### **6. End Node**
```typescript
// Beendet Conversation
```

**Execution:**
1. Markiert Conversation als "completed"
2. Speichert finalen State
3. Beendet Flow

## Flow Examples

### **Beispiel 1: Einfacher Welcome Flow**
```
[Trigger] → [Message: "Hallo!"] → [Message: "Wie geht's?"] → [End]
```

### **Beispiel 2: Frage mit Options**
```
[Trigger] → [Question: "Brauchen Sie Hilfe?"]
   ↓ YES                    ↓ NO
[Message: "Gerne!"]    [Message: "OK, Tschüss!"]
   ↓                        ↓
[End]                    [End]
```

### **Beispiel 3: Mit AI**
```
[Trigger] → [Message: "Hallo!"] → [AI Node] → [End]
```

### **Beispiel 4: Mit Conditions**
```
[Trigger] → [Message] → [Condition: contains "help"]
   ↓ TRUE                    ↓ FALSE
[AI Node]              [Message: "Unbekannt"]
   ↓                        ↓
[End]                    [End]
```

## State Management

### **Variables**
```typescript
state.variables = {
  userName: "Max",
  userChoice: "help",
  counter: 5
}
```

### **Context**
```typescript
state.context = {
  lastMessage: "Hallo",
  messageCount: 3,
  sessionStart: "2025-01-01T10:00:00Z"
}
```

### **History**
```typescript
state.history = [
  { nodeId: "trigger-1", timestamp: "..." },
  { nodeId: "message-1", timestamp: "..." },
  { nodeId: "ai-1", timestamp: "..." }
]
```

## Error Handling

### **Node Execution Errors**
- **Error Handling Config:** `continue` | `end` | `redirect`
- **Default:** Continue to next node
- **Error Messages:** Konfigurierbar pro Node

### **API Failures**
- **GROQ API:** Fallback message
- **WhatsApp API:** Retry mit Exponential Backoff
- **Database Errors:** Log & Alert

### **Infinite Loop Prevention**
- Max 100 Iterations per Flow
- Loop-Detection
- Automatic termination

## Performance

### **Optimization**
- State Caching
- Batch Database Updates
- Async Message Sending
- Connection Pooling

### **Scaling**
- Horizontal Scaling möglich
- State ist in Database gespeichert
- Stateless Execution (State aus DB)

## Testing

### **Test Flow**
```typescript
const flow: BotFlow = {
  name: "Test Flow",
  nodes: [...],
  edges: [...]
};

const executor = new FlowExecutor(flow, state, client, phoneNumber);
await executor.execute();
```

### **Mock WhatsApp Client**
```typescript
class MockWhatsAppClient extends WhatsAppClient {
  async sendTextMessage(to: string, text: string) {
    console.log(`Mock: Sending to ${to}: ${text}`);
    return { messaging_product: 'whatsapp', contacts: [], messages: [{ id: 'mock' }] };
  }
}
```

---

**Letzte Aktualisierung:** 2025-01-XX

