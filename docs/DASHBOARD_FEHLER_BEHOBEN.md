# Dashboard-Fehler behoben ✅

**Datum:** November 2025

---

## ❌ Probleme

### 1. OnboardingTour Hook-Order-Fehler
```
Error: Rendered more hooks than during the previous render.
```
**Ursache:** `useEffect` wurde nach `return null` aufgerufen, was zu inkonsistenter Hook-Reihenfolge führte.

### 2. Translation-Fehler
```
Error: INSUFFICIENT_PATH: Message at `bots.create` resolved to an object, but only strings are supported.
```
**Ursache:** `bots.create` ist ein Objekt mit `title` und `description`, wurde aber als String verwendet.

### 3. next-intl Deprecation-Warnung
```
The `locale` parameter in `getRequestConfig` is deprecated, please switch to `await requestLocale`.
```
**Ursache:** next-intl 3.22+ verwendet `requestLocale` statt `locale`.

### 4. HTML-Nesting-Fehler
```
Error: In HTML, <html> cannot be a child of <body>.
```
**Ursache:** Beide Layouts (`app/layout.tsx` und `app/[locale]/layout.tsx`) renderten `<html>` und `<body>`.

### 5. Fehlende Dependencies
- `dompurify` (für `lib/security.ts`)
- `cheerio` (für `app/api/knowledge/url/route.ts`)

---

## ✅ Lösungen

### 1. OnboardingTour Hook-Order behoben

**Datei:** `components/onboarding/OnboardingTour.tsx`

```typescript
// Vorher:
export default function OnboardingTour({ run, onComplete, steps }: OnboardingTourProps) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return null;
  // ... mehr Code ...
  useEffect(() => { /* ... */ }, [run, onComplete]); // ❌ Nach return null
  return null;
}

// Nachher:
export default function OnboardingTour({ run, onComplete, steps }: OnboardingTourProps) {
  useEffect(() => { // ✅ Vor return null
    if (run) {
      const timer = setTimeout(() => {
        onComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [run, onComplete]);
  return null;
}
```

### 2. Translation-Pfad korrigiert

**Datei:** `components/dashboard/DashboardContent.tsx`

```typescript
// Vorher:
{t('bots.create') || 'Neuen Bot erstellen'} // ❌

// Nachher:
{t('bots.create.title') || 'Neuen Bot erstellen'} // ✅
```

### 3. next-intl 3.22+ Migration

**Datei:** `i18n.ts`

```typescript
// Vorher:
export default getRequestConfig(async ({ locale }) => { // ❌
  const validLocale: Locale = (locale && locales.includes(locale as Locale)) 
    ? (locale as Locale)
    : defaultLocale;
  // ...
});

// Nachher:
export default getRequestConfig(async ({ requestLocale }) => { // ✅
  const locale = await requestLocale; // ✅ await hinzugefügt
  const validLocale: Locale = (locale && locales.includes(locale as Locale)) 
    ? (locale as Locale)
    : defaultLocale;
  // ...
});
```

### 4. HTML-Nesting behoben

**Datei:** `app/[locale]/layout.tsx`

- ❌ **Vorher:** Rendert `<html>` und `<body>` (doppelt mit Root Layout)
- ✅ **Nachher:** Rendert nur Content (NextIntlClientProvider, ToastProvider, Header, Footer)

**Datei:** `app/layout.tsx`

- ✅ **Erweitert:** Rendert `<html>` und `<body>` mit Metadata API
- ✅ **Metadata:** Open Graph, Twitter Cards, SEO-Tags

### 5. Fehlende Dependencies installiert

```bash
npm install dompurify cheerio --legacy-peer-deps
```

---

## 📋 Status

- [x] OnboardingTour Hook-Order behoben
- [x] Translation-Pfad korrigiert (`bots.create.title`)
- [x] next-intl 3.22+ Migration (`await requestLocale`)
- [x] HTML-Nesting behoben (LocaleLayout rendert keine html/body mehr)
- [x] Fehlende Dependencies installiert (`dompurify`, `cheerio`)
- [x] Alle Dateien auf Server hochgeladen
- [x] App neu gestartet

---

## 🔍 Verifizierung

### 1. Prüfe Dashboard

```bash
# Gehe zu: https://whatsapp.owona.de/de/dashboard
# Sollte ohne Fehler laden
```

### 2. Prüfe Browser-Konsole

- ✅ Keine Hook-Order-Fehler
- ✅ Keine Translation-Fehler
- ✅ Keine HTML-Nesting-Fehler
- ⚠️ Video 404-Fehler (erwartet, Videos fehlen noch)

---

## 📝 Notizen

- **Video 404-Fehler:** Die Demo-Videos (`/videos/demos/*.mp4`) fehlen noch. Das ist nicht kritisch, kann später hinzugefügt werden.
- **OnboardingTour:** Temporär deaktiviert, wird reaktiviert wenn `react-joyride` React 19 unterstützt.
- **next-intl:** Migration auf 3.22+ API abgeschlossen.

---

**Status:** ✅ Alle kritischen Fehler behoben

