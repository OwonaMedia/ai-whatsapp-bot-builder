# PM2 Restart über Reverse Engineering System

**Datum:** 2025-11-27

---

## ✅ Problem gelöst

**Vorher:** Statisches Pattern `pm2-restart-required` in `autopatchPatterns.ts`  
**Jetzt:** Nutzung des Reverse Engineering Systems mit `deployment_config`

---

## 🔧 Was wurde geändert

### 1. `deployment_config` erweitert

**Datei:** `src/services/actions/reverseEngineeringAnalyzer.ts`

**Erweiterte `potentialIssues`:**
```typescript
potentialIssues: [
  'startet nicht',
  'crash',
  'port belegt',
  'permission denied',
  'deployment fehlgeschlagen',
  // NEU:
  'reagiert nicht',
  'läuft nicht',
  'hängt',
  'bot reagiert nicht',
  'bot läuft nicht',
  'pm2 restart',
  'pm2 neu starten',
]
```

**Neue `universalFixInstructions`:**
```typescript
universalFixInstructions: this.generateUniversalDeploymentFixInstructions()
```

---

### 2. Neue Methode: `generateUniversalDeploymentFixInstructions`

**Erstellt automatisch Hetzner-Befehle für PM2-Restart:**
```typescript
private generateUniversalDeploymentFixInstructions(): AutoFixInstruction[] {
  return [{
    type: 'hetzner-command',
    command: 'pm2 restart whatsapp-bot-builder',
    description: 'PM2 Prozess whatsapp-bot-builder neu starten - Bot reagiert nicht mehr',
    requiresApproval: true,
    whitelistCheck: true,
  }];
}
```

---

### 3. Auto-Generierung in `checkDeviation`

**Bei `deployment_config` Problemen:**
- Prüft ob Ticket PM2/Bot-Problem beschreibt
- Generiert automatisch `universalFixInstructions` wenn nötig
- Nutzt Reverse Engineering Blaupause als Negativ-Beispiele

---

### 4. Statisches Pattern entfernt

**Datei:** `src/services/actions/autopatchPatterns.ts`

- ❌ `pm2-restart-required` Pattern entfernt
- ✅ Nutzt jetzt Reverse Engineering System

---

## 🎯 Wie es funktioniert

1. **Reverse Engineering Analyzer** extrahiert `deployment_config` aus Dokumenten
2. **`potentialIssues`** enthalten jetzt PM2/Bot-Probleme
3. **`matchConfigToTicket`** prüft, ob Ticket zu `deployment_config` passt
4. **`checkDeviation`** erkennt PM2/Bot-Problem
5. **`generateUniversalDeploymentFixInstructions`** erstellt Hetzner-Befehl
6. **AutoFix-Executor** führt Befehl aus (mit Telegram-Bestätigung)

---

## 📋 Vorteile

✅ **Konsistent:** Nutzt das gleiche System wie andere Konfigurationen  
✅ **Wartbar:** Änderungen nur in Reverse Engineering Dokumentation  
✅ **Flexibel:** Erkennt verschiedene PM2/Bot-Probleme automatisch  
✅ **Skalierbar:** Kann weitere Deployment-Probleme hinzufügen  

---

## 🔄 Nächste Schritte

1. **Code deployen** auf Server
2. **Server neu starten**
3. **Ticket erneut testen**

Das System sollte jetzt automatisch PM2-Restart erkennen über das Reverse Engineering System!

---

**Status:** ✅ **REVERSE ENGINEERING SYSTEM INTEGRIERT**

