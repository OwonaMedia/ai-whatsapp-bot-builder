# Fix-Liste: Seiten, Bilder und Links

**Erstellt:** 27.11.2025

## Zusammenfassung

- **28 Seiten fehlen auf Server** (von 43 total)
- **5 Bilder fehlen** (viele sind Template-String-Falschmeldungen)
- **19 Links broken** (viele sind Template-String-Falschmeldungen)

## 🔴 Kritische Fixes: Fehlende Seiten

### Auth-Seiten (6)
- `/de/auth/auth-code-error` → `app/[locale]/auth/auth-code-error/page.tsx`
- `/de/auth/login` → `app/[locale]/auth/login/page.tsx`
- `/de/auth/signup` → `app/[locale]/auth/signup/page.tsx`
- `/de/auth/forgot-password` → `app/[locale]/auth/forgot-password/page.tsx`
- `/de/auth/reset-password` → `app/[locale]/auth/reset-password/page.tsx`
- `/de/auth/verify-otp` → `app/[locale]/auth/verify-otp/page.tsx`

### Bot-Seiten (5)
- `/de/bots` → `app/[locale]/bots/page.tsx`
- `/de/bots/new` → `app/[locale]/bots/new/page.tsx`
- `/de/bots/[id]` → `app/[locale]/bots/[id]/page.tsx`
- `/de/bots/[id]/analytics` → `app/[locale]/bots/[id]/analytics/page.tsx`
- `/de/bots/[id]/knowledge` → `app/[locale]/bots/[id]/knowledge/page.tsx`

### Checkout-Seiten (4)
- `/de/checkout` → `app/[locale]/checkout/page.tsx`
- `/de/checkout/success` → `app/[locale]/checkout/success/page.tsx`
- `/de/checkout/cancel` → `app/[locale]/checkout/cancel/page.tsx`
- `/de/checkout/paypal/success` → `app/[locale]/checkout/paypal/success/page.tsx`

### Dashboard-Seiten (2)
- `/de/dashboard` → `app/[locale]/dashboard/page.tsx`
- `/de/dashboard/monitoring` → `app/[locale]/dashboard/monitoring/page.tsx`

### Legal-Seiten (4)
- `/de/legal/privacy` → `app/[locale]/legal/privacy/page.tsx`
- `/de/legal/terms` → `app/[locale]/legal/terms/page.tsx`
- `/de/legal/cookies` → `app/[locale]/legal/cookies/page.tsx`
- `/de/legal/data-processing` → `app/[locale]/legal/data-processing/page.tsx`

### Weitere wichtige Seiten (7)
- `/de/pricing` → `app/[locale]/pricing/page.tsx`
- `/de/resources` → `app/[locale]/resources/page.tsx`
- `/de/templates` → `app/[locale]/templates/page.tsx`
- `/de/settings` → `app/[locale]/settings/page.tsx`
- `/de/support/messages` → `app/[locale]/support/messages/page.tsx`
- `/de/intern` → `app/[locale]/intern/page.tsx`
- `/de/widget/embed` → `app/[locale]/widget/embed/page.tsx`

### Optionale Seiten (2)
- `/de/test` → `app/[locale]/test/page.tsx`
- `/de/tools/geoview` → `app/[locale]/tools/geoview/page.tsx`
- `/de/screenshots` → `app/[locale]/screenshots/page.tsx`

## 🟠 Echte Broken Links (nicht Template-Strings)

### Links zu fehlenden Seiten
- `/de/dashboard` → 404 (Seite fehlt auf Server)
- `/de/legal/privacy` → 404 (Seite fehlt auf Server)
- `/de/legal/data-processing` → 404 (Seite fehlt auf Server)

### Sonstige Broken Links
- `/de/de` → 404 (Doppel-Locale, sollte `/de` sein)
- `/de/bsp.website` → 404 (Falscher Link, sollte korrigiert werden)
- `/de/action.href` → 404 (Template-String nicht aufgelöst)
- `/de/link.href` → 404 (Template-String nicht aufgelöst)
- `/de/linkHref` → 404 (Template-String nicht aufgelöst)
- `/de/docLink` → 404 (Template-String nicht aufgelöst)

## 🟡 Bilder (bereinigt)

### Echte fehlende Bilder
Die meisten "fehlenden" Bilder sind Template-String-Falschmeldungen:
- `/screenshot.src` → Template-String
- `/logo.src` → Template-String
- `/videoSrc` → Template-String
- `/imageSrc` → Template-String

**Tatsächlich fehlende Bilder müssen manuell geprüft werden.**

## Fix-Strategie

### Phase 1: Alle fehlenden Seiten synchronisieren
```bash
# Synchronisiere alle fehlenden Routen
rsync -avz app/\[locale\]/auth/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/auth/
rsync -avz app/\[locale\]/bots/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/bots/
rsync -avz app/\[locale\]/checkout/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/checkout/
rsync -avz app/\[locale\]/dashboard/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/dashboard/
rsync -avz app/\[locale\]/legal/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/legal/
rsync -avz app/\[locale\]/pricing/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/pricing/
rsync -avz app/\[locale\]/resources/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/resources/
rsync -avz app/\[locale\]/templates/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/templates/
rsync -avz app/\[locale\]/settings/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/settings/
rsync -avz app/\[locale\]/support/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/support/
rsync -avz app/\[locale\]/intern/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/intern/
rsync -avz app/\[locale\]/widget/ root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/widget/
```

### Phase 2: Build auf Server
```bash
ssh root@whatsapp.owona.de "cd /var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend && npm run build && pm2 restart whatsapp-bot-builder"
```

### Phase 3: Broken Links korrigieren
- `/de/de` → `/de` korrigieren
- Template-Strings in Code prüfen und korrigieren

## Prioritäten

1. **Kritisch:** Auth-Seiten, Bot-Seiten, Checkout-Seiten (15 Seiten)
2. **Hoch:** Dashboard, Legal, Pricing, Resources, Templates (9 Seiten)
3. **Mittel:** Settings, Support, Intern, Widget (4 Seiten)
4. **Niedrig:** Test, Tools, Screenshots (3 Seiten)

