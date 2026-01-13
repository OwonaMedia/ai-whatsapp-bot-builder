#!/bin/bash

# 🚀 Live-Deployment: Login-Page Fix auf whatsapp.owona.de
# Führe dieses Script auf dem Server aus oder per SSH

echo "🚀 Starte Live-Deployment für Login-Page Fix..."
echo "================================================"

# Prüfe ob wir auf dem Server sind oder lokal
if [ -z "$SSH_CONNECTION" ] && [ -z "$SERVER_PATH" ]; then
    echo "⚠️  Script muss auf dem Server ausgeführt werden"
    echo "📝 Nutzung:"
    echo "   Option 1: SSH + Script ausführen"
    echo "     ssh user@whatsapp.owona.de"
    echo "     cd /path/to/frontend"
    echo "     bash deploy-login-fix.sh"
    echo ""
    echo "   Option 2: Script direkt per SSH ausführen"
    echo "     ssh user@whatsapp.owona.de 'cd /path/to/frontend && bash -s' < deploy-login-fix.sh"
    exit 1
fi

# Projekt-Pfad (anpassen falls nötig)
FRONTEND_PATH="${FRONTEND_PATH:-$(pwd)}"
cd "$FRONTEND_PATH" || exit 1

echo "📂 Arbeitsverzeichnis: $FRONTEND_PATH"
echo ""

# Backup erstellen
echo "💾 Erstelle Backup..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r app lib "$BACKUP_DIR/" 2>/dev/null
echo "✅ Backup erstellt: $BACKUP_DIR"
echo ""

# 1. Login-Page Fix anwenden
echo "🔧 1/3: Login-Page Fix anwenden..."
LOGIN_PAGE="app/[locale]/auth/login/page.tsx"

if [ -f "$LOGIN_PAGE" ]; then
    cat > "$LOGIN_PAGE" << 'EOFPAGE'
import LoginForm from '@/components/auth/LoginForm';

/**
 * Login Page - Simplified version without server-side auth check
 * Auth check wird im LoginForm durchgeführt
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <LoginForm redirectTo={params.redirect || '/dashboard'} />
      </div>
    </div>
  );
}
EOFPAGE
    echo "✅ Login-Page aktualisiert"
else
    echo "⚠️  Datei nicht gefunden: $LOGIN_PAGE"
fi
echo ""

# 2. Config-Fix anwenden
echo "🔧 2/3: Config-Fix anwenden..."
CONFIG_FILE="lib/config.ts"

if [ -f "$CONFIG_FILE" ]; then
    # Ersetze die Validierung
    sed -i.bak 's/if (!config\.supabase\.url || !config\.supabase\.anonKey) {/if (process.env.NODE_ENV === '\''production'\'' \&\& (!config.supabase.url || !config.supabase.anonKey)) {/' "$CONFIG_FILE"
    rm -f "$CONFIG_FILE.bak"
    echo "✅ Config aktualisiert"
else
    echo "⚠️  Datei nicht gefunden: $CONFIG_FILE"
fi
echo ""

# 3. Build-Cache löschen
echo "🧹 3/3: Build-Cache löschen..."
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ .next Verzeichnis gelöscht"
else
    echo "ℹ️  .next Verzeichnis existiert nicht"
fi
echo ""

# Zusammenfassung
echo "✅ Deployment abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "   1. Build neu erstellen: npm run build"
echo "   2. Server neu starten:"
echo "      - PM2: pm2 restart whatsapp-bot-builder"
echo "      - systemd: sudo systemctl restart whatsapp-bot-builder"
echo "      - Oder: npm start"
echo ""
echo "🧪 Test:"
echo "   https://whatsapp.owona.de/de/auth/login"
echo "   https://whatsapp.owona.de/auth/login"
echo ""
echo "💾 Backup gespeichert in: $BACKUP_DIR"

