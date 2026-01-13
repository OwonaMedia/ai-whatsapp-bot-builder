#!/usr/bin/env node

/**
 * Watch-Script für automatische Dokumentations-Updates
 * Überwacht Code-Änderungen und aktualisiert Dokumentation automatisch
 */

const chokidar = require('chokidar');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const execAsync = promisify(exec);

const MCP_SERVER_PATH = path.join(__dirname, '../mcp-servers/docs-automation-server.js');
const FRONTEND_DIR = path.join(__dirname, '..');
const WATCH_PATTERNS = [
  'app/**/*.tsx',
  'app/**/*.ts',
  'components/**/*.tsx',
  'components/**/*.ts',
  'lib/**/*.ts',
];

// Datei-zu-Dokumentations-Sektion Mapping
const FILE_TO_SECTION = {
  'SignupForm': 'registration',
  'LoginForm': 'login',
  'DashboardContent': 'dashboard',
  'BotBuilder': 'bot-builder',
  'NodePalette': 'nodes',
  'MessageNode': 'nodes',
  'QuestionNode': 'nodes',
  'ConditionNode': 'nodes',
  'AINode': 'nodes',
  'KnowledgeNode': 'nodes',
  'WhatsAppSetupWizard': 'whatsapp-setup',
  'KnowledgeManagement': 'knowledge',
  'AnalyticsDashboard': 'analytics',
  'TemplateSelector': 'templates',
  'CompliancePanel': 'compliance',
  'settings/page': 'settings',
};

class DocsWatcher {
  constructor() {
    this.watcher = null;
    this.debounceTimer = null;
    this.changedFiles = new Set();
    this.mcpProcess = null;
  }

  async start() {
    console.log('🔍 Starte Dokumentations-Watcher...');
    
    // Starte MCP Server
    await this.startMCPServer();
    
    // Watch-Dateien
    this.watcher = chokidar.watch(WATCH_PATTERNS, {
      cwd: FRONTEND_DIR,
      ignored: /node_modules|\.next|\.git/,
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (filePath) => this.handleChange(filePath, 'add'))
      .on('change', (filePath) => this.handleChange(filePath, 'change'))
      .on('unlink', (filePath) => this.handleChange(filePath, 'unlink'))
      .on('error', (error) => console.error('Watcher-Fehler:', error));

    console.log('✅ Watcher läuft. Überwacht:', WATCH_PATTERNS.join(', '));
  }

  async startMCPServer() {
    try {
      // Prüfe ob MCP Server bereits läuft
      const { stdout } = await execAsync('pgrep -f "docs-automation-server" || echo ""');
      if (stdout.trim()) {
        console.log('✅ MCP Server läuft bereits');
        return;
      }

      // Starte MCP Server als PM2 Prozess
      await execAsync(`pm2 start ${MCP_SERVER_PATH} --name docs-automation-mcp --interpreter node --no-autorestart || pm2 restart docs-automation-mcp`);
      console.log('✅ MCP Server gestartet');
    } catch (error) {
      console.error('⚠️  MCP Server konnte nicht gestartet werden:', error.message);
      console.log('📝 Fahre fort ohne MCP Server (manuelle Updates möglich)');
    }
  }

  handleChange(filePath, event) {
    // Ignoriere bestimmte Dateien
    if (filePath.includes('node_modules') || 
        filePath.includes('.next') || 
        filePath.includes('.git') ||
        filePath.includes('docs/page.tsx')) {
      return;
    }

    this.changedFiles.add(filePath);
    
    // Debounce: Warte 2 Sekunden nach letzter Änderung
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.processChanges();
    }, 2000);
  }

  async processChanges() {
    if (this.changedFiles.size === 0) return;

    console.log(`\n📝 ${this.changedFiles.size} Datei(en) geändert. Analysiere...`);

    const affectedSections = new Set();
    const filesToProcess = Array.from(this.changedFiles);
    this.changedFiles.clear();

    // Bestimme betroffene Dokumentations-Sektionen
    for (const filePath of filesToProcess) {
      const section = this.getSectionForFile(filePath);
      if (section) {
        affectedSections.add(section);
        console.log(`  → ${filePath} → ${section}`);
      }
    }

    if (affectedSections.size === 0) {
      console.log('  ℹ️  Keine Dokumentations-Updates erforderlich\n');
      return;
    }

    // Update Dokumentation für betroffene Sektionen
    for (const section of affectedSections) {
      await this.updateDocumentationSection(section, filesToProcess);
    }

    console.log('✅ Dokumentations-Updates abgeschlossen\n');
  }

  getSectionForFile(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const fileDir = path.dirname(filePath);
    
    // Direkte Mapping-Prüfung
    for (const [key, section] of Object.entries(FILE_TO_SECTION)) {
      if (fileName.includes(key) || filePath.includes(key)) {
        return section;
      }
    }

    // Pfad-basierte Erkennung
    if (filePath.includes('auth/signup')) return 'registration';
    if (filePath.includes('auth/login')) return 'login';
    if (filePath.includes('dashboard')) return 'dashboard';
    if (filePath.includes('bot-builder')) return 'bot-builder';
    if (filePath.includes('nodes/')) return 'nodes';
    if (filePath.includes('whatsapp') || filePath.includes('WhatsApp')) return 'whatsapp-setup';
    if (filePath.includes('knowledge') || filePath.includes('Knowledge')) return 'knowledge';
    if (filePath.includes('analytics') || filePath.includes('Analytics')) return 'analytics';
    if (filePath.includes('template') || filePath.includes('Template')) return 'templates';
    if (filePath.includes('compliance') || filePath.includes('Compliance')) return 'compliance';
    if (filePath.includes('settings')) return 'settings';

    return null;
  }

  async updateDocumentationSection(sectionId, changedFiles) {
    console.log(`\n🔄 Aktualisiere Dokumentation: ${sectionId}`);

    try {
      // 1. Analysiere Änderungen
      const analysis = await this.analyzeChanges(sectionId, changedFiles);
      
      // 2. Generiere neuen Text
      const newText = await this.generateDocumentationText(sectionId, analysis);
      
      // 3. Prüfe ob Screenshots aktualisiert werden müssen
      const needsScreenshots = this.needsScreenshotUpdate(analysis);
      
      if (needsScreenshots) {
        console.log(`  📸 Erstelle Screenshot für ${sectionId}...`);
        await this.createScreenshot(sectionId);
      }
      
      // 4. Update Dokumentation
      await this.updateDocsFile(sectionId, newText);
      
      console.log(`  ✅ ${sectionId} aktualisiert`);
    } catch (error) {
      console.error(`  ❌ Fehler bei ${sectionId}:`, error.message);
    }
  }

  async analyzeChanges(sectionId, changedFiles) {
    // Analysiere geänderte Dateien
    const analysis = {
      files: changedFiles,
      features: [],
      props: [],
      functions: [],
    };

    for (const file of changedFiles) {
      try {
        const filePath = path.join(FRONTEND_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Extrahiere Features
        if (content.includes('Button')) analysis.features.push('Buttons');
        if (content.includes('Input')) analysis.features.push('Input-Felder');
        if (content.includes('HelpIcon')) analysis.features.push('Hilfe-Icons');
        if (content.includes('useState')) analysis.features.push('State-Management');
        if (content.includes('useEffect')) analysis.features.push('Side-Effects');
        if (content.includes('fetch') || content.includes('api')) analysis.features.push('API-Integration');
        
        // Extrahiere Props
        const propMatches = content.match(/interface\s+\w+Props\s*\{([^}]+)\}/s);
        if (propMatches) {
          propMatches[1].split('\n').forEach(line => {
            const match = line.match(/(\w+)(\??):/);
            if (match) analysis.props.push(match[1]);
          });
        }
        
        // Extrahiere Funktionen
        const funcMatches = content.matchAll(/(?:const|function)\s+(\w+)\s*[=:]\s*(?:async\s*)?\(/g);
        for (const match of funcMatches) {
          analysis.functions.push(match[1]);
        }
      } catch (error) {
        // Datei kann nicht gelesen werden (gelöscht?)
      }
    }

    return analysis;
  }

  async generateDocumentationText(sectionId, analysis) {
    // Nutze MCP Server für Text-Generierung
    // Falls MCP Server nicht verfügbar: Fallback-Logik
    
    const sectionTemplates = {
      registration: this.getRegistrationDoc(analysis),
      dashboard: this.getDashboardDoc(analysis),
      'bot-builder': this.getBotBuilderDoc(analysis),
      nodes: this.getNodesDoc(analysis),
      'whatsapp-setup': this.getWhatsAppSetupDoc(analysis),
      knowledge: this.getKnowledgeDoc(analysis),
      analytics: this.getAnalyticsDoc(analysis),
      templates: this.getTemplatesDoc(analysis),
      compliance: this.getComplianceDoc(analysis),
      settings: this.getSettingsDoc(analysis),
    };

    return sectionTemplates[sectionId] || this.getDefaultDoc(sectionId, analysis);
  }

  getRegistrationDoc(analysis) {
    let text = `Die Registrierung ist Ihr erster Schritt zur Nutzung des WhatsApp Bot Builders.\n\n`;
    
    if (analysis.features.includes('Input-Felder')) {
      text += `**Registrierungsformular:**\n`;
      text += `• Vollständiger Name (optional): Wird für die Personalisierung verwendet\n`;
      text += `• E-Mail-Adresse (erforderlich): Für Anmeldung und Benachrichtigungen\n`;
      text += `• Passwort (erforderlich): Mindestens 8 Zeichen mit Groß-/Kleinbuchstaben, einer Zahl und einem Sonderzeichen\n`;
      text += `• Passwort bestätigen: Zur Vermeidung von Tippfehlern\n`;
      text += `• Nutzungsbedingungen: Lesen und akzeptieren Sie die Bedingungen\n\n`;
    }
    
    text += `**E-Mail-Verifizierung:**\n`;
    text += `Nach erfolgreicher Registrierung erhalten Sie eine Bestätigungs-E-Mail. Klicken Sie auf den Link, um Ihr Konto zu verifizieren.\n\n`;
    
    text += `**Sicherheitstipps:**\n`;
    text += `• Verwenden Sie ein starkes, eindeutiges Passwort\n`;
    text += `• Geben Sie Ihre Anmeldedaten niemals weiter\n`;
    text += `• Melden Sie sich ab, wenn Sie öffentliche Computer nutzen`;
    
    return text;
  }

  getDashboardDoc(analysis) {
    let text = `Das Dashboard ist Ihr zentraler Hub für alle Ihre Bots.\n\n`;
    
    text += `**Dashboard-Funktionen:**\n\n`;
    text += `**1. Bot-Übersicht:**\n`;
    text += `• Liste aller erstellten Bots mit Status-Anzeige\n`;
    text += `• Schnellzugriff auf Bot-Funktionen (Bearbeiten, Analytics, Löschen)\n`;
    text += `• Suchfunktion zum schnellen Finden von Bots\n\n`;
    
    text += `**2. Statistik-Karten:**\n`;
    text += `• **Gesamt Bots:** Anzahl aller erstellten Bots\n`;
    text += `• **Aktive Bots:** Bots, die aktuell aktiv sind\n`;
    text += `• **Pausierte Bots:** Temporär deaktivierte Bots\n`;
    text += `• **Entwürfe:** Bots, die noch nicht veröffentlicht wurden\n\n`;
    
    text += `**Tipps:**\n`;
    text += `• Nutzen Sie die Suchfunktion, um schnell Bots zu finden\n`;
    text += `• Überprüfen Sie regelmäßig die Statistiken\n`;
    text += `• Verwenden Sie den Demo-Modus zum Testen neuer Features`;
    
    return text;
  }

  getBotBuilderDoc(analysis) {
    let text = `Der Bot Builder ist das Herzstück der Plattform – ein visueller Flow-Editor.\n\n`;
    
    text += `**Bot Builder Interface:**\n\n`;
    text += `**1. Node-Palette (links):**\n`;
    text += `Die Node-Palette zeigt alle verfügbaren Node-Typen: Trigger, Nachrichten, Fragen, Bedingungen, AI, Knowledge, End.\n\n`;
    
    text += `**2. Canvas (Mitte):**\n`;
    text += `Der Canvas ist der Hauptarbeitsbereich für Ihren Bot-Flow.\n`;
    text += `• Verschieben Sie Nodes durch Ziehen\n`;
    text += `• Verbinden Sie Nodes durch Klicken auf Verbindungspunkte\n`;
    text += `• Zoomen Sie mit dem Mausrad\n\n`;
    
    text += `**3. Eigenschaften-Panel (rechts):**\n`;
    text += `Wenn Sie auf einen Node klicken, öffnet sich das Eigenschaften-Panel.\n`;
    text += `Konfigurieren Sie Node-Einstellungen, Texte, Bedingungen.\n\n`;
    
    text += `**Workflow-Tipps:**\n`;
    text += `• Beginnen Sie immer mit einem Trigger-Node\n`;
    text += `• Verwenden Sie End-Nodes, um Gespräche zu beenden\n`;
    text += `• Testen Sie Ihren Flow regelmäßig mit der Vorschau-Funktion`;
    
    return text;
  }

  getNodesDoc(analysis) {
    return `Node-Typen sind die Bausteine Ihres Bot-Flows. Jeder Node hat eine spezifische Funktion:\n\n**📨 Nachrichten-Node:** Sendet Textnachrichten an den Benutzer.\n\n**❓ Fragen-Node:** Sammelt Antworten vom Benutzer.\n\n**🔀 Bedingungs-Node:** Implementiert Wenn-Dann-Logik.\n\n**🤖 AI-Node:** Nutzt KI für intelligente Antworten.\n\n**📚 Knowledge-Node:** Nutzt Ihre Wissensquellen für Antworten.\n\n**Tipp:** Klicken Sie auf einen Node, um ihn zu konfigurieren. Die Eigenschaften werden im rechten Panel angezeigt.`;
  }

  getWhatsAppSetupDoc(analysis) {
    return `Die WhatsApp Business API Einrichtung verbindet Ihren Bot mit WhatsApp.\n\n**Warum BSPs?**\nBSPs übernehmen die komplizierte Meta-Verifizierung für Sie. Setup-Zeit: 2-5 Minuten statt 2-3 Wochen.\n\n**Verfügbare BSPs:**\n1. **360dialog** (Empfohlen): EU-basiert, DSGVO-konform\n2. **Twilio**: Enterprise-Grade, $15 Testguthaben\n3. **MessageBird**: Global Communication Platform\n\n**Setup-Prozess:**\n1. Wählen Sie einen BSP im Setup-Wizard\n2. Lesen Sie die DSGVO-Hinweise\n3. Geben Sie Ihre API-Credentials ein\n4. Die Verbindung wird automatisch getestet\n5. Nach erfolgreicher Verbindung können Sie sofort starten`;
  }

  getKnowledgeDoc(analysis) {
    return `Wissensquellen machen Ihren Bot intelligent.\n\n**Verfügbare Quellen-Typen:**\n\n**📄 PDF hochladen:**\n• Unterstützte Formate: PDF\n• Maximale Dateigröße: 10 MB\n• Automatische Text-Extraktion\n\n**🔗 URL hinzufügen:**\n• Unterstützt verschiedene URL-Formate\n• Automatische Normalisierung\n• Extrahiert Inhalte von der Website\n\n**📝 Text eingeben:**\n• Direkte Texteingabe\n• Sofort verfügbar\n\n**Tipp:** Kombinieren Sie Wissensquellen mit AI-Nodes für optimale Ergebnisse.`;
  }

  getAnalyticsDoc(analysis) {
    return `Das Analytics Dashboard bietet umfassende Einblicke in die Performance Ihres Bots.\n\n**Hauptmetriken:**\n\n**💬 Gespräche:**\n• Gesamtanzahl aller Konversationen\n• Anzahl aktiver Gespräche\n• Verlauf über Zeit\n\n**📨 Nachrichten:**\n• Gesamtanzahl aller Nachrichten\n• Eingehende vs. ausgehende Nachrichten\n\n**📈 Conversion Rate:**\n• Prozentsatz erfolgreich abgeschlossener Gespräche\n• Trend-Analyse über Zeit\n\n**Tipp:** Überprüfen Sie Analytics regelmäßig, um Ihren Bot kontinuierlich zu verbessern.`;
  }

  getTemplatesDoc(analysis) {
    return `Templates sind vorgefertigte Bot-Flows, die Sie als Ausgangspunkt verwenden können.\n\n**Vorteile:**\n• ✅ Schneller Start (Minuten statt Stunden)\n• ✅ Bewährte Best Practices\n• ✅ Anpassbar an Ihre Bedürfnisse\n\n**Verfügbare Templates:**\n• Kundenservice\n• FAQ Bot\n• E-Commerce\n• Terminvereinbarung\n\n**Best Practices:**\n• Starten Sie mit Templates für schnelle Ergebnisse\n• Passen Sie Templates an Ihre Bedürfnisse an\n• Testen Sie Templates vor dem Live-Schalten`;
  }

  getComplianceDoc(analysis) {
    return `Die Plattform ist vollständig DSGVO-konform.\n\n**DSGVO-Konformität:**\n\n**✅ Datenhaltung:**\n• Alle Daten werden in der EU gespeichert\n• Verschlüsselte Speicherung (AES-256-GCM)\n\n**✅ Datenverarbeitung:**\n• Auftragsverarbeitungsvertrag (AVV) mit BSPs\n• Transparente Datenverarbeitung\n• Nutzer-Zustimmung erforderlich\n\n**Meta WhatsApp Compliance:**\nAb 15. Januar 2026 gelten neue Meta WhatsApp Richtlinien:\n• Allgemeine Konversations-Chatbots sind nicht mehr erlaubt\n• Bots müssen einen spezifischen Business-Use-Case haben`;
  }

  getSettingsDoc(analysis) {
    return `Die Einstellungsseite ermöglicht es Ihnen, Ihre Kontoinformationen zu verwalten.\n\n**Profil-Einstellungen:**\n• E-Mail-Adresse: Wird angezeigt, kann aber nicht geändert werden\n• Vollständiger Name: Kann jederzeit geändert werden\n\n**Account-Aktionen:**\n• Konto löschen: Permanentes Löschen Ihres Kontos und aller zugehörigen Daten\n\n**Wichtig:**\n• Änderungen werden sofort gespeichert\n• Beim Löschen des Kontos werden alle Daten unwiderruflich entfernt`;
  }

  getDefaultDoc(sectionId, analysis) {
    return `Diese Sektion beschreibt die Funktionen und Features.\n\n**Verfügbare Features:**\n${analysis.features.map(f => `• ${f}`).join('\n')}\n\n**Best Practices:**\n• Nutzen Sie die HelpIcons (?) für detaillierte Informationen\n• Testen Sie Funktionen im Demo-Modus`;
  }

  needsScreenshotUpdate(analysis) {
    // Entscheide ob Screenshot aktualisiert werden muss
    return analysis.features.length > 0 || 
           analysis.props.length > 0 || 
           analysis.functions.length > 0;
  }

  async createScreenshot(sectionId) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      await execAsync(
        `cd ${FRONTEND_DIR} && BASE_URL=http://localhost:3000 node scripts/generate-screenshots.js --section ${sectionId}`,
        { timeout: 60000 }
      );
    } catch (error) {
      console.error(`  ⚠️  Screenshot konnte nicht erstellt werden:`, error.message);
    }
  }

  async updateDocsFile(sectionId, newText) {
    const docsPath = path.join(FRONTEND_DIR, 'app/[locale]/docs/page.tsx');
    let content = await fs.readFile(docsPath, 'utf-8');
    
    // Finde und ersetze Content für die Sektion
    const sectionRegex = new RegExp(
      `(id:\\s*['"]${sectionId}['"][^}]*content:\\s*['"])([^'"]*)(['"])`,
      's'
    );
    
    if (sectionRegex.test(content)) {
      content = content.replace(sectionRegex, `$1${newText.replace(/'/g, "\\'")}$3`);
      await fs.writeFile(docsPath, content, 'utf-8');
      return true;
    }
    
    return false;
  }
}

// Starte Watcher
if (require.main === module) {
  const watcher = new DocsWatcher();
  watcher.start().catch(console.error);
}

module.exports = DocsWatcher;

