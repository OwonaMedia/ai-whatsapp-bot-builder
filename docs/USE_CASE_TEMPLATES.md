# 📋 Use-Case Templates

## Übersicht

Vorgefertigte Flow-Templates für verschiedene Business-Use-Cases, die Meta WhatsApp Richtlinien entsprechen.

---

## ✅ Verfügbare Templates

### **1. Kundenservice Bot** 💬
**Use-Case:** `customer_service`

**Features:**
- Welcome Message
- FAQ AI Node (mit Knowledge Sources)
- Zufriedenheitsfrage
- Support-Weiterleitung
- Compliant AI Prompt

**Flow-Struktur:**
```
Trigger → Welcome → AI FAQ → Satisfaction Question → End/Support
```

**Empfohlene Knowledge Sources:**
- FAQ-Dokument
- Produktkatalog
- Rückgabebedingungen
- Versandinformationen

**Compliance Score:** ✅ 95/100

---

### **2. Buchungs-Bot** 📅
**Use-Case:** `booking`

**Features:**
- Keyword-Trigger ("buchen")
- Service-Auswahl
- Datum-Abfrage
- Uhrzeit-Auswahl
- Bestätigung

**Flow-Struktur:**
```
Trigger → Welcome → Service Selection → Date → Time → Confirmation → End
```

**Empfohlene Knowledge Sources:**
- Service-Beschreibungen
- Preisliste
- Öffnungszeiten
- Stornierungsbedingungen

**Compliance Score:** ✅ 98/100

---

### **3. E-Commerce Bot** 🛒
**Use-Case:** `ecommerce`

**Features:**
- Welcome Message
- Hauptmenü (Produkte, Bestellung, Tracking, Rückgabe)
- Produktberatung AI
- Bestell-Flow
- Tracking-Info
- Rückgabe-Info

**Flow-Struktur:**
```
Trigger → Welcome → Main Menu → [Products AI | Order | Tracking | Return] → End
```

**Empfohlene Knowledge Sources:**
- Produktkatalog
- Preisliste
- Lieferinformationen
- Rückgabebedingungen

**Compliance Score:** ✅ 92/100

---

### **4. Informations-Bot** 📰
**Use-Case:** `information`

**Features:**
- Welcome Message
- Hauptmenü (News, Events, Kontakt)
- Informations-AI
- Context-basierte Antworten

**Flow-Struktur:**
```
Trigger → Welcome → Main Menu → AI Information → End
```

**Empfohlene Knowledge Sources:**
- Aktuelle News
- Event-Kalender
- Kontaktinformationen
- Über uns

**Compliance Score:** ✅ 90/100

---

## 🔧 Template-Personalisation

### **Placeholder-Ersetzung:**
Templates enthalten Platzhalter, die automatisch ersetzt werden:
- `[UNTERNEHMEN]` → Bot Name oder Company Name
- `[ORGANISATION]` → Bot Name oder Company Name
- `[SERVICE]` → Bot Name oder Company Name

### **Customization:**
```typescript
import { customizeTemplate, getTemplateByUseCase } from '@/lib/templates/useCaseTemplates';

const template = getTemplateByUseCase('customer_service');
const customizedFlow = customizeTemplate(template, 'Mein Bot', 'Meine Firma');
```

---

## 📊 Compliance-Features

### **Alle Templates sind:**
- ✅ Meta-compliant (Use-Case-spezifisch)
- ✅ Strukturiert (keine generellen Gespräche)
- ✅ Klar definiert (spezifische Funktionen)
- ✅ Best Practices (AI Prompts mit Einschränkungen)

---

## 🚀 Usage

### **Im Bot Editor:**
1. Bot erstellen/bearbeiten
2. "Template auswählen" klicken
3. Template wählen
4. Optional: Firmenname eingeben
5. "Template laden" klicken
6. Flow wird geladen und kann angepasst werden

### **Via API:**
```typescript
// GET Template
GET /api/bots/[id]/templates
→ Returns template based on bot use_case

// POST Apply Template
POST /api/bots/[id]/templates
Body: { templateId: 'customer_service', companyName: 'Meine Firma' }
→ Applies template to bot
```

---

## 📝 Best Practices

### **Nach Template-Loading:**
1. ✅ Review AI Prompts (anpassen an dein Business)
2. ✅ Knowledge Sources hinzufügen
3. ✅ Flow testen
4. ✅ Compliance Check durchführen
5. ✅ Anpassungen vornehmen

### **AI Prompts anpassen:**
- ✅ Spezifische Produkte/Services erwähnen
- ✅ "NUR" oder "Only" in Prompts verwenden
- ✅ Use-Case klar definieren
- ✅ Limits setzen (z.B. "NUR zu Produkten")

---

## 🔄 Template-Updates

Templates werden kontinuierlich verbessert basierend auf:
- Meta-Richtlinien-Änderungen
- Best Practices
- Kunden-Feedback
- Compliance-Erkenntnissen

---

**Letzte Aktualisierung:** 2025-01-XX  
**Status:** ✅ Alle Templates Meta-compliant

