# .well-known Verzeichnis

Dieses Verzeichnis enthält Dateien, die von externen Diensten (z. B. Apple Pay, Google Site Verification) erwartet werden und **unverändert** von Next.js ausgeliefert werden müssen.

## Apple Pay

- Datei: `apple-developer-merchantid-domain-association`
- Quelle: Stripe CLI (`stripe apple_pay domains create ...`)
- Anleitung: Siehe `docs/APPLE_PAY_SETUP.md`

> **Wichtig:** Beim Deployment muss die Originaldatei aus Stripe hier liegen. Keine zusätzlichen Zeilenumbrüche oder Kommentare hinzufügen.

