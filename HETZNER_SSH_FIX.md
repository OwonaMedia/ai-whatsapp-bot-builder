# Hetzner Server SSH Fix - Rescue System Anleitung

## Problem
SSH-Verbindung wird sofort nach erfolgreicher Authentifizierung geschlossen.
```
debug1: Server accepts key: /Users/salomon/.ssh/ihetzner_key
Connection closed by 46.224.154.171 port 22
```

## Ursache (Hetzner-spezifisch)
Ein veralteter `sshd`-Prozess vom Rescue-Modus läuft noch auf dem Hauptsystem und blockiert neue Verbindungen.

## Lösung: Hetzner Rescue System

### Schritt 1: Rescue System aktivieren
1. Einloggen in [Hetzner Cloud Console](https://console.hetzner.cloud/)
2. Server auswählen
3. "Rescue" → "Enable Rescue & Power Cycle"
4. Rescue-Passwort notieren
5. Server neu starten

### Schritt 2: In Rescue System einloggen
```bash
ssh root@46.224.154.171
# Rescue-Passwort eingeben
```

### Schritt 3: Hauptsystem mounten
```bash
# Partitionen anzeigen
lsblk

# Root-Partition mounten (anpassen an Ihre Partition)
mount /dev/sda1 /mnt

# In Hauptsystem wechseln
chroot /mnt
```

### Schritt 4: Problem beheben

**Option A: Passwort-Auth temporär aktivieren**
```bash
# SSH-Config bearbeiten
nano /etc/ssh/sshd_config

# Folgende Zeilen setzen:
PasswordAuthentication yes
PermitRootLogin yes

# Root-Passwort setzen
passwd root

# Speichern und beenden
```

**Option B: Rogue sshd killen**
```bash
# Alte sshd-Prozesse beenden
pkill -u root sshd

# SSH neu installieren
apt install --reinstall openssh-server openssh-client

# SSH-Service neu starten
mkdir -p /run/sshd
systemctl restart ssh
systemctl enable ssh
```

### Schritt 5: System neu starten
```bash
# chroot verlassen
exit

# Partition unmounten
umount /mnt

# In Hetzner Console: Rescue deaktivieren und Server neu starten
```

### Schritt 6: Testen
```bash
# Mit Passwort verbinden
ssh root@46.224.154.171

# Oder mit SSH-Key (sollte jetzt funktionieren)
ssh -i ~/.ssh/ihetzner_key root@46.224.154.171
```

### Schritt 7: Sicherheit wiederherstellen
Nach erfolgreicher Verbindung:
```bash
# Passwort-Auth wieder deaktivieren
nano /etc/ssh/sshd_config
# PasswordAuthentication no
# PermitRootLogin prohibit-password

systemctl restart ssh
```

## Alternative: Deployment ohne SSH-Fix

Falls Rescue System nicht sofort verfügbar ist, können Sie:
1. Lokale Entwicklung fortsetzen
2. Neue Hetzner-Instanz aufsetzen
3. Hetzner Support kontaktieren

## Deployment nach SSH-Fix

Sobald SSH funktioniert:
```bash
cd /Users/salomon/Documents/products/ai-whatsapp-bot-builder
./deploy-to-new-server.sh
```
