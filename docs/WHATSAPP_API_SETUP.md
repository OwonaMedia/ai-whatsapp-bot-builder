# 📱 WhatsApp Business API Setup

## Übersicht

Die WhatsApp Business API Integration ermöglicht es, Nachrichten über WhatsApp zu senden und zu empfangen, sowie Bot-Flows automatisch auszuführen.

## Setup

### **1. WhatsApp Business Account erstellen**

#### **Option A: Meta Cloud API (Direkt)**
1. Erstellen Sie ein [Meta Developer Account](https://developers.facebook.com/)
2. Erstellen Sie eine neue App → "Business" Typ
3. Fügen Sie "WhatsApp" Product hinzu
4. Erhalten Sie:
   - **Phone Number ID**
   - **Access Token** (Temporary: 24h, Permanent: App Token)
   - **App Secret** (für Webhook-Verifizierung)

#### **Option B: Business Solution Provider (BSP)**
Empfohlene BSPs:
- **360dialog** - Schneller Support, Marketing-Automatisierung
- **Twilio** - Enterprise-Lösung
- **MessageBird** - Global verfügbar
- **Vonage** - Flexible Pricing

### **2. Environment Variables**

```env
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_APP_SECRET=your_app_secret
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_WEBHOOK_SECRET=your_webhook_secret
WHATSAPP_SALT=random_salt_for_hashing
WHATSAPP_API_VERSION=v18.0
```

### **3. Webhook konfigurieren**

1. **Webhook URL:** `https://whatsapp.owona.de/api/webhooks/whatsapp`
2. **Verify Token:** Verwenden Sie `WHATSAPP_VERIFY_TOKEN`
3. **Webhook Fields:** 
   - `messages`
   - `message_status`
   - `message_template_status`

4. **In Meta Developer Console:**
   - WhatsApp → Configuration → Webhook
   - URL eingeben
   - Verify Token eintragen
   - Webhook abonnieren

### **4. Migration ausführen**

Führen Sie die Migration `004_conversation_state.sql` in Supabase aus:
- Conversation State Management
- State Storage
- Performance-Indizes

## Message Sending

### **Text Message**
```typescript
const client = new WhatsAppClient();
await client.sendTextMessage('+491234567890', 'Hallo!');
```

### **Interactive Buttons**
```typescript
await client.sendInteractiveMessage(
  '+491234567890',
  'Wie können wir Ihnen helfen?',
  [
    { id: 'help', title: 'Hilfe' },
    { id: 'info', title: 'Info' },
  ]
);
```

### **Template Message**
```typescript
await client.sendTemplateMessage(
  '+491234567890',
  'welcome_template',
  'de'
);
```

## Flow Execution

### **Automatischer Flow-Start**
1. User sendet Nachricht an Bot
2. Webhook empfängt Nachricht
3. System findet Bot & aktiven Flow
4. Flow Executor startet automatisch
5. Nodes werden nacheinander ausgeführt

### **Node-Typen**

**Trigger Node:**
- Startet Flow bei eingehender Nachricht
- Konfigurierbare Trigger (keyword, always)

**Message Node:**
- Sendet Text-Nachricht
- Wartet auf Delivery
- Fährt zu nächstem Node fort

**Question Node:**
- Sendet Frage mit Buttons/Options
- Pausiert Flow bis User antwortet
- Route basierend auf Antwort

**Condition Node:**
- Prüft Bedingung (equals, contains, etc.)
- Route zu TRUE oder FALSE Branch

**AI Node:**
- Generiert Antwort mit GROQ API
- Nutzt Conversation Context
- Sendet AI-Response

**End Node:**
- Beendet Conversation
- Markiert als completed

## Conversation Window

### **24h Window**
- Innerhalb 24h nach User-Nachricht: Freie Messages
- Außerhalb 24h: Nur Template Messages

### **Window Tracking**
Das System trackt automatisch:
- Letzte User-Nachricht
- Window-Status
- Template-Requirements

## Error Handling

### **Rate Limits**
- **429 Too Many Requests** → Queue & Retry
- **1000 conversations/24h** (Tier 1)
- **80 requests/second**

### **Token Refresh**
- Temporary Tokens: 24h Gültigkeit
- Automatischer Refresh empfohlen
- Permanent Tokens: App Token

### **Message Failures**
- Automatisches Retry mit Exponential Backoff
- Error-Logging in Database
- Fallback-Messages bei kritischen Fehlern

## Security

### **Webhook Verification**
- Signature Verification (`X-Hub-Signature-256`)
- Verify Token für GET requests
- HTTPS only

### **Phone Number Hashing**
- SHA-256 Hash für Privacy
- Salt-basierte Hashes
- DSGVO-konform

## Testing

### **Test-Number**
- Meta bietet Test-Nummern für Development
- Limitierte Anzahl von Messages
- Keine Kosten

### **Webhook Testing**
```bash
# Verify Token Test
curl "https://whatsapp.owona.de/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE"
```

## Best Practices

1. ✅ **Always verify webhook signatures**
2. ✅ **Handle rate limits gracefully**
3. ✅ **Use templates for messages outside 24h window**
4. ✅ **Store all messages for compliance**
5. ✅ **Monitor conversation windows**
6. ✅ **Implement retry logic**
7. ✅ **Log all API calls for debugging**

---

**Letzte Aktualisierung:** 2025-01-XX

