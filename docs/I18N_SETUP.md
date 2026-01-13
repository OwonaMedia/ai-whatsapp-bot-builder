# 🌍 Multi-Language Setup (i18n)

## Übersicht

Die Anwendung unterstützt automatische Sprach-Erkennung und manuelle Sprach-Auswahl für Deutsch, Englisch und Französisch.

## Implementierung

### **Library: next-intl**
- Native Next.js 14 App Router Support
- Type-Safe Translations
- Server & Client Components

### **Unterstützte Sprachen**
- 🇩🇪 **Deutsch (DE)** - Default
- 🇬🇧 **Englisch (EN)**
- 🇫🇷 **Französisch (FR)** - Für Afrika-Markt

## Sprach-Erkennung (Priority Order)

1. **URL-Parameter** (`/en`, `/de`, `/fr`)
2. **Cookie** (`NEXT_LOCALE`)
3. **Browser-Language** (`Accept-Language` Header)
4. **Default** (Deutsch)

## Struktur

```
app/
  [locale]/              # Locale-basierte Routes
    layout.tsx          # Locale Layout
    page.tsx            # Homepage
    globals.css
  page.tsx              # Root redirect
  
messages/
  de.json               # Deutsch
  en.json               # Englisch
  fr.json               # Französisch

components/
  ui/
    LanguageSwitcher.tsx # Sprachauswahl-UI
```

## URLs

- `/` → Redirects zu `/de` (Default)
- `/de` → Deutsch
- `/en` → Englisch
- `/fr` → Französisch

## Verwendung

### **Server Components**
```typescript
import { useTranslations } from 'next-intl';

export default function Page() {
  const t = useTranslations('home');
  return <h1>{t('title')}</h1>;
}
```

### **Client Components**
```typescript
'use client';
import { useTranslations } from 'next-intl';

export default function Component() {
  const t = useTranslations('rag');
  return <button>{t('send')}</button>;
}
```

### **Mit Parametern**
```json
// messages/de.json
{
  "sourcesReady": "{count} Quelle(n) bereit"
}
```

```typescript
t('sourcesReady', { count: 5 }) // "5 Quelle(n) bereit"
```

## Language Switcher

Der Language Switcher ist im Header integriert:
- Dropdown mit Flag-Icons
- Persistente Cookie-Speicherung
- Automatisches URL-Update
- Mobile-friendly

## Middleware

Die Middleware (`middleware.ts`) handhabt:
- Locale-Erkennung
- URL-Routing
- Cookie-Management
- Browser-Language-Detection

## Neue Übersetzungen hinzufügen

1. **Übersetzungen in JSON-Dateien:**
   ```json
   // messages/de.json
   {
     "newSection": {
       "key": "Wert"
     }
   }
   ```

2. **In allen Sprachen übersetzen:**
   - `messages/en.json`
   - `messages/fr.json`

3. **In Code verwenden:**
   ```typescript
   const t = useTranslations('newSection');
   t('key');
   ```

## Best Practices

1. ✅ **Alle UI-Texte übersetzen**
2. ✅ **Type-Safety nutzen** (TypeScript)
3. ✅ **Plural-Formen berücksichtigen**
4. ✅ **Kulturelle Unterschiede beachten**
5. ✅ **SEO: hreflang-Tags** (später hinzufügen)

## IP-Geolocation (Optional)

Für IP-basierte Erkennung können GeoIP-Services integriert werden:
- Cloudflare (Header `CF-IPCountry`)
- MaxMind GeoIP2
- IP-API Services

Aktuell wird Browser-Language bevorzugt, da IP-basierte Erkennung:
- ❌ Unpräzise (VPN, Proxy)
- ❌ Datenschutz-Bedenken
- ❌ Nicht immer korrekt

## Troubleshooting

### **Sprache wechselt nicht**
- Prüfen Sie Browser-Cookies (`NEXT_LOCALE`)
- Prüfen Sie URL-Parameter
- Cache leeren

### **Übersetzungen fehlen**
- Prüfen Sie JSON-Dateien
- Prüfen Sie Translation-Keys
- Prüfen Sie Locale-Parameter

### **404 bei /en, /de, /fr**
- Prüfen Sie `generateStaticParams()` im Layout
- Prüfen Sie Middleware-Konfiguration

---

**Letzte Aktualisierung:** 2025-01-XX

