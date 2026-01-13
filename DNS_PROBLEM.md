# 🔴 DNS/Server-Problem: owona.de offline

## Problem:
- `owona.de` ist offline
- `whatsapp.owona.de` ist offline
- DNS-Einstellungen von Goneo zeigen nicht mehr auf `91.99.232.126`

## Diagnose:

### 1. DNS-Prüfung:
```bash
nslookup owona.de
nslookup whatsapp.owona.de
```

### 2. IP-Prüfung:
```bash
ping 91.99.232.126
```

### 3. Server-Status:
- Ist der Hetzner-Server erreichbar?
- Läuft der Server auf der IP?
- Ist Caddy/n8n aktiv?

## Mögliche Ursachen:

1. **DNS-Einstellungen geändert**: Goneo DNS zeigt auf falsche IP
2. **Server offline**: Hetzner-Server ist nicht erreichbar
3. **IP geändert**: Server hat neue IP-Adresse
4. **Caddy/n8n nicht aktiv**: Services laufen nicht

## Lösungsschritte:

### 1. DNS-Einstellungen in Goneo prüfen:
- Login zu Goneo
- DNS-Einstellungen für `owona.de` prüfen
- A-Record sollte auf `91.99.232.126` zeigen
- CNAME für `whatsapp.owona.de` sollte auf `owona.de` zeigen

### 2. Server-Status prüfen:
```bash
# SSH zum Server
ssh root@91.99.232.126

# Prüfe Services
pm2 status
systemctl status caddy
systemctl status n8n
```

### 3. Falls IP geändert:
- Neue IP in Goneo DNS eintragen
- Oder: Server auf alte IP zurückstellen

## Nächste Schritte:

1. **Goneo DNS prüfen**: Login und A-Record prüfen
2. **Server-Status prüfen**: SSH und Services prüfen
3. **Ticket erstellen**: Für AutoFix-System (falls Hetzner-Command nötig)




