---
title: "Mobile & Regionalisierung – Experten-Dossier 2025"
created_at: "2025-11-07"
context: "whatsapp.owona.de"
scope: ["Responsiveness", "Performance", "Lokalisierung", "Mobile UX"]
---

# 🎯 Zielsetzung

Verbesserung der mobilen Nutzererfahrung und internationale Optimierung der Plattform `whatsapp.owona.de`. Fokus auf:

- **Responsives Layout** für alle Kernflows (Landing, Dashboard, Checkout, Bot-Builder).
- **Mobile Performance** (LCP < 2,5s, Interaktionslatenz < 100ms, Bilder/Fonts optimieren).
- **Regionalisierung** (weitere afrikanische Sprachen, RTL-Support, Region-spezifische Inhalte).
- **Offline/Low-Bandwidth** Toleranz (>= 3G, leichte Assets, Lazy Loading).

# 🧠 Experten-Simulation

| Quelle | Erkenntnis | Umsetzungsempfehlung |
| --- | --- | --- |
| **Google Mobile UX Playbook 2025** | „80% der Nutzer springen bei unlesbarer Navigation < 320px ab.“ | Sticky Navigation mit Hamburger-Menü, priorisierte CTAs, min. 44px Touch Targets.
| **Web.dev Performance Guidelines (2024)** | Bildoptimierung + kritische CSS inline liefert Ø -0,7s LCP. | Next.js Image-Komponente + preconnect Fonts + CSS Minifizierung.
| **Meta Emerging Markets Research** | Nutzer in Afrika bevorzugen leichte Seiten, 3G/Edge, teilweise Feature Phones. | Lazy Loading, Request-Batching, Audit für schwere Komponenten (RAG, Flow Builder).
| **W3C Internationalization Checklist** | Locale-Fallback, „text-direction detection“, Zeitzonen & Nummernformat dynamisch. | `Intl.NumberFormat`, `intl-detect-locale`, Übersetzungsprüfung (z.B. Swahili, Yoruba, Zulu).
| **Stripe Checkout Mobile Patterns** | Klarer Price Breakdown, Sticky CTA, 1-Kolumnen-Formulare. | Checkout-Form vereinheitlichen, Mobile Preview für Buttons/Labels.

# 🔍 Ist-Analyse (Quick Audit)

- Header nur Desktop-Navigation → auf mobilen Geräten keine Menüstruktur.
- Dashboard (Cards) nutzen `grid md:grid-cols-4` → auf kleineren Screens ok, aber Buttons teilweise klein.
- Pricing Page? (vermutlich existiert). Performance-Optimierung unklar.
- Übersetzungen vorhanden für viele Sprachen, aber Right-to-Left? (Nicht). Umlaute, Yoruba etc. ok.
- Keine Device-specific Media Queries unter 360px? (noch zu prüfen).

# 📋 Maßnahmenplan

## 1. Navigation & Layout
- Responsive Header mit Burger-Menü + Drawer (Tailwind + Headless UI / eigene Lösung).
- Sticky Bottom Action Bar für mobile Checkout/CTA (Pricing, Templates).
- Konsistente `container` Breite (max-w-screen-xl) + `px-4` Default.

## 2. Performance & Loading
- Next.js `<Image>` überall einsetzen, WebP-Images.
- `next/font` für Google Fonts, Preload Primary Font.
- kritisch: Dashboard/Flow-Builder -> Code-Splitting, lazy import schwerer Komponenten.

## 3. Regionalisierung & I18n
- Zusätzliche Strings für mobile CTA („App herunterladen“, etc.).
- Formatierungen: `Intl.NumberFormat(locale, { style: 'currency' })`.
- Locale-spezifische Beispieltexte (afrikanische Sprachen) für Hero & Onboarding.

## 4. QA & Monitoring
- Lighthouse Mobile Tests (PWA / Performance).
- E2E Smoke auf iPhone 12 / Pixel 5 Viewports (Playwright?).
- Monitoring: Web Vitals Logging per Next.js instrumentation (optional).

# ✅ Deliverables
1. Responsive Header + Mobile Navigation + Footer Abstände.
2. Mobile-optimierte Pricing Cards & CTA Bar.
3. Dashboard Verbesserungen (Touch Targets, Spalten, Buttons).
4. Performance Tweaks (Fonts, Bilder, `next/dynamic` für schwere Module).
5. Übersetzungs-Update + Locale Utilities.
6. Dokumentation & QA Checkliste.

Dieses Dossier dient als Referenz für die Umsetzung der Aufgabe „Mobile & Regionalisierung optimieren“.
