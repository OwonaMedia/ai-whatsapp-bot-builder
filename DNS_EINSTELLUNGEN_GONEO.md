# 🌐 DNS-Einstellungen für whatsapp.owona.de bei Goneo

## 📋 DNS-Einträge die du in Goneo einrichten musst:

### **Option 1: A-Record (Empfohlen für IPv4)**

| Typ | Name/Host | Wert/Ziel | TTL |
|-----|-----------|-----------|-----|
| **A** | `whatsapp` | `91.99.232.126` | 3600 (oder Standard) |

**Ergebnis:** `whatsapp.owona.de` → `91.99.232.126`

---

### **Option 2: CNAME (Falls du einen Hostnamen hast)**

Falls du einen Hostnamen für den Server hast (z.B. `server-01.hetzner.de`):

| Typ | Name/Host | Wert/Ziel | TTL |
|-----|-----------|-----------|-----|
| **CNAME** | `whatsapp` | `server-01.hetzner.de` | 3600 |

**Hinweis:** CNAME kann nicht zusammen mit anderen Record-Typen für die gleiche Subdomain verwendet werden.

---

## 🔧 Einrichtungsschritte in Goneo:

### **1. Login zu Goneo**
- Gehe zu: https://goneo.de
- Login mit deinen Credentials

### **2. DNS-Verwaltung öffnen**
- Gehe zu: **Domains** → **owona.de** → **DNS-Verwaltung**

### **3. A-Record hinzufügen**
1. Klicke auf **"Neuen Eintrag hinzufügen"** oder **"Eintrag bearbeiten"**
2. Wähle Typ: **A**
3. **Name/Host:** `whatsapp` (ohne .owona.de)
4. **Wert/Ziel:** `91.99.232.126`
5. **TTL:** `3600` (1 Stunde) oder Standard
6. Speichern

### **4. Prüfen**
Nach dem Speichern sollte der Eintrag so aussehen:
```
whatsapp.owona.de.    3600    IN    A    91.99.232.126
```

---

## ⏱️ Propagation-Zeit

- **Normal:** 5-60 Minuten
- **Maximal:** Bis zu 24-48 Stunden (selten)

### **DNS-Propagation prüfen:**
```bash
# Lokal testen:
nslookup whatsapp.owona.de
dig whatsapp.owona.de +short

# Sollte zurückgeben: 91.99.232.126
```

---

## 🌍 Online DNS-Check-Tools:

1. **https://dnschecker.org/#A/whatsapp.owona.de**
2. **https://www.whatsmydns.net/#A/whatsapp.owona.de**
3. **https://toolbox.googleapps.com/apps/checkmx/check**

---

## 🔒 SSL/HTTPS (Automatisch mit Caddy)

Nach der DNS-Einrichtung wird Caddy automatisch ein SSL-Zertifikat von Let's Encrypt erstellen, sobald:
- ✅ DNS-Propagation abgeschlossen ist
- ✅ Port 80 und 443 auf dem Server offen sind
- ✅ Caddy korrekt konfiguriert ist (siehe Server-Setup)

---

**Status:** Ready for DNS Setup  
**IP-Adresse:** 91.99.232.126  
**Subdomain:** whatsapp.owona.de

