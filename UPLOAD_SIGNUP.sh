#!/bin/bash

# Upload-Skript für Signup-Seite und SignupForm
# Server: root@91.99.232.126
# Passwort: LpXqTEPurwUu

SERVER="root@91.99.232.126"
SERVER_DIR="/var/www/whatsapp-bot-builder/frontend"
LOCAL_DIR="/Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend"

echo "📤 Upload Signup-Seite und SignupForm..."

# 1. Signup-Seite erstellen (falls Verzeichnis nicht existiert)
sshpass -p "LpXqTEPurwUu" ssh -o StrictHostKeyChecking=no $SERVER "mkdir -p $SERVER_DIR/app/[locale]/auth/signup"

# 2. Signup-Seite hochladen
sshpass -p "LpXqTEPurwUu" scp -o StrictHostKeyChecking=no \
  "$LOCAL_DIR/app/[locale]/auth/signup/page.tsx" \
  "$SERVER:$SERVER_DIR/app/[locale]/auth/signup/page.tsx"

# 3. SignupForm hochladen
sshpass -p "LpXqTEPurwUu" scp -o StrictHostKeyChecking=no \
  "$LOCAL_DIR/components/auth/SignupForm.tsx" \
  "$SERVER:$SERVER_DIR/components/auth/SignupForm.tsx"

# 4. LoginForm hochladen (falls geändert)
sshpass -p "LpXqTEPurwUu" scp -o StrictHostKeyChecking=no \
  "$LOCAL_DIR/components/auth/LoginForm.tsx" \
  "$SERVER:$SERVER_DIR/components/auth/LoginForm.tsx"

echo "✅ Upload abgeschlossen!"
echo "📦 Build durchführen..."
sshpass -p "LpXqTEPurwUu" ssh -o StrictHostKeyChecking=no $SERVER "cd $SERVER_DIR && npm run build"

echo "🔄 PM2 Restart..."
sshpass -p "LpXqTEPurwUu" ssh -o StrictHostKeyChecking=no $SERVER "pm2 restart whatsapp-bot-builder"

echo "✅ Fertig!"









