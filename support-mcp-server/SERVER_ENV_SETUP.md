# Server-Anmeldedaten Setup

## Wichtige Hinweise

**WICHTIG:** Diese Datei enthält sensible Anmeldedaten. Niemals in Git committen!

## Server-Anmeldedaten für .env-Datei

Die folgenden Variablen müssen in der `.env`-Datei auf dem Server hinterlegt werden:

```bash
# Hetzner SSH-Verbindung
HETZNER_SSH_HOST=91.99.232.126
HETZNER_SSH_USER=root
HETZNER_SSH_PASSWORD=LpXqTEPurwUu
HETZNER_SSH_KEY_PATH=~/.ssh/id_rsa

# n8n Integration
N8N_WEBHOOK_URL=http://automat.owona.de/webhook/telegram-approval
N8N_USER=n8n@n8n-owown
```

## Setup-Anleitung

1. **SSH-Verbindung zum Server:**
   ```bash
   ssh root@91.99.232.126
   ```

2. **Navigiere zum support-mcp-server Verzeichnis:**
   ```bash
   cd /var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/support-mcp-server
   ```

3. **Erstelle oder bearbeite .env-Datei:**
   ```bash
   nano .env
   ```

4. **Füge die oben genannten Variablen hinzu**

5. **Speichere und beende (Ctrl+X, dann Y, dann Enter)**

6. **Prüfe ob Datei korrekt ist:**
   ```bash
   cat .env | grep HETZNER
   ```

## Sicherheit

- `.env` Datei ist in `.gitignore` enthalten
- Passwörter niemals in Code committen
- Nur auf dem Server speichern
- Regelmäßig rotieren





