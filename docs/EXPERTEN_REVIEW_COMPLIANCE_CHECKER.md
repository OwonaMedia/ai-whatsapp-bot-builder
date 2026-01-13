# 🔍 EXPER TEN-REVIEW: META COMPLIANCE CHECKER
**Date:** 2025-01-XX  
**Reviewed by:** Compliance Expert, Legal Expert, Product Expert  
**Status:** 🔴 KRITISCH - Sofortige Implementierung erforderlich

---

## 📋 REVIEW-AUFTRAG

Design eines Compliance-Checkers für Meta WhatsApp Business API Richtlinien:
- Automatische Prüfung ob Bot Use-Case-spezifisch ist
- Warnung bei verdächtigen Patterns
- Best Practices Suggestions

---

## ⚖️ COMPLIANCE EXPERT REVIEW

### **✅ META-RICHTLINIEN (Ab 15. Jan 2026):**

#### **ERLAUBTE USE CASES:**
1. ✅ **Customer Service**
   - FAQ-Bots
   - Support-Tickets
   - Problembehandlung

2. ✅ **Booking & Reservations**
   - Terminbuchung
   - Restaurant-Reservierungen
   - Hotel-Buchungen

3. ✅ **E-Commerce**
   - Produktberatung
   - Bestellabwicklung
   - Status-Updates

4. ✅ **Information Services**
   - News-Updates
   - Event-Informationen
   - Kontakt-Informationen

#### **VERBOTENE USE CASES:**
1. ❌ **General Conversational AI**
   - ChatGPT-ähnliche Bots
   - Allgemeine Gespräche
   - "Free-form" Conversations

2. ❌ **Entertainment Bots**
   - Trivia-Bots
   - Story-Telling-Bots
   - General Chat

3. ❌ **AI Assistant (General)**
   - Personal Assistant
   - General Purpose AI

---

## 🤖 COMPLIANCE CHECKER DESIGN

### **1. Use-Case-Klassifizierung**

```typescript
enum UseCaseType {
  CUSTOMER_SERVICE = 'customer_service',
  BOOKING = 'booking',
  ECOMMERCE = 'ecommerce',
  INFORMATION = 'information',
  GENERAL = 'general', // ⚠️ WARNUNG
  ENTERTAINMENT = 'entertainment', // ❌ VERBOTEN
}

interface ComplianceCheck {
  useCaseType: UseCaseType;
  complianceScore: number; // 0-100
  warnings: string[];
  suggestions: string[];
  isCompliant: boolean;
}
```

---

### **2. Pattern Detection**

#### **A. AI Node Analysis:**
- **Prompt Analysis:**
  - ❌ "Du bist ein allgemeiner Assistent"
  - ❌ "Antworte auf alles"
  - ✅ "Du bist ein Kundenservice-Bot für..."
  - ✅ "Antworte nur zu Produkten"

#### **B. Flow Structure Analysis:**
- **General Conversation Patterns:**
  - ❌ Viele AI Nodes ohne klaren Use-Case
  - ❌ Keine spezifischen Endpunkte
  - ✅ Klare Use-Case-Struktur (Booking, Support, etc.)

#### **C. Knowledge Sources Analysis:**
- **Content Type:**
  - ❌ Allgemeine Wissensbasis (Wikipedia, etc.)
  - ✅ Produkt-spezifisch
  - ✅ Business-spezifisch

---

### **3. Compliance Score Calculation**

```typescript
function calculateComplianceScore(bot: Bot): ComplianceCheck {
  let score = 100;
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Check Use-Case Declaration
  if (!bot.useCase) {
    score -= 30;
    warnings.push('Kein Use-Case definiert');
    suggestions.push('Definiere einen spezifischen Use-Case');
  }

  // Check AI Prompts
  const aiNodes = bot.flow.nodes.filter(n => n.type === 'ai');
  for (const node of aiNodes) {
    const prompt = node.data.config.ai_prompt || '';
    
    if (prompt.includes('allgemein') || prompt.includes('general')) {
      score -= 20;
      warnings.push('AI-Prompt zu allgemein');
      suggestions.push('Spezifiziere den Use-Case im Prompt');
    }
    
    if (!prompt.includes('nur') && !prompt.includes('only')) {
      score -= 10;
      suggestions.push('Füge Einschränkungen hinzu (z.B. "antworte NUR zu Produkten")');
    }
  }

  // Check Flow Structure
  if (aiNodes.length > 3 && !bot.useCase) {
    score -= 15;
    warnings.push('Zu viele AI Nodes ohne klaren Use-Case');
    suggestions.push('Strukturiere den Flow mit spezifischen Nodes');
  }

  // Check Knowledge Sources
  const sources = bot.knowledgeSources || [];
  if (sources.length === 0 && aiNodes.length > 0) {
    score -= 10;
    suggestions.push('Füge Use-Case-spezifische Knowledge Sources hinzu');
  }

  return {
    useCaseType: determineUseCase(bot),
    complianceScore: Math.max(0, score),
    warnings,
    suggestions,
    isCompliant: score >= 70,
  };
}
```

---

## 📋 USE-CASE-TEMPLATES

### **Template 1: Customer Service Bot**

**AI Prompt Template:**
```
Du bist ein Kundenservice-Bot für [UNTERNEHMEN].
Antworte NUR zu Fragen über:
- Produkte und Dienstleistungen
- Bestellungen und Lieferungen
- Support-Anfragen
- Rückgaben und Umtausch

Bei Fragen außerhalb dieser Bereiche: Leite an menschlichen Support weiter.
```

**Flow Structure:**
- Trigger: Message Received
- Node 1: Welcome Message
- Node 2: FAQ Check
- Node 3: AI Node (Use-Case-spezifisch)
- Node 4: Support Ticket (wenn nötig)
- Node 5: End

**Compliance Score:** ✅ 95/100

---

### **Template 2: Booking Bot**

**AI Prompt Template:**
```
Du bist ein Buchungsassistent für [SERVICE].
Antworte NUR zu:
- Verfügbarkeit prüfen
- Termine buchen
- Buchungen ändern/stornieren
- Preise und Angebote

Bei anderen Fragen: Leite zur Website weiter.
```

**Flow Structure:**
- Trigger: Keyword "buchen" oder "termin"
- Node 1: Welcome & Verfügbarkeit prüfen
- Node 2: Question Node (Datum, Zeit)
- Node 3: Condition Node (Verfügbar?)
- Node 4: Booking Confirmation
- Node 5: End

**Compliance Score:** ✅ 98/100

---

## 🔧 IMPLEMENTIERUNG

### **1. Compliance Checker Service**

```typescript
// lib/compliance/checker.ts
export class ComplianceChecker {
  static async checkBot(bot: Bot): Promise<ComplianceCheck> {
    // 1. Use-Case-Klassifizierung
    const useCaseType = this.classifyUseCase(bot);
    
    // 2. Pattern Detection
    const patterns = this.detectPatterns(bot);
    
    // 3. Score Calculation
    const score = this.calculateScore(bot, useCaseType, patterns);
    
    // 4. Generate Warnings & Suggestions
    const warnings = this.generateWarnings(patterns);
    const suggestions = this.generateSuggestions(useCaseType, patterns);
    
    return {
      useCaseType,
      complianceScore: score,
      warnings,
      suggestions,
      isCompliant: score >= 70,
    };
  }
}
```

---

### **2. Dashboard Integration**

**Bot Edit Page:**
- ✅ Compliance Badge (✅ Compliant / ⚠️ Warning / ❌ Non-Compliant)
- ✅ Use-Case Selector (Dropdown)
- ✅ Compliance Score (0-100)
- ✅ Warnings & Suggestions Panel
- ✅ Best Practices Link

**Before Activation:**
- ⚠️ Warnung wenn nicht compliant
- ✅ Blockierung wenn score < 50
- ✅ Suggest Use-Case-Template

---

### **3. API Endpoint**

```typescript
// app/api/bots/[id]/compliance/route.ts
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const bot = await getBot(params.id);
  const check = await ComplianceChecker.checkBot(bot);
  return NextResponse.json(check);
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { useCase } = await request.json();
  await updateBotUseCase(params.id, useCase);
  const bot = await getBot(params.id);
  const check = await ComplianceChecker.checkBot(bot);
  return NextResponse.json(check);
}
```

---

## ✅ PRIORITÄT

| Feature | Priorität | Effort | Impact |
|---------|-----------|--------|--------|
| Use-Case Selector | 🔴 Kritisch | Niedrig | Sehr Hoch |
| Compliance Score | 🔴 Kritisch | Mittel | Sehr Hoch |
| Pattern Detection | 🟡 Hoch | Hoch | Hoch |
| Template Library | 🟡 Hoch | Mittel | Mittel |

---

## 🎯 SOFORT-IMPLEMENTIERUNG

### **Phase 1 (Diese Woche):**
1. ✅ Use-Case Dropdown im Bot-Editor
2. ✅ Basis Compliance-Check (Use-Case vorhanden?)
3. ✅ Warnung bei fehlendem Use-Case

### **Phase 2 (Nächste Woche):**
4. ✅ Pattern Detection für AI Prompts
5. ✅ Compliance Score Berechnung
6. ✅ Suggestions Engine

### **Phase 3 (Q2 2025):**
7. ✅ Use-Case Templates
8. ✅ Best Practices Library
9. ✅ Auto-Fix Suggestions

---

**Review durchgeführt:** 2025-01-XX  
**Status:** 🔴 **KRITISCH - Sofort implementieren**

