#!/usr/bin/env tsx

/**
 * Script zur Validierung der Screenshot-Kontext-Passung
 * Prüft, ob Screenshots zum beschriebenen Kontext passen
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

interface ScreenshotReference {
  src: string;
  alt: string;
  caption?: string;
  context: string;
  section: string;
}

interface ValidationResult {
  screenshot: string;
  exists: boolean;
  context: string;
  section: string;
  matchScore: number; // 1-5, wird manuell geprüft
  notes?: string;
}

// Hauptseite Screenshots
const homepageScreenshots: ScreenshotReference[] = [
  {
    src: '/screenshots/dashboard-demo.png',
    alt: 'Dashboard Screenshot - WhatsApp Bot Builder',
    context: 'Dashboard: Vollständige Übersicht aller Bots mit Real-time Analytics, Statistiken und Performance-Metriken',
    section: 'Hauptseite - Screenshot Cards',
  },
  {
    src: '/screenshots/bot-builder-demo.png',
    alt: 'Bot Builder Screenshot - Visueller Flow-Editor',
    context: 'Bot Builder: Visueller Drag & Drop Flow-Editor für die Erstellung komplexer Bot-Flows ohne Code',
    section: 'Hauptseite - Screenshot Cards',
  },
  {
    src: '/screenshots/features-demo.png',
    alt: 'Features Screenshot - WhatsApp Bot Builder Features',
    context: 'Features: Alle Features im Überblick: DSGVO-Compliance, AI-Integration, Analytics und mehr',
    section: 'Hauptseite - Screenshot Cards',
  },
  {
    src: '/screenshots/analytics-demo.png',
    alt: 'Analytics Screenshot - WhatsApp Bot Analytics',
    context: 'Analytics: Detaillierte Statistiken, Conversion-Tracking und Performance-Metriken für Ihre Bots',
    section: 'Hauptseite - Screenshot Cards',
  },
  {
    src: '/screenshots/knowledge-demo.png',
    alt: 'Wissensquellen Screenshot - RAG System',
    context: 'Wissensquellen: Integrieren Sie PDFs und URLs als Wissensbasis für präzise AI-Antworten',
    section: 'Hauptseite - Screenshot Cards',
  },
  {
    src: '/screenshots/settings-demo.png',
    alt: 'Einstellungen Screenshot - Bot Konfiguration',
    context: 'Einstellungen: Vollständige Kontrolle über Ihre Bot-Konfiguration, WhatsApp-Integration und Compliance-Einstellungen',
    section: 'Hauptseite - Screenshot Cards',
  },
];

// Dokumentations Screenshots (aus docs/page.tsx extrahiert)
const docsScreenshots: ScreenshotReference[] = [
  {
    src: '/docs/screenshots/registration-form.png',
    alt: 'Registrierungsformular',
    caption: 'Vollständiges Registrierungsformular mit allen erforderlichen Feldern und HelpIcons',
    context: 'Registrierung: Vollständiges Registrierungsformular mit E-Mail, Passwort, Bestätigung',
    section: 'Dokumentation - Registrierung',
  },
  {
    src: '/docs/screenshots/registration-email.png',
    alt: 'E-Mail-Feld',
    caption: 'E-Mail-Eingabefeld mit Validierung und Hilfetext',
    context: 'Registrierung: E-Mail-Eingabefeld mit Validierung',
    section: 'Dokumentation - Registrierung',
  },
  {
    src: '/docs/screenshots/registration-password.png',
    alt: 'Passwort-Feld',
    caption: 'Passwort-Eingabefeld mit Stärke-Anzeige und Sicherheitshinweisen',
    context: 'Registrierung: Passwort-Eingabefeld mit Stärke-Anzeige',
    section: 'Dokumentation - Registrierung',
  },
  {
    src: '/docs/screenshots/dashboard-overview.png',
    alt: 'Dashboard Übersicht',
    caption: 'Dashboard mit Bot-Übersicht, Statistiken und Schnellzugriff',
    context: 'Dashboard: Übersicht aller Bots mit Statistiken und Schnellzugriff',
    section: 'Dokumentation - Dashboard',
  },
  {
    src: '/docs/screenshots/dashboard-stats.png',
    alt: 'Dashboard Statistiken',
    caption: 'Statistik-Karten: Gesamt Bots, Aktive Bots, Pausierte Bots, Entwürfe',
    context: 'Dashboard: Statistik-Karten mit Bot-Zahlen',
    section: 'Dokumentation - Dashboard',
  },
  {
    src: '/docs/screenshots/bot-creation-form.png',
    alt: 'Bot-Erstellung Formular',
    caption: 'Formular zum Erstellen eines neuen Bots mit Name und Beschreibung',
    context: 'Bot-Erstellung: Formular mit Name und Beschreibung',
    section: 'Dokumentation - Bot-Erstellung',
  },
  {
    src: '/docs/screenshots/template-selector.png',
    alt: 'Vorlagen-Auswahl',
    caption: 'Vorlagen-Auswahl-Dialog mit vorgefertigten Bot-Flows',
    context: 'Bot-Erstellung: Vorlagen-Auswahl-Dialog',
    section: 'Dokumentation - Bot-Erstellung',
  },
  {
    src: '/docs/screenshots/bot-builder-canvas.png',
    alt: 'Bot Builder Canvas',
    caption: 'Bot Builder mit Node-Palette (links), Canvas (Mitte) und Eigenschaften-Panel (rechts)',
    context: 'Bot Builder: Canvas mit Node-Palette, Canvas und Eigenschaften-Panel',
    section: 'Dokumentation - Bot Builder',
  },
  {
    src: '/docs/screenshots/node-palette.png',
    alt: 'Node-Palette',
    caption: 'Alle verfügbaren Node-Typen in der Palette: Trigger, Nachrichten, Fragen, Bedingungen, AI, Knowledge, End',
    context: 'Bot Builder: Node-Palette mit allen Node-Typen',
    section: 'Dokumentation - Bot Builder',
  },
  {
    src: '/docs/screenshots/node-properties.png',
    alt: 'Node-Eigenschaften',
    caption: 'Eigenschaften-Panel zum Bearbeiten von Node-Einstellungen, Texten und Konfigurationen',
    context: 'Bot Builder: Eigenschaften-Panel für Node-Konfiguration',
    section: 'Dokumentation - Bot Builder',
  },
  {
    src: '/docs/screenshots/node-connections.png',
    alt: 'Node-Verbindungen',
    caption: 'Nodes werden durch Klicken auf Verbindungspunkte (Kreise) miteinander verbunden',
    context: 'Bot Builder: Node-Verbindungen durch Verbindungspunkte',
    section: 'Dokumentation - Bot Builder',
  },
  {
    src: '/docs/screenshots/message-node.png',
    alt: 'Nachrichten-Node',
    caption: 'Nachrichten-Node: Textnachricht konfigurieren und senden',
    context: 'Bot Builder: Nachrichten-Node Konfiguration',
    section: 'Dokumentation - Nodes',
  },
  {
    src: '/docs/screenshots/question-node.png',
    alt: 'Fragen-Node',
    caption: 'Fragen-Node: Frage und Antwortoptionen einrichten',
    context: 'Bot Builder: Fragen-Node mit Antwortoptionen',
    section: 'Dokumentation - Nodes',
  },
  {
    src: '/docs/screenshots/condition-node.png',
    alt: 'Bedingungs-Node',
    caption: 'Bedingungs-Node: Wenn-Dann-Logik konfigurieren',
    context: 'Bot Builder: Bedingungs-Node für Wenn-Dann-Logik',
    section: 'Dokumentation - Nodes',
  },
  {
    src: '/docs/screenshots/ai-node.png',
    alt: 'AI-Node',
    caption: 'AI-Node: Prompt und KI-Einstellungen konfigurieren',
    context: 'Bot Builder: AI-Node für KI-Konfiguration',
    section: 'Dokumentation - Nodes',
  },
  {
    src: '/docs/screenshots/knowledge-node.png',
    alt: 'Knowledge-Node',
    caption: 'Knowledge-Node: Wissensquellen auswählen und konfigurieren',
    context: 'Bot Builder: Knowledge-Node für Wissensquellen',
    section: 'Dokumentation - Nodes',
  },
  {
    src: '/docs/screenshots/whatsapp-setup-wizard.png',
    alt: 'WhatsApp Setup Wizard',
    caption: 'WhatsApp Setup Wizard - Schritt 1: BSP-Auswahl und Übersicht',
    context: 'WhatsApp Setup: Wizard mit BSP-Auswahl',
    section: 'Dokumentation - WhatsApp Setup',
  },
  {
    src: '/docs/screenshots/bsp-selection.png',
    alt: 'BSP-Auswahl',
    caption: 'Auswahl zwischen 360dialog, Twilio und MessageBird mit Feature-Vergleich',
    context: 'WhatsApp Setup: BSP-Auswahl (360dialog, Twilio, MessageBird)',
    section: 'Dokumentation - WhatsApp Setup',
  },
  {
    src: '/docs/screenshots/gdpr-consent.png',
    alt: 'DSGVO-Consent',
    caption: 'DSGVO-Consent-Checkboxen für Datenverarbeitung und AVV',
    context: 'WhatsApp Setup: DSGVO-Consent-Checkboxen',
    section: 'Dokumentation - WhatsApp Setup',
  },
  {
    src: '/docs/screenshots/360dialog-dashboard.png',
    alt: '360dialog Dashboard',
    caption: '360dialog Dashboard - API Keys finden und kopieren',
    context: '360dialog: Dashboard mit API Keys',
    section: 'Dokumentation - 360dialog',
  },
  {
    src: '/docs/screenshots/360dialog-api-key.png',
    alt: '360dialog API-Key Eingabe',
    caption: 'Eingabefeld für 360dialog API-Key im Setup-Wizard',
    context: '360dialog: API-Key Eingabefeld',
    section: 'Dokumentation - 360dialog',
  },
  {
    src: '/docs/screenshots/360dialog-success.png',
    alt: '360dialog Verbindung erfolgreich',
    caption: 'Erfolgreiche Verbindung mit 360dialog - Bot ist einsatzbereit',
    context: '360dialog: Erfolgreiche Verbindung',
    section: 'Dokumentation - 360dialog',
  },
  {
    src: '/docs/screenshots/twilio-credentials.png',
    alt: 'Twilio Credentials Eingabe',
    caption: 'Eingabefelder für Twilio Account SID und Auth Token',
    context: 'Twilio: Credentials Eingabefelder',
    section: 'Dokumentation - Twilio',
  },
  {
    src: '/docs/screenshots/messagebird-api-key.png',
    alt: 'MessageBird API-Key Eingabe',
    caption: 'Eingabefeld für MessageBird API-Key',
    context: 'MessageBird: API-Key Eingabefeld',
    section: 'Dokumentation - MessageBird',
  },
  {
    src: '/docs/screenshots/knowledge-overview.png',
    alt: 'Wissensquellen Übersicht',
    caption: 'Übersicht aller Wissensquellen mit Status-Anzeige (Bereit, In Verarbeitung, Fehler)',
    context: 'Wissensquellen: Übersicht mit Status-Anzeige',
    section: 'Dokumentation - Wissensquellen',
  },
  {
    src: '/docs/screenshots/pdf-upload.png',
    alt: 'PDF hochladen',
    caption: 'PDF-Upload-Funktion mit Dateiauswahl und Drag & Drop',
    context: 'Wissensquellen: PDF-Upload mit Drag & Drop',
    section: 'Dokumentation - Wissensquellen',
  },
  {
    src: '/docs/screenshots/url-add.png',
    alt: 'URL hinzufügen',
    caption: 'URL-Eingabefeld mit automatischer Normalisierung und Validierung',
    context: 'Wissensquellen: URL-Eingabefeld',
    section: 'Dokumentation - Wissensquellen',
  },
  {
    src: '/docs/screenshots/text-input.png',
    alt: 'Text eingeben',
    caption: 'Text-Eingabefelder für Titel und Inhalt',
    context: 'Wissensquellen: Text-Eingabefelder',
    section: 'Dokumentation - Wissensquellen',
  },
  {
    src: '/docs/screenshots/knowledge-processing.png',
    alt: 'Verarbeitungs-Status',
    caption: 'Status-Anzeige während der Verarbeitung (In Verarbeitung, Bereit, Fehler)',
    context: 'Wissensquellen: Verarbeitungs-Status',
    section: 'Dokumentation - Wissensquellen',
  },
  {
    src: '/docs/screenshots/analytics-dashboard.png',
    alt: 'Analytics Dashboard',
    caption: 'Analytics Dashboard mit allen Metriken: Gespräche, Nachrichten, Conversion Rate',
    context: 'Analytics: Dashboard mit Metriken',
    section: 'Dokumentation - Analytics',
  },
  {
    src: '/docs/screenshots/analytics-metrics.png',
    alt: 'Analytics Metriken',
    caption: 'Detaillierte Metriken-Karten: Gespräche, Nachrichten, Conversion mit Untermetriken',
    context: 'Analytics: Detaillierte Metriken-Karten',
    section: 'Dokumentation - Analytics',
  },
  {
    src: '/docs/screenshots/analytics-trends.png',
    alt: 'Tägliche Trends',
    caption: 'Tägliche Trends-Grafik für Nachrichten und Gespräche (letzte 7 Tage)',
    context: 'Analytics: Tägliche Trends-Grafik',
    section: 'Dokumentation - Analytics',
  },
  {
    src: '/docs/screenshots/template-multi-tier.png',
    alt: 'Multi-Tier Support Vorlage',
    caption: 'Empfohlene Multi-Tier Support Vorlage mit Tier-1 Automatisierung und Tier-2 Eskalation',
    context: 'Vorlagen: Multi-Tier Support Vorlage',
    section: 'Dokumentation - Vorlagen',
  },
  {
    src: '/docs/screenshots/template-customer-service.png',
    alt: 'Kundenservice-Vorlage',
    caption: 'Kundenservice-Vorlage mit Flow-Struktur: Trigger → Begrüßung → Bedingung → FAQ/Ticket/Status',
    context: 'Vorlagen: Kundenservice-Vorlage',
    section: 'Dokumentation - Vorlagen',
  },
  {
    src: '/docs/screenshots/template-e-commerce.png',
    alt: 'E-Commerce-Vorlage',
    caption: 'E-Commerce-Vorlage mit Flow-Struktur: Trigger → Begrüßung → Bedingung → Produktsuche/Bestellung/Status',
    context: 'Vorlagen: E-Commerce-Vorlage',
    section: 'Dokumentation - Vorlagen',
  },
  {
    src: '/docs/screenshots/template-booking.png',
    alt: 'Buchungs-Vorlage',
    caption: 'Buchungs-Vorlage mit Flow-Struktur: Trigger → Begrüßung → Datum-Frage → Verfügbarkeit → Buchung',
    context: 'Vorlagen: Buchungs-Vorlage',
    section: 'Dokumentation - Vorlagen',
  },
  {
    src: '/docs/screenshots/compliance-panel.png',
    alt: 'Compliance-Panel',
    caption: 'Compliance-Check-Panel mit Status-Anzeige für alle Compliance-Bereiche',
    context: 'Compliance: Check-Panel mit Status',
    section: 'Dokumentation - Compliance',
  },
  {
    src: '/docs/screenshots/settings-profile.png',
    alt: 'Einstellungen Profil',
    caption: 'Profil-Einstellungen: E-Mail-Adresse und Vollständiger Name',
    context: 'Einstellungen: Profil-Einstellungen',
    section: 'Dokumentation - Einstellungen',
  },
  {
    src: '/docs/screenshots/settings-account.png',
    alt: 'Account-Aktionen',
    caption: 'Account-Aktionen: Konto löschen mit Warnung',
    context: 'Einstellungen: Account-Aktionen',
    section: 'Dokumentation - Einstellungen',
  },
  {
    src: '/docs/screenshots/embed-code-generator.png',
    alt: 'Bot einbinden - Code Generator',
    caption: 'Embed Code Generator mit Einfach/Experten-Modus Toggle',
    context: 'Bot einbinden: Code Generator',
    section: 'Dokumentation - Bot einbinden',
  },
];

function validateScreenshots(
  screenshots: ScreenshotReference[],
  publicPath: string,
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const screenshot of screenshots) {
    const filePath = screenshot.src.startsWith('/')
      ? screenshot.src.slice(1)
      : screenshot.src;
    const fullPath = join(publicPath, filePath);
    const exists = existsSync(fullPath);

    results.push({
      screenshot: screenshot.src,
      exists,
      context: screenshot.context,
      section: screenshot.section,
      matchScore: exists ? 3 : 0, // Default: 3 (muss manuell geprüft werden), 0 wenn nicht existiert
      notes: exists
        ? 'Datei existiert - Kontext-Passung muss manuell geprüft werden'
        : 'Datei fehlt - Muss erstellt werden',
    });
  }

  return results;
}

function main() {
  const publicPath = join(process.cwd(), 'public');
  console.log('🔍 Validiere Screenshots...\n');
  console.log(`Public Path: ${publicPath}\n`);

  const homepageResults = validateScreenshots(homepageScreenshots, publicPath);
  const docsResults = validateScreenshots(docsScreenshots, publicPath);

  console.log('📊 VALIDIERUNGS-REPORT\n');
  console.log('='.repeat(80));
  console.log('\n🏠 HAUPTSEITE SCREENSHOTS\n');
  console.log('-'.repeat(80));

  let homepageMissing = 0;
  let homepageExists = 0;

  for (const result of homepageResults) {
    const status = result.exists ? '✅' : '❌';
    console.log(`${status} ${result.screenshot}`);
    console.log(`   Kontext: ${result.context}`);
    console.log(`   Status: ${result.exists ? 'Existiert' : 'FEHLT'}`);
    console.log(`   Passung: ${result.matchScore}/5 (manuell zu prüfen)`);
    if (result.notes) {
      console.log(`   Hinweis: ${result.notes}`);
    }
    console.log('');

    if (result.exists) {
      homepageExists++;
    } else {
      homepageMissing++;
    }
  }

  console.log('\n📚 DOKUMENTATIONS SCREENSHOTS\n');
  console.log('-'.repeat(80));

  let docsMissing = 0;
  let docsExists = 0;

  for (const result of docsResults) {
    const status = result.exists ? '✅' : '❌';
    console.log(`${status} ${result.screenshot}`);
    console.log(`   Kontext: ${result.context}`);
    console.log(`   Status: ${result.exists ? 'Existiert' : 'FEHLT'}`);
    console.log(`   Passung: ${result.matchScore}/5 (manuell zu prüfen)`);
    if (result.notes) {
      console.log(`   Hinweis: ${result.notes}`);
    }
    console.log('');

    if (result.exists) {
      docsExists++;
    } else {
      docsMissing++;
    }
  }

  console.log('\n📈 ZUSAMMENFASSUNG\n');
  console.log('-'.repeat(80));
  console.log(`Hauptseite: ${homepageExists}/${homepageResults.length} vorhanden, ${homepageMissing} fehlen`);
  console.log(`Dokumentation: ${docsExists}/${docsResults.length} vorhanden, ${docsMissing} fehlen`);
  console.log(`Gesamt: ${homepageExists + docsExists}/${homepageResults.length + docsResults.length} vorhanden, ${homepageMissing + docsMissing} fehlen`);

  if (homepageMissing > 0 || docsMissing > 0) {
    console.log('\n⚠️  FEHLENDE SCREENSHOTS:\n');
    [...homepageResults, ...docsResults]
      .filter((r) => !r.exists)
      .forEach((r) => {
        console.log(`  - ${r.screenshot} (${r.section})`);
      });
  }

  console.log('\n💡 NÄCHSTE SCHRITTE:');
  console.log('1. Prüfe manuell die Kontext-Passung der vorhandenen Screenshots');
  console.log('2. Erstelle fehlende Screenshots aus der App (keine Placeholder)');
  console.log('3. Ersetze Screenshots, die nicht zum Kontext passen');
  console.log('');
}

main();

