#!/bin/bash
# Skript zum Löschen der setup-stripe-webhook.ts Datei auf dem Server

echo "🗑️  Lösche setup-stripe-webhook.ts vom Server..."
ssh goneo-server "rm -f /var/www/whatsapp-bot-builder/scripts/setup-stripe-webhook.ts && echo '✅ Datei gelöscht' || echo '❌ Fehler beim Löschen'"

echo ""
echo "🔍 Prüfe ob Datei noch existiert..."
ssh goneo-server "ls -la /var/www/whatsapp-bot-builder/scripts/setup-stripe-webhook.ts 2>/dev/null && echo '⚠️  Datei existiert noch!' || echo '✅ Datei erfolgreich gelöscht'"

echo ""
echo "✅ Fertig! Jetzt kannst du den Build erneut starten:"
echo "   ssh goneo-server 'cd /var/www/whatsapp-bot-builder && npm run build'"

