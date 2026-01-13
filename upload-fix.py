#!/usr/bin/env python3
import subprocess
import sys

SERVER = "root@91.99.232.126"
PASS = "LpXqTEPurwUu"
FILE = "products/ai-whatsapp-bot-builder/frontend/app/api/support-tickets/route.ts"
REMOTE_PATH = "/var/www/whatsapp-bot-builder/app/api/support-tickets/route.ts"

print("📦 Uploading file...")
result = subprocess.run(
    ["sshpass", "-p", PASS, "scp", "-o", "StrictHostKeyChecking=no", FILE, f"{SERVER}:{REMOTE_PATH}"],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print(f"❌ Upload failed: {result.stderr}")
    sys.exit(1)

print("✅ File uploaded")
print("🏗️  Building...")

result = subprocess.run(
    ["sshpass", "-p", PASS, "ssh", "-o", "StrictHostKeyChecking=no", SERVER, 
     "cd /var/www/whatsapp-bot-builder && rm -rf .next && npm run build 2>&1 | tail -30"],
    capture_output=True,
    text=True
)

print(result.stdout)
if result.returncode != 0:
    print(f"❌ Build failed: {result.stderr}")
    sys.exit(1)

print("🔄 Restarting PM2...")
result = subprocess.run(
    ["sshpass", "-p", PASS, "ssh", "-o", "StrictHostKeyChecking=no", SERVER,
     "cd /var/www/whatsapp-bot-builder && pm2 restart whatsapp-bot-builder || pm2 start ecosystem.config.js"],
    capture_output=True,
    text=True
)

print(result.stdout)
print("✅ Done!")

