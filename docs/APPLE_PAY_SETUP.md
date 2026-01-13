# Apple Pay & Google Pay Registrierung

Stand: 7. November 2025  
Ziel: Apple Pay für `https://whatsapp.owona.de` aktivieren und mit Stripe verbinden.

---

## ✅ Voraussetzungen

- Stripe-Account (Live-Modus aktiviert, Zahlungen in EUR)  
- Zugriff auf das Stripe Dashboard **und** die Stripe CLI (>= 1.15)  
- SSH-Zugang zum Produktionsserver (`root@91.99.232.126`)  
- Aktueller Code-Stand lokal (`products/ai-whatsapp-bot-builder/frontend`)

> **Hinweis:** Apple Pay unterstützt nur Domains mit gültigem HTTPS-Zertifikat. `whatsapp.owona.de` läuft bereits über Let’s Encrypt.

---

## 1. Domain bei Stripe hinterlegen

1. Stripe CLI einloggen:
   ```bash
   stripe login
   ```
2. Domain registrieren (erst Sandbox testen, dann Live):
   ```bash
   # Sandbox/Testmodus
   stripe apple_pay domains create --domain=whatsapp.owona.de

   # Live-Modus (nach erfolgreichem Test)
   stripe apple_pay domains create --domain=whatsapp.owona.de --livemode
   ```
3. Die CLI gibt den Pfad zur Domain-Associations-Datei aus, z. B.:
   ```
   Created domain whatsapp.owona.de. Upload the file located at:
   ~/.stripe/apple-pay/whatsapp.owona.de/apple-developer-merchantid-domain-association
   ```

---

## 2. Datei ins Projekt kopieren

1. Lokal Verzeichnis anlegen (falls noch nicht vorhanden):
   ```bash
   cd products/ai-whatsapp-bot-builder/frontend
   mkdir -p public/.well-known
   ```
2. Datei aus der Stripe CLI Location kopieren:
   ```bash
   cp ~/.stripe/apple-pay/whatsapp.owona.de/apple-developer-merchantid-domain-association \
      public/.well-known/apple-developer-merchantid-domain-association
   ```
3. Datei im Repository behalten (wird für Build benötigt). **Keine Änderungen am Inhalt vornehmen!**

---

## 3. Datei auf Produktionsserver deployen

> Next.js bedient Dateien aus `public/` automatisch. Die `.well-known`-Datei muss nach jedem Build vorhanden sein.

1. Datei direkt zum Server kopieren:
   ```bash
   sshpass -p 'LpXqTEPurwUu' scp \
     public/.well-known/apple-developer-merchantid-domain-association \
     root@91.99.232.126:/var/www/whatsapp-bot-builder/frontend/public/.well-known/
   ```
2. Falls das Verzeichnis auf dem Server fehlt:
   ```bash
   sshpass -p 'LpXqTEPurwUu' ssh root@91.99.232.126 \
     "mkdir -p /var/www/whatsapp-bot-builder/frontend/public/.well-known"
   ```
3. Anschließend Next.js neu builden/restarten:
   ```bash
   sshpass -p 'LpXqTEPurwUu' ssh root@91.99.232.126 \
     "cd /var/www/whatsapp-bot-builder/frontend && npm run build && pm2 restart 52"
   ```

---

## 4. Domain-Verifizierung auslösen

1. Stripe Dashboard → **Einstellungen** → **Zahlungen** → **Apple Pay**.
2. Domain `whatsapp.owona.de` auswählen und auf **Verify** klicken.
3. Status sollte nach wenigen Sekunden zu „Verified“ wechseln.

> Falls Stripe weiterhin „Pending“ anzeigt, per `curl` testen:  
> ```bash
> curl https://whatsapp.owona.de/.well-known/apple-developer-merchantid-domain-association
> ```
> Die Antwort muss **exakt** dem Inhalt aus der Stripe-Datei entsprechen (kein HTML, keine Zusatzzeichen).

---

## 5. Apple Pay & Google Pay im Checkout testen

1. Stripe Dashboard → **Entwickler** → **Zahlungen** → Test PaymentIntent mit `payment_method_types=['card']` und PaymentElement.  
2. Lokal (oder auf Live) Safari/iOS bzw. Chrome/Android nutzen: Der Wallet-Button (Apple Pay oder Google Pay) erscheint automatisch im Stripe Payment Request Button, wenn:
   - `automatic_payment_methods.enabled = true` (bereits in `lib/payments/stripe.ts` gesetzt)
   - Browser & Gerät die jeweilige Wallet unterstützen
   - Für Apple Pay wurde die Domain verifiziert
3. Testzahlung durchführen. Im Stripe Dashboard sollte in der PaymentIntent-Timeline „Apple Pay“ oder „Google Pay“ als Zahlungsweg erscheinen.

---

## 6. Troubleshooting

- **Button erscheint nicht:** Gerät/Browsersupport prüfen, Apple Pay im Safari aktivieren.
- **Stripe meldet „Domain not verified“:** curl-Check erneut durchführen, Datei evtl. durch Deploy überschrieben → erneut kopieren.
- **Mehrere Umgebungen:** Für Staging/Test-Domains (z. B. `dev.whatsapp.owona.de`) denselben Ablauf wiederholen – jede Domain separat verifizieren.

---

## 7. Nächste Schritte (optional)

- Monitoring im Checkout einbauen (z. B. Log-Einträge bei Wallet-Zahlungen).
- Weitere Domains (z. B. `dev.whatsapp.owona.de`) registrieren, falls zusätzliche Umgebungen entstehen.
- Für Google Pay sind keine zusätzlichen Domain-Schritte nötig; es reicht, die Wallet in Stripe zu aktivieren.

---

## 📌 Status 11. November 2025

- ✅ Live-Domain `whatsapp.owona.de` via Stripe API registriert – ID `apwc_1SQl7bEBCNGNWfiqRvD145Ve`.
- ✅ `apple-developer-merchantid-domain-association` wird über `https://whatsapp.owona.de/.well-known/apple-developer-merchantid-domain-association` ausgeliefert (Caddy + Next Middleware ignoriert Locale-Prefix).
- ✅ `CheckoutForm.tsx` nutzt jetzt den Stripe Payment Request Button für Apple Pay & Google Pay (Express Checkout) + CardElement-Fallback.
- 🔜 Restschritt: Im Stripe Dashboard (Live) auf **Verify** klicken, sobald Apple Pay im UI angezeigt wird (manuelle Bestätigung durch Stripe erforderlich).

**Letzte Aktualisierung:** 11. November 2025
