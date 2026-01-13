'use client';

export const dynamic = 'force-dynamic';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';

interface DocSection {
  id: string;
  title: string;
  content: string;
  category: string;
  screenshots?: { src: string; alt: string; caption?: string }[];
  relatedSections?: string[];
}

export default function DocumentationPage() {
  const locale = useLocale();
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Vollständige Dokumentations-Sektionen - Professionell überarbeitet
  const docSections: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Erste Schritte',
      category: 'Grundlagen',
      content: `Willkommen beim WhatsApp Bot Builder – der professionellen No-Code-Plattform zur Erstellung intelligenter WhatsApp Business Bots.

**Was ist der WhatsApp Bot Builder?**
Der WhatsApp Bot Builder ist eine vollständig funktionsfähige SaaS-Plattform, die es Unternehmen ermöglicht, in wenigen Minuten professionelle WhatsApp Business Bots zu erstellen – ohne Programmierkenntnisse. Mit visuellem Flow-Editor, KI-Integration, RAG-System (Retrieval-Augmented Generation) und DSGVO-konformer Datenhaltung ist es die perfekte Lösung für den deutschen und europäischen Markt.

**Hauptfunktionen:**
• 🎨 Visueller Flow-Editor (Drag & Drop) – Erstellen Sie komplexe Bot-Flows mit der Maus
• 🤖 KI-gestützte Antworten – Nutzen Sie ChatGPT-ähnliche KI für intelligente Gespräche
• 📚 Wissensquellen-Management – Integrieren Sie PDFs, URLs und Texte als Wissensbasis
• 📊 Analytics & Performance-Tracking – Detaillierte Einblicke in Bot-Performance
• 🔒 DSGVO-konform – 100% EU-Datenhaltung, verschlüsselte Speicherung
• 🔗 WhatsApp Business API Integration – Unterstützung für 360dialog, Twilio, MessageBird
• 🎯 Meta Compliance – Automatische Compliance-Prüfung für Meta WhatsApp Richtlinien
• 📱 Multi-Channel Support – WhatsApp, Web Chat, Customer Service Chat

**Schnellstart (5 Minuten):**
1. Registrieren Sie sich kostenlos auf der Startseite
2. Erstellen Sie Ihren ersten Bot im Dashboard
3. Verbinden Sie WhatsApp über einen BSP (360dialog empfohlen)
4. Konfigurieren Sie Ihren Bot-Flow im visuellen Editor
5. Starten Sie Ihre ersten Gespräche

**Demo-Modus:**
Testen Sie alle Features kostenlos im Demo-Modus unter /demo/dashboard, ohne Registrierung. Der Demo-Modus zeigt alle Funktionen mit echten Daten, aber ohne WhatsApp-Verbindung.`,
      relatedSections: ['registration', 'dashboard', 'bot-creation'],
    },
    {
      id: 'registration',
      title: 'Registrierung und Anmeldung',
      category: 'Grundlagen',
      content: `Die Registrierung ist Ihr erster Schritt zur Nutzung des WhatsApp Bot Builders. Unser System ist vollständig DSGVO-konform und speichert Ihre Daten sicher in der EU.

**Registrierungsprozess:**

1. **Startseite:**
   Klicken Sie auf "Kostenlos starten" oder "Registrieren" in der Navigation oder auf der Startseite.

2. **Registrierungsformular:**
   • **Vollständiger Name (optional):** Wird für die Personalisierung Ihres Kontos verwendet. Kann später jederzeit geändert werden.
   • **E-Mail-Adresse (erforderlich):** Wird für Anmeldung, Benachrichtigungen und wichtige Updates verwendet. Muss gültig und eindeutig sein.
   • **Passwort (erforderlich):** Mindestens 8 Zeichen mit Groß-/Kleinbuchstaben, einer Zahl und einem Sonderzeichen für maximale Sicherheit.
   • **Passwort bestätigen:** Geben Sie das Passwort erneut ein, um Tippfehler zu vermeiden.
   • **Nutzungsbedingungen & Datenschutz:** Lesen Sie die Bedingungen sorgfältig und akzeptieren Sie diese.

3. **E-Mail-Verifizierung:**
   Nach erfolgreicher Registrierung erhalten Sie eine Bestätigungs-E-Mail. Klicken Sie auf den Link in der E-Mail, um Ihr Konto zu verifizieren. Ohne Verifizierung können Sie keine Bots erstellen.

4. **Anmeldung:**
   Nach der Verifizierung können Sie sich mit Ihrer E-Mail-Adresse und Ihrem Passwort anmelden.

**Passwort zurücksetzen:**
Falls Sie Ihr Passwort vergessen haben, nutzen Sie die "Passwort vergessen" Funktion auf der Anmeldeseite. Sie erhalten eine E-Mail mit einem Reset-Link.

**Sicherheitstipps:**
• Verwenden Sie ein starkes, eindeutiges Passwort
• Geben Sie Ihre Anmeldedaten niemals weiter
• Melden Sie sich ab, wenn Sie öffentliche Computer nutzen
• Aktivieren Sie die 2-Faktor-Authentifizierung (wenn verfügbar)`,
      screenshots: [
        { src: '/docs/screenshots/registration-form.png', alt: 'Registrierungsformular', caption: 'Vollständiges Registrierungsformular mit allen erforderlichen Feldern und HelpIcons' },
        { src: '/docs/screenshots/registration-email.png', alt: 'E-Mail-Feld', caption: 'E-Mail-Eingabefeld mit Validierung und Hilfetext' },
        { src: '/docs/screenshots/registration-password.png', alt: 'Passwort-Feld', caption: 'Passwort-Eingabefeld mit Stärke-Anzeige und Sicherheitshinweisen' },
      ],
      relatedSections: ['getting-started', 'login', 'settings'],
    },
    {
      id: 'login',
      title: 'Anmeldung',
      category: 'Grundlagen',
      content: `Die Anmeldung ist einfach und sicher. Nach der Registrierung können Sie sich jederzeit mit Ihrer E-Mail-Adresse und Ihrem Passwort anmelden.

**Anmeldeprozess:**
1. Öffnen Sie die Anmeldeseite (/auth/login)
2. Geben Sie Ihre E-Mail-Adresse ein
3. Geben Sie Ihr Passwort ein
4. Klicken Sie auf "Anmelden"

**Bei Problemen:**
• **Passwort vergessen:** Nutzen Sie "Passwort vergessen" und folgen Sie den Anweisungen in der E-Mail
• **Konto nicht verifiziert:** Prüfen Sie Ihre E-Mails (auch Spam-Ordner) und klicken Sie auf den Verifizierungs-Link
• **Fehlermeldung:** Kontaktieren Sie den Support oder versuchen Sie es erneut

**Sicherheit:**
Ihre Anmeldedaten werden verschlüsselt übertragen (HTTPS) und sicher in Supabase gespeichert. Die Plattform verwendet modernste Sicherheitsstandards.`,
      relatedSections: ['registration'],
    },
    {
      id: 'dashboard',
      title: 'Dashboard Übersicht',
      category: 'Grundlagen',
      content: `Das Dashboard ist Ihr zentraler Hub für alle Ihre Bots. Hier erhalten Sie einen vollständigen Überblick über Ihre Bot-Aktivitäten, Statistiken und Performance.

**Dashboard-Funktionen:**

**1. Bot-Übersicht:**
• Liste aller erstellten Bots mit Status-Anzeige (Aktiv, Pausiert, Entwurf)
• Schnellzugriff auf Bot-Funktionen (Bearbeiten, Analytics, Löschen)
• Suchfunktion zum schnellen Finden von Bots
• Filter-Optionen nach Status

**2. Statistik-Karten:**
• **Gesamt Bots:** Anzahl aller erstellten Bots (unabhängig vom Status)
• **Aktive Bots:** Bots, die aktuell aktiv sind und WhatsApp-Nachrichten empfangen/senden können
• **Pausierte Bots:** Temporär deaktivierte Bots (können jederzeit wieder aktiviert werden)
• **Entwürfe:** Bots, die noch nicht veröffentlicht wurden

**3. Schnellzugriff:**
• "Neuen Bot erstellen" Button für schnelle Bot-Erstellung
• Demo-Modus für Tests ohne Registrierung
• Direkter Zugriff auf Analytics
• Einstellungen und Kontoverwaltung

**4. Navigation:**
• **Dashboard:** Zurück zur Übersicht
• **Bots:** Bot-Übersicht und Verwaltung (leitet zum Dashboard um)
• **Einstellungen:** Kontoverwaltung, Profil-Einstellungen, Konto löschen

**Tipps:**
• Nutzen Sie die Suchfunktion, um schnell Bots zu finden
• Überprüfen Sie regelmäßig die Statistiken
• Verwenden Sie den Demo-Modus zum Testen neuer Features
• Pausieren Sie Bots statt sie zu löschen, wenn Sie sie später wieder brauchen`,
      screenshots: [
        { src: '/docs/screenshots/dashboard-overview.png', alt: 'Dashboard Übersicht', caption: 'Dashboard mit Bot-Übersicht, Statistiken und Schnellzugriff' },
        { src: '/docs/screenshots/dashboard-stats.png', alt: 'Dashboard Statistiken', caption: 'Statistik-Karten: Gesamt Bots, Aktive Bots, Pausierte Bots, Entwürfe' },
      ],
      relatedSections: ['bot-creation', 'bot-management', 'analytics'],
    },
    {
      id: 'bot-creation',
      title: 'Neuen Bot erstellen',
      category: 'Bot-Erstellung',
      content: `Die Bot-Erstellung ist der erste Schritt zur Automatisierung Ihrer WhatsApp-Kommunikation. Mit unserem visuellen Editor können Sie komplexe Bot-Flows ohne Programmierkenntnisse erstellen.

**Bot-Erstellung:**

**1. Bot-Daten:**
• **Bot-Name (erforderlich):** Ein aussagekräftiger Name für Ihren Bot (z.B. "Kundenservice Bot" oder "Bestell-Bot")
• **Beschreibung (optional):** Kurze Beschreibung des Bot-Zwecks für bessere Organisation

**2. Erstellungsoptionen:**
• **Von Grund auf:** Erstellen Sie einen komplett neuen Bot-Flow mit dem visuellen Editor
• **Vorlage verwenden:** Starten Sie mit einer vorgefertigten Vorlage (z.B. Multi-Tier Support, Kundenservice, FAQ, E-Commerce, Buchungen)

**3. Nach der Erstellung:**
Nach dem Erstellen werden Sie zum Bot Builder weitergeleitet, wo Sie:
• Den Bot-Flow visuell erstellen
• Nodes hinzufügen und konfigurieren
• Wissensquellen hinzufügen
• WhatsApp verbinden
• Den Bot testen

**Best Practices:**
• Verwenden Sie aussagekräftige Namen (z.B. "Kundenservice - Produktberatung")
• Starten Sie mit Vorlagen für schnelle Ergebnisse
• Planen Sie den Bot-Flow vor der Erstellung (Flowchart auf Papier)
• Testen Sie regelmäßig während der Erstellung`,
      screenshots: [
        { src: '/docs/screenshots/bot-creation-form.png', alt: 'Bot-Erstellung Formular', caption: 'Formular zum Erstellen eines neuen Bots mit Name und Beschreibung' },
        { src: '/docs/screenshots/template-selector.png', alt: 'Vorlagen-Auswahl', caption: 'Vorlagen-Auswahl-Dialog mit vorgefertigten Bot-Flows' },
      ],
      relatedSections: ['bot-builder', 'templates', 'whatsapp-setup'],
    },
    {
      id: 'bot-builder',
      title: 'Bot Builder - Visueller Flow-Editor',
      category: 'Bot-Erstellung',
      content: `Der Bot Builder ist das Herzstück der Plattform – ein visueller Flow-Editor, der es Ihnen ermöglicht, komplexe Bot-Flows ohne Code zu erstellen.

**Bot Builder Interface:**

**1. Node-Palette (links):**
Die Node-Palette zeigt alle verfügbaren Node-Typen:
• 🎬 Trigger: Startpunkt (WhatsApp, Web Chat, Keyword)
• 📨 Nachricht: Textnachrichten senden
• ❓ Frage: Antworten vom Benutzer sammeln
• 🔀 Bedingung: Wenn-Dann-Logik implementieren
• 🤖 AI Antwort: KI-gestützte intelligente Antworten
• 📚 Wissensquelle: PDF, URL oder Text hinzufügen
• 🏁 Ende: Gespräch beenden

**Hinzufügen von Nodes:**
• Klicken Sie auf einen Node-Typ in der Palette
• Der Node wird automatisch zum Canvas hinzugefügt
• Oder ziehen Sie Nodes per Drag & Drop auf den Canvas

**2. Canvas (Mitte):**
Der Canvas ist der Hauptarbeitsbereich für Ihren Bot-Flow:
• **Verschieben:** Ziehen Sie Nodes, um sie zu positionieren
• **Verbinden:** Klicken Sie auf Verbindungspunkte (Kreise), um Nodes zu verbinden
• **Zoomen:** Verwenden Sie das Mausrad oder die Zoom-Steuerelemente
• **Pan:** Halten Sie die Leertaste und ziehen Sie, um den Canvas zu bewegen
• **Mehrfachauswahl:** Halten Sie Strg/Cmd und klicken Sie auf mehrere Nodes

**3. Eigenschaften-Panel (rechts):**
Wenn Sie auf einen Node klicken, öffnet sich das Eigenschaften-Panel:
• Konfigurieren Sie Node-Einstellungen
• Bearbeiten Sie Texte, Fragen, Bedingungen
• Wählen Sie Wissensquellen aus
• Speichern Sie Änderungen mit "Speichern"

**4. Steuerelemente:**
• **Speichern:** Speichert den aktuellen Bot-Flow
• **Vorschau:** Testet den Bot-Flow ohne WhatsApp-Verbindung
• **Zurücksetzen:** Setzt alle Änderungen zurück
• **Löschen:** Löscht den ausgewählten Node

**Workflow-Tipps:**
• Beginnen Sie immer mit einem Trigger-Node
• Verwenden Sie End-Nodes, um Gespräche zu beenden
• Testen Sie Ihren Flow regelmäßig mit der Vorschau-Funktion
• Nutzen Sie Bedingungs-Nodes für komplexe Logik
• Kombinieren Sie AI-Nodes mit Wissensquellen für beste Ergebnisse`,
      screenshots: [
        { src: '/docs/screenshots/bot-builder-canvas.png', alt: 'Bot Builder Canvas', caption: 'Bot Builder mit Node-Palette (links), Canvas (Mitte) und Eigenschaften-Panel (rechts)' },
        { src: '/docs/screenshots/node-palette.png', alt: 'Node-Palette', caption: 'Alle verfügbaren Node-Typen in der Palette: Trigger, Nachrichten, Fragen, Bedingungen, AI, Knowledge, End' },
        { src: '/docs/screenshots/node-properties.png', alt: 'Node-Eigenschaften', caption: 'Eigenschaften-Panel zum Bearbeiten von Node-Einstellungen, Texten und Konfigurationen' },
        { src: '/docs/screenshots/node-connections.png', alt: 'Node-Verbindungen', caption: 'Nodes werden durch Klicken auf Verbindungspunkte (Kreise) miteinander verbunden' },
      ],
      relatedSections: ['nodes', 'bot-creation', 'templates'],
    },
    {
      id: 'nodes',
      title: 'Node-Typen und detaillierte Verwendung',
      category: 'Bot-Erstellung',
      content: `Node-Typen sind die Bausteine Ihres Bot-Flows. Jeder Node hat eine spezifische Funktion und Konfigurationsoptionen.

**🎬 Trigger-Node:**
Der Trigger-Node ist der Startpunkt jedes Bot-Flows.

**Typen:**
• **WhatsApp:** Startet bei eingehender WhatsApp-Nachricht
• **Web Chat:** Startet bei Nachricht im Web-Chat
• **Keyword:** Startet bei bestimmten Schlüsselwörtern
• **Always:** Startet sofort (für Tests)

**Konfiguration:**
• Wählen Sie den Trigger-Typ
• Bei Keyword: Geben Sie die Schlüsselwörter ein (kommagetrennt)

**📨 Nachrichten-Node:**
Sendet Textnachrichten an den Benutzer.

**Konfiguration:**
• **Nachrichtentext (erforderlich):** Der Text, der gesendet werden soll
• **Node-Label (optional):** Interne Bezeichnung für bessere Organisation
• **Formatierung:** Unterstützt Markdown-ähnliche Formatierung

**Verwendung:**
• Begrüßungsnachrichten
• Informationsnachrichten
• Bestätigungen
• Mehrere Nachrichten hintereinander (mehrere Nodes)

**❓ Fragen-Node:**
Sammelt Antworten vom Benutzer.

**Konfiguration:**
• **Frage (erforderlich):** Die Frage, die gestellt wird
• **Antwortoptionen (optional):** Vordefinierte Antworten (Buttons)
• **Freitext erlauben:** Benutzer kann eigene Antwort eingeben

**Verwendung:**
• Umfragen
• Bestätigungen
• Auswahlmöglichkeiten
• Daten sammeln

**Verbindungen:**
• Jede Antwortoption kann zu einem anderen Node führen
• Freitext-Antworten können mit Bedingungs-Nodes verarbeitet werden

**🔀 Bedingungs-Node:**
Implementiert Wenn-Dann-Logik basierend auf Benutzerantworten oder Variablen.

**Konfiguration:**
• **Bedingungstyp:**
  - Wenn Antwort gleich
  - Wenn Antwort enthält
  - Wenn Variable
  - Wenn Datum/Zeit
• **Wert:** Der Wert, der geprüft werden soll
• **Vergleichsoperator:** Gleich, Ungleich, Größer, Kleiner, Enthält

**Verbindungen:**
• **True:** Wenn Bedingung erfüllt ist
• **False:** Wenn Bedingung nicht erfüllt ist

**Verwendung:**
• Routing basierend auf Antworten
• Validierung von Eingaben
• Komplexe Entscheidungslogik

**🤖 AI-Node:**
Nutzt KI für intelligente, kontextbezogene Antworten.

**Konfiguration:**
• **AI-Prompt (erforderlich):** Anweisungen für die KI (z.B. "Du bist ein hilfreicher Kundenservice-Assistent. Antworte auf Deutsch und sei freundlich.")
• **Wissensquellen verwenden:** Aktivieren Sie diese Option, um Ihre Wissensquellen zu nutzen
• **Temperatur (optional):** Kreativität der Antworten (0.0-1.0)
• **Max. Tokens (optional):** Maximale Antwortlänge

**Verwendung:**
• Intelligente Kundenservice-Antworten
• Produktberatung
• FAQ-Antworten
• Kontextbezogene Gespräche

**Kombination mit Wissensquellen:**
Wenn aktiviert, nutzt die KI Ihre hochgeladenen PDFs, URLs und Texte für präzise Antworten.

**📚 Knowledge-Node:**
Nutzt Ihre Wissensquellen für spezifische Informationen.

**Konfiguration:**
• **Wissensquellen auswählen:** Wählen Sie eine oder mehrere Quellen aus (PDF, URL, Text)
• **Suchstrategie:** 
  - Automatisch: Beste Quellen werden automatisch gewählt
  - Manuell: Wählen Sie spezifische Quellen

**Verwendung:**
• Produktinformationen
• FAQ-Datenbank
• Anleitungen
• Spezifische Dokumentation

**🏁 End-Node:**
Beendet das Gespräch.

**Konfiguration:**
• **Abschlussnachricht (optional):** Letzte Nachricht vor Beendigung
• **Bewertung anfordern (optional):** Bitte um Feedback

**Verwendung:**
• Gesprächsende
• Abschlussbestätigungen
• Nach Kundenanfragen

**Best Practices:**
• Klicken Sie auf einen Node, um ihn zu konfigurieren
• Verwenden Sie aussagekräftige Labels für bessere Organisation
• Testen Sie jeden Node einzeln
• Kombinieren Sie verschiedene Node-Typen für komplexe Flows`,
      screenshots: [
        { src: '/docs/screenshots/message-node.png', alt: 'Nachrichten-Node', caption: 'Nachrichten-Node: Textnachricht konfigurieren und senden' },
        { src: '/docs/screenshots/question-node.png', alt: 'Fragen-Node', caption: 'Fragen-Node: Frage und Antwortoptionen einrichten' },
        { src: '/docs/screenshots/condition-node.png', alt: 'Bedingungs-Node', caption: 'Bedingungs-Node: Wenn-Dann-Logik konfigurieren' },
        { src: '/docs/screenshots/ai-node.png', alt: 'AI-Node', caption: 'AI-Node: Prompt und KI-Einstellungen konfigurieren' },
        { src: '/docs/screenshots/knowledge-node.png', alt: 'Knowledge-Node', caption: 'Knowledge-Node: Wissensquellen auswählen und konfigurieren' },
      ],
      relatedSections: ['bot-builder', 'knowledge'],
    },
    {
      id: 'whatsapp-setup',
      title: 'WhatsApp Business API Einrichtung',
      category: 'Integration',
      content: `Die WhatsApp Business API Einrichtung verbindet Ihren Bot mit WhatsApp und ermöglicht echte Gespräche mit Kunden.

**Warum BSPs (Business Solution Providers)?**

BSPs übernehmen die komplizierte Meta-Verifizierung für Sie:
• **Setup-Zeit:** 2-5 Minuten statt 2-3 Wochen
• **Keine Meta-Verifizierung:** Kein Meta Developer Account oder Business-Verifizierung nötig
• **DSGVO-konform:** Optionen mit EU-Datenhaltung verfügbar
• **Sofort loslegen:** Keine Wartezeiten

**Verfügbare BSPs:**

**1. 360dialog (Empfohlen für EU):**
• ✅ EU-basierte Datenhaltung (DSGVO-konform)
• ✅ Einfachste Einrichtung (nur API-Key)
• ✅ Schnellste Aktivierung
• ✅ Keine Meta-Verifizierung nötig
• ✅ Offizieller Meta BSP

**2. Twilio:**
• Enterprise-Grade WhatsApp API
• Weltweit verfügbar
• $15 Testguthaben für neue Konten
• Umfassende Features
• ⚠️ EU-Data-Residency optional (muss aktiviert werden)

**3. MessageBird:**
• Global Communication Platform
• Multi-Channel Support
• API-First Architektur
• ⚠️ DSGVO-konform (AVV erforderlich)

**Setup-Prozess:**

**Schritt 1: BSP auswählen**
• Wählen Sie einen BSP im Setup-Wizard
• Lesen Sie die DSGVO-Hinweise sorgfältig
• 360dialog wird für EU-Nutzer empfohlen

**Schritt 2: DSGVO-Zustimmung**
• ✅ Zustimmung zur Datenweitergabe
• ✅ Auftragsverarbeitungsvertrag (AVV)
• Beide Checkboxen müssen aktiviert sein

**Schritt 3: API-Credentials eingeben**
• Folgen Sie den spezifischen Anleitungen für Ihren BSP
• Siehe: BSP-spezifische Anleitungen (360dialog, Twilio, MessageBird)

**Schritt 4: Verbindung testen**
• Die Verbindung wird automatisch getestet
• Bei Erfolg: Sie können sofort starten
• Bei Fehler: Prüfen Sie Ihre Credentials

**Schritt 5: Webhook konfigurieren**
• Der Webhook-URL wird automatisch generiert
• Wird automatisch beim BSP registriert
• Keine manuelle Konfiguration nötig

**Tipps:**
• Nutzen Sie die HelpIcons (?) für detaillierte Anweisungen
• Für EU-Nutzer: 360dialog ist die beste Wahl
• Testen Sie die Verbindung regelmäßig
• Speichern Sie Ihre Credentials sicher`,
      screenshots: [
        { src: '/docs/screenshots/whatsapp-setup-wizard.png', alt: 'WhatsApp Setup Wizard', caption: 'WhatsApp Setup Wizard - Schritt 1: BSP-Auswahl und Übersicht' },
        { src: '/docs/screenshots/bsp-selection.png', alt: 'BSP-Auswahl', caption: 'Auswahl zwischen 360dialog, Twilio und MessageBird mit Feature-Vergleich' },
        { src: '/docs/screenshots/gdpr-consent.png', alt: 'DSGVO-Consent', caption: 'DSGVO-Consent-Checkboxen für Datenverarbeitung und AVV' },
      ],
      relatedSections: ['bsp-360dialog', 'bsp-twilio', 'bsp-messagebird', 'compliance'],
    },
    {
      id: 'bsp-360dialog',
      title: '360dialog Integration - Schritt für Schritt',
      category: 'Integration',
      content: `360dialog ist der empfohlene BSP für EU-Nutzer aufgrund seiner vollständigen DSGVO-Konformität und einfachen Einrichtung.

**Warum 360dialog?**

**Vorteile:**
• ✅ EU-basierte Datenhaltung (vollständig DSGVO-konform)
• ✅ Einfachste Einrichtung (nur API-Key erforderlich)
• ✅ Keine Meta-Verifizierung nötig
• ✅ Schnellste Aktivierung (2-5 Minuten)
• ✅ Offizieller Meta Business Solution Provider
• ✅ Keine versteckten Kosten

**So erhalten Sie Ihren 360dialog API-Key:**

**Schritt 1: Konto erstellen**
1. Besuchen Sie https://dashboard.360dialog.com
2. Klicken Sie auf "Registrieren" oder "Sign Up"
3. Geben Sie Ihre E-Mail-Adresse ein
4. Erstellen Sie ein Passwort
5. Bestätigen Sie Ihre E-Mail-Adresse

**Schritt 2: API-Key finden**
1. Melden Sie sich im 360dialog Dashboard an
2. Navigieren Sie zu "API Keys" oder "Settings"
3. Sie sehen Ihren vorhandenen API-Key oder können einen neuen erstellen
4. Klicken Sie auf "Create API Key" oder kopieren Sie den vorhandenen Key
5. Der API-Key hat das Format: \`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx\` (UUID)

**Schritt 3: API-Key eingeben**
1. Öffnen Sie den WhatsApp Setup Wizard in Ihrem Bot
2. Wählen Sie "360dialog" als BSP
3. Aktivieren Sie die DSGVO-Checkboxen
4. Geben Sie Ihren API-Key im Feld ein
5. Klicken Sie auf "Mit 360dialog verbinden"

**Schritt 4: Verbindung testen**
• Die Verbindung wird automatisch getestet
• Bei Erfolg: Sie sehen eine Erfolgsmeldung
• Bei Fehler: Prüfen Sie den API-Key

**Wichtig:**
• Der API-Key wird verschlüsselt gespeichert (AES-256-GCM)
• Der Key ist sicher und kann nicht von Dritten eingesehen werden
• Bei Problemen: Kontaktieren Sie den 360dialog Support

**Nach erfolgreicher Verbindung:**
• Ihr Bot ist sofort einsatzbereit
• Webhook wird automatisch konfiguriert
• Sie können erste Nachrichten senden`,
      screenshots: [
        { src: '/docs/screenshots/360dialog-dashboard.png', alt: '360dialog Dashboard', caption: '360dialog Dashboard - API Keys finden und kopieren' },
        { src: '/docs/screenshots/360dialog-api-key.png', alt: '360dialog API-Key Eingabe', caption: 'Eingabefeld für 360dialog API-Key im Setup-Wizard' },
        { src: '/docs/screenshots/360dialog-success.png', alt: '360dialog Verbindung erfolgreich', caption: 'Erfolgreiche Verbindung mit 360dialog - Bot ist einsatzbereit' },
      ],
      relatedSections: ['whatsapp-setup'],
    },
    {
      id: 'bsp-twilio',
      title: 'Twilio Integration - Schritt für Schritt',
      category: 'Integration',
      content: `Twilio bietet eine Enterprise-Grade WhatsApp Business API mit $15 Testguthaben für neue Konten.

**Warum Twilio?**

**Vorteile:**
• Enterprise-Grade WhatsApp API
• Weltweit verfügbar
• $15 Testguthaben für neue Konten
• Umfassende Features und Support
• Einfache Integration
• ⚠️ EU-Data-Residency optional (muss aktiviert werden)

**So erhalten Sie Ihre Twilio Credentials:**

**Schritt 1: Konto erstellen**
1. Besuchen Sie https://www.twilio.com/try-twilio
2. Erstellen Sie ein kostenloses Konto
3. Bestätigen Sie Ihre E-Mail-Adresse
4. Sie erhalten $15 Testguthaben

**Schritt 2: WhatsApp aktivieren**
1. Melden Sie sich im Twilio Console an
2. Navigieren Sie zu "Messaging" → "Try it out" → "Send a WhatsApp message"
3. Folgen Sie den Anweisungen zur WhatsApp-Aktivierung
4. Warten Sie auf die Bestätigung (kann einige Minuten dauern)

**Schritt 3: Credentials finden**
1. In der Twilio Console finden Sie:
   • **Account SID:** Beginnt mit "AC" (z.B. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx)
   • **Auth Token:** Wird nur einmal angezeigt - kopieren Sie ihn sofort!

**WICHTIG:** Der Auth Token wird nur einmal angezeigt. Kopieren Sie ihn sofort und speichern Sie ihn sicher.

**Schritt 4: Credentials eingeben**
1. Öffnen Sie den WhatsApp Setup Wizard in Ihrem Bot
2. Wählen Sie "Twilio" als BSP
3. Aktivieren Sie die DSGVO-Checkboxen
4. Geben Sie Account SID ein (beginnt mit "AC")
5. Geben Sie Auth Token ein
6. Klicken Sie auf "Mit Twilio verbinden"

**Schritt 5: Verbindung testen**
• Die Verbindung wird automatisch getestet
• Twilio API-Credentials werden validiert
• Bei Erfolg: Sie sehen eine Erfolgsmeldung

**Sicherheit:**
• Credentials werden verschlüsselt gespeichert (Base64 + AES-256-GCM)
• Auth Token wird sicher gespeichert
• Niemals Credentials weitergeben

**Nach erfolgreicher Verbindung:**
• WhatsApp-Nummer wird automatisch erkannt
• Webhook wird konfiguriert
• Sie können erste Nachrichten senden`,
      screenshots: [
        { src: '/docs/screenshots/twilio-credentials.png', alt: 'Twilio Credentials Eingabe', caption: 'Eingabefelder für Twilio Account SID und Auth Token' },
      ],
      relatedSections: ['whatsapp-setup'],
    },
    {
      id: 'bsp-messagebird',
      title: 'MessageBird Integration - Schritt für Schritt',
      category: 'Integration',
      content: `MessageBird ist ein weiterer BSP-Anbieter für WhatsApp mit globaler Abdeckung.

**Warum MessageBird?**

**Vorteile:**
• Global Communication Platform
• Multi-Channel Support
• API-First Architektur
• Enterprise-Features
• ⚠️ DSGVO-konform (AVV erforderlich)

**So erhalten Sie Ihren MessageBird API-Key:**

**Schritt 1: Konto erstellen**
1. Besuchen Sie https://dashboard.messagebird.com
2. Erstellen Sie ein kostenloses Konto
3. Bestätigen Sie Ihre E-Mail-Adresse
4. Verifizieren Sie Ihr Konto

**Schritt 2: API-Key generieren**
1. Melden Sie sich im MessageBird Dashboard an
2. Navigieren Sie zu "Settings" → "API Access"
3. Klicken Sie auf "Create API Key"
4. Geben Sie einen Namen für den Key ein (z.B. "WhatsApp Bot Builder")
5. Kopieren Sie den generierten API-Key

**WICHTIG:** Der API-Key wird nur einmal angezeigt. Kopieren Sie ihn sofort!

**Schritt 3: WhatsApp Channel aktivieren**
1. Navigieren Sie zu "Channels" → "WhatsApp"
2. Folgen Sie den Anweisungen zur WhatsApp-Aktivierung
3. Warten Sie auf die Bestätigung

**Schritt 4: API-Key eingeben**
1. Öffnen Sie den WhatsApp Setup Wizard in Ihrem Bot
2. Wählen Sie "MessageBird" als BSP
3. Aktivieren Sie die DSGVO-Checkboxen
4. Geben Sie Ihren API-Key ein
5. Klicken Sie auf "Mit MessageBird verbinden"

**Schritt 5: Verbindung testen**
• Die Verbindung wird automatisch getestet
• API-Key wird validiert
• Bei Erfolg: Sie sehen eine Erfolgsmeldung

**Sicherheit:**
• API-Key wird verschlüsselt gespeichert
• Niemals API-Key weitergeben
• Bei Kompromittierung: Generieren Sie sofort einen neuen Key

**Nach erfolgreicher Verbindung:**
• WhatsApp Channel wird automatisch erkannt
• Webhook wird konfiguriert
• Sie können erste Nachrichten senden`,
      screenshots: [
        { src: '/docs/screenshots/messagebird-api-key.png', alt: 'MessageBird API-Key Eingabe', caption: 'Eingabefeld für MessageBird API-Key' },
      ],
      relatedSections: ['whatsapp-setup'],
    },
    {
      id: 'knowledge',
      title: 'Wissensquellen verwalten - RAG-System',
      category: 'Wissen',
      content: `Wissensquellen machen Ihren Bot intelligent. Sie geben Ihrem Bot Zugriff auf spezifische Informationen, die er für präzise, kontextbezogene Antworten nutzen kann.

**Was sind Wissensquellen?**

Wissensquellen sind Dokumente, Websites oder Texte, die Ihr Bot als Wissensbasis nutzt. Unser RAG-System (Retrieval-Augmented Generation) ermöglicht es dem Bot, auf diese Informationen zuzugreifen und präzise Antworten zu geben.

**Warum Wissensquellen?**

**Vorteile:**
• ✅ Präzise, kontextbezogene Antworten
• ✅ Nutzt Ihre eigenen Daten und Dokumente
• ✅ Verbessert die Kundenzufriedenheit
• ✅ Reduziert Fehler und falsche Informationen
• ✅ Aktualisierbar (URLs werden regelmäßig aktualisiert)
• ✅ Kombinierbar mit AI-Nodes für optimale Ergebnisse

**Verfügbare Quellen-Typen:**

**📄 PDF hochladen:**
• **Unterstützte Formate:** PDF (.pdf)
• **Maximale Dateigröße:** 10 MB
• **Verarbeitung:** Automatische Text-Extraktion und Chunking
• **Verwendung:** 
  - Produktkataloge
  - Handbücher
  - FAQ-Dokumente
  - Anleitungen

**Prozess:**
1. Klicken Sie auf "PDF auswählen"
2. Wählen Sie Ihre PDF-Datei aus
3. Die Datei wird hochgeladen (Status: "In Verarbeitung")
4. Automatische Text-Extraktion (1-5 Minuten)
5. Datei wird in durchsuchbare Chunks aufgeteilt
6. Status ändert sich zu "Bereit"

**🔗 URL hinzufügen:**
• **Unterstützte Formate:** Alle öffentlich zugänglichen URLs
• **Automatische Normalisierung:** example.com, www.example.com, https://example.com werden automatisch normalisiert
• **Verarbeitung:** Automatische Content-Extraktion
• **Verwendung:**
  - FAQ-Seiten
  - Produktseiten
  - Blog-Artikel
  - Dokumentation

**Prozess:**
1. Geben Sie die URL ein (mit oder ohne https://)
2. Klicken Sie auf "Hinzufügen"
3. URL wird normalisiert und validiert
4. Content wird extrahiert (1-3 Minuten)
5. Status ändert sich zu "Bereit"

**📝 Text eingeben:**
• **Verwendung:** Direkte Texteingabe für kurze Informationen
• **Format:** Titel + Textinhalt
• **Sofort verfügbar:** Keine Verarbeitungszeit
• **Verwendung:**
  - Kurze Anleitungen
  - Spezifische Informationen
  - Schnelle Updates

**Prozess:**
1. Geben Sie einen Titel ein
2. Geben Sie den Textinhalt ein
3. Klicken Sie auf "Hinzufügen"
4. Text ist sofort verfügbar

**Verarbeitungsstatus:**

**In Verarbeitung:**
• Datei/URL wird gerade verarbeitet
• Warten Sie 1-5 Minuten
• Status wird automatisch aktualisiert

**Bereit:**
• Quelle ist verarbeitet und verfügbar
• Kann in AI-Nodes verwendet werden
• Wird automatisch für Antworten genutzt

**Fehler:**
• Bei Problemen wird ein Fehler angezeigt
• Prüfen Sie die Datei/URL
• Versuchen Sie es erneut

**Verwendung in Bot-Flows:**

**Mit AI-Node kombinieren:**
1. Erstellen Sie einen AI-Node
2. Aktivieren Sie "Wissensquellen verwenden"
3. Die KI nutzt automatisch Ihre Wissensquellen
4. Antworten sind präzise und kontextbezogen

**Mit Knowledge-Node:**
1. Erstellen Sie einen Knowledge-Node
2. Wählen Sie spezifische Wissensquellen aus
3. Node nutzt nur diese Quellen für Antworten

**Best Practices:**
• Verwenden Sie aussagekräftige Titel
• Kombinieren Sie verschiedene Quellen-Typen
• Aktualisieren Sie URLs regelmäßig
• Testen Sie Quellen mit AI-Nodes
• Verwenden Sie hochwertige PDFs (gut strukturiert)`,
      screenshots: [
        { src: '/docs/screenshots/knowledge-overview.png', alt: 'Wissensquellen Übersicht', caption: 'Übersicht aller Wissensquellen mit Status-Anzeige (Bereit, In Verarbeitung, Fehler)' },
        { src: '/docs/screenshots/pdf-upload.png', alt: 'PDF hochladen', caption: 'PDF-Upload-Funktion mit Dateiauswahl und Drag & Drop' },
        { src: '/docs/screenshots/url-add.png', alt: 'URL hinzufügen', caption: 'URL-Eingabefeld mit automatischer Normalisierung und Validierung' },
        { src: '/docs/screenshots/text-input.png', alt: 'Text eingeben', caption: 'Text-Eingabefelder für Titel und Inhalt' },
        { src: '/docs/screenshots/knowledge-processing.png', alt: 'Verarbeitungs-Status', caption: 'Status-Anzeige während der Verarbeitung (In Verarbeitung, Bereit, Fehler)' },
      ],
      relatedSections: ['nodes', 'bot-builder'],
    },
    {
      id: 'analytics',
      title: 'Analytics und Performance-Tracking',
      category: 'Analyse',
      content: `Das Analytics Dashboard bietet umfassende Einblicke in die Performance Ihres Bots. Nutzen Sie diese Daten, um Ihren Bot kontinuierlich zu optimieren.

**Hauptmetriken:**

**💬 Gespräche:**
Die Gesprächs-Metriken zeigen:
• **Gesamtanzahl:** Alle Konversationen, die mit Ihrem Bot geführt wurden
• **Aktive Gespräche:** Gespräche, die aktuell noch laufen
• **Abgeschlossene Gespräche:** Erfolgreich beendete Gespräche
• **Verlauf über Zeit:** Trend-Analyse der letzten 7 Tage

**Verwendung:**
• Identifizieren Sie Spitzenzeiten
• Verstehen Sie Nutzerverhalten
• Optimieren Sie Bot-Flows basierend auf Daten

**📨 Nachrichten:**
Die Nachrichten-Metriken zeigen:
• **Gesamtanzahl:** Alle Nachrichten (eingehend + ausgehend)
• **Eingehende Nachrichten:** Nachrichten von Kunden
• **Ausgehende Nachrichten:** Nachrichten vom Bot
• **Nachrichten pro Gespräch:** Durchschnittliche Anzahl
• **Verlauf über Zeit:** Trend-Analyse

**Verwendung:**
• Verstehen Sie Kommunikationsmuster
• Identifizieren Sie häufige Fragen
• Optimieren Sie Bot-Antworten

**📈 Conversion Rate:**
Die Conversion Rate zeigt:
• **Erfolgreich abgeschlossene Gespräche:** Prozentsatz der Gespräche, die erfolgreich beendet wurden
• **Aktive vs. Gesamt:** Verhältnis aktiver zu abgeschlossenen Gesprächen
• **Trend-Analyse:** Entwicklung über Zeit

**Verwendung:**
• Messen Sie Bot-Effektivität
• Identifizieren Sie Problemstellen im Flow
• Optimieren Sie Conversion-Raten

**📊 Tägliche Trends:**
Die Trends-Grafik zeigt:
• **Nachrichten pro Tag:** Anzahl der Nachrichten (letzte 7 Tage)
• **Gespräche pro Tag:** Anzahl der Gespräche (letzte 7 Tage)
• **Aktivitäts-Zeitfenster:** Wann sind die meisten Gespräche?
• **Wochenvergleich:** Vergleich mit vorherigen Wochen

**Verwendung:**
• Identifizieren Sie Spitzenzeiten
• Planen Sie Ressourcen
• Optimieren Sie Bot-Verfügbarkeit

**Wie nutzen Sie Analytics?**

**1. Regelmäßige Überprüfung:**
• Überprüfen Sie Analytics täglich oder wöchentlich
• Identifizieren Sie Trends und Muster
• Reagieren Sie schnell auf Probleme

**2. Bot-Optimierung:**
• Identifizieren Sie Problemstellen im Bot-Flow
• Optimieren Sie Nodes basierend auf Daten
• Testen Sie Verbesserungen

**3. Nutzerverhalten verstehen:**
• Verstehen Sie, wie Nutzer mit Ihrem Bot interagieren
• Identifizieren Sie häufige Fragen
• Verbessern Sie Bot-Antworten

**4. Performance-Messung:**
• Messen Sie Bot-Effektivität
• Setzen Sie Ziele und KPIs
• Verfolgen Sie Fortschritte

**Best Practices:**
• Überprüfen Sie Analytics regelmäßig
• Nutzen Sie Daten für Entscheidungen
• Testen Sie Verbesserungen
• Dokumentieren Sie Änderungen`,
      screenshots: [
        { src: '/docs/screenshots/analytics-dashboard.png', alt: 'Analytics Dashboard', caption: 'Analytics Dashboard mit allen Metriken: Gespräche, Nachrichten, Conversion Rate' },
        { src: '/docs/screenshots/analytics-metrics.png', alt: 'Analytics Metriken', caption: 'Detaillierte Metriken-Karten: Gespräche, Nachrichten, Conversion mit Untermetriken' },
        { src: '/docs/screenshots/analytics-trends.png', alt: 'Tägliche Trends', caption: 'Tägliche Trends-Grafik für Nachrichten und Gespräche (letzte 7 Tage)' },
      ],
      relatedSections: ['dashboard'],
    },
    {
      id: 'templates',
      title: 'Bot-Vorlagen verwenden',
      category: 'Bot-Erstellung',
      content: `Vorlagen sind vorgefertigte Bot-Flows, die Sie als Ausgangspunkt verwenden können. Sie sparen Zeit und bieten bewährte Best Practices.

**Was sind Vorlagen?**

Vorlagen sind vollständig konfigurierte Bot-Flows für häufige Anwendungsfälle. Jede Vorlage enthält:
• Vorkonfigurierte Nodes und Verbindungen
• Beispiel-Texte und Nachrichten
• Bewährte Flow-Strukturen
• Anpassbare Konfigurationen

**Vorteile:**
• ✅ Schneller Start (Minuten statt Stunden)
• ✅ Bewährte Best Practices
• ✅ Anpassbar an Ihre Bedürfnisse
• ✅ Professionelle Struktur
• ✅ Lernbeispiel für Bot-Erstellung

**Vorlagen-Auswahl:**
1. Gehen Sie zur **Vorlagen-Bibliothek** (Header → Vorlagen)
2. Durchsuchen Sie die verfügbaren Vorlagen nach Kategorie
3. Klicken Sie auf **"Vorschau"** für Details
4. Wählen Sie **"Vorlage verwenden"** um sie zu laden
5. Die Vorlage wird im Bot Builder geladen und kann angepasst werden

**Vorlage anpassen:**
• Alle Nodes können bearbeitet werden (Doppelklick auf Node)
• Texte können geändert werden
• Flows können erweitert werden (neue Nodes hinzufügen)
• Wissensquellen können hinzugefügt werden
• Webhooks können mit Ihrer API verbunden werden

**Detaillierte Vorlagen-Beschreibungen:**

**🛡️ Multi-Tier Kundenservice (Empfohlen)**

Diese Vorlage bildet unseren produktiven Support-Workflow ab: Tier-1 Automatisierung mit Silent Checks, Ticket-Erstellung und Eskalation an Tier-2 Spezialisten inklusive Follow-up für Endkund*innen.

**Highlights:**
• Automatische Vorqualifizierung und Zusammenfassung von Kundenanfragen  
• Ticket-Erstellung und Weiterleitung an Tier-2 inklusive Kontextdaten  
• Follow-up Nachrichten, Status-Updates und erneute Kontaktaufnahme

**Typische Einsatzbereiche:**
• Skalierbarer 24/7 Kundensupport  
• Eskalations-Pipeline für komplexe Vorfälle  
• Monitoring & Protokollierung für SLA-Teams

---

**💬 Kundenservice-Vorlage**

Diese Vorlage ist perfekt für Unternehmen, die 24/7 Kundenbetreuung anbieten möchten.

**Features:**
• Automatische Begrüßung bei eingehenden Nachrichten
• FAQ-Beantwortung für häufige Fragen
• Ticket-Erstellung für komplexe Anfragen
• Weiterleitung zu menschlichen Agenten
• Status-Abfragen für bestehende Tickets

**Flow-Struktur:**
1. **Trigger** → Startet bei WhatsApp-Nachricht
2. **Willkommensnachricht** → Begrüßt den Kunden
3. **Bedingung** → Analysiert die Anfrage
4. **FAQ-Antwort** → Bei häufigen Fragen
5. **Ticket erstellen** → Bei komplexen Anfragen
6. **Status-Abfrage** → Für Ticket-Status

**Anpassungen:**
• Passen Sie die Willkommensnachricht an Ihre Marke an
• Fügen Sie Ihre FAQ-Antworten hinzu
• Verbinden Sie den Webhook mit Ihrem Ticket-System
• Erweitern Sie um weitere Support-Kanäle

**Einsatzbereiche:**
• 24/7 Kundenbetreuung
• Häufige Fragen automatisch beantworten
• Support-Tickets erstellen
• Kundenanfragen priorisieren

---

**🛒 E-Commerce-Vorlage**

Ideal für Online-Shops, die Bestellungen und Produktanfragen über WhatsApp abwickeln möchten.

**Features:**
• Produktsuche und -empfehlungen
• Bestellaufgabe direkt über WhatsApp
• Bestellstatus-Abfragen
• Warenkorb-Verwaltung
• Zahlungsabwicklung

**Flow-Struktur:**
1. **Trigger** → Startet bei WhatsApp-Nachricht
2. **Willkommensnachricht** → Begrüßt den Kunden
3. **Bedingung** → Erkennt Kundenwunsch (Suchen, Bestellen, Status)
4. **Produktsuche** → Webhook für Produktsuche
5. **Bestellung** → Webhook für Bestellaufgabe
6. **Status prüfen** → Webhook für Bestellstatus

**Anpassungen:**
• Verbinden Sie die Webhooks mit Ihrer E-Commerce-API
• Passen Sie die Produktsuche an Ihr Sortiment an
• Fügen Sie Zahlungsoptionen hinzu
• Integrieren Sie Versand-Tracking

**Einsatzbereiche:**
• Produkte finden und empfehlen
• Bestellungen aufgeben
• Bestellstatus prüfen
• Retouren verwalten

---

**📅 Buchungs-Vorlage**

Perfekt für Dienstleister, die Termine und Reservierungen über WhatsApp anbieten möchten.

**Features:**
• Terminbuchung mit Datumsauswahl
• Verfügbarkeit prüfen
• Buchungsbestätigung
• Automatische Erinnerungen
• Stornierung

**Flow-Struktur:**
1. **Trigger** → Startet bei Keyword "Termin"
2. **Willkommensnachricht** → Begrüßt den Kunden
3. **Frage** → Fragt nach gewünschtem Datum
4. **Verfügbarkeit prüfen** → Webhook prüft Kalender
5. **Bedingung** → Prüft ob Termin verfügbar
6. **Termin buchen** → Webhook erstellt Buchung
7. **Alternative Termine** → Falls nicht verfügbar

**Anpassungen:**
• Verbinden Sie den Webhook mit Ihrem Kalender-System
• Passen Sie die Verfügbarkeitsprüfung an
• Fügen Sie Erinnerungen hinzu
• Integrieren Sie Stornierungs-Funktionen

**Einsatzbereiche:**
• Termine buchen
• Verfügbarkeit anzeigen
• Buchungen verwalten
• Erinnerungen senden

---

**📢 Marketing-Vorlage**

Ideal für Lead-Generierung, Newsletter-Anmeldungen und Marketing-Kampagnen.

**Features:**
• Lead-Erfassung mit Kontaktdaten
• Newsletter-Anmeldung
• Kampagnen-Verwaltung
• Interessenten-Segmentierung
• Follow-up-Automatisierung

**Flow-Struktur:**
1. **Trigger** → Startet bei Keyword "Newsletter"
2. **Willkommensnachricht** → Begrüßt Interessenten
3. **Frage** → Fragt nach E-Mail-Adresse
4. **Newsletter anmelden** → Webhook speichert Daten
5. **Bestätigung** → Bestätigt Anmeldung

**Anpassungen:**
• Verbinden Sie den Webhook mit Ihrer CRM/Newsletter-Plattform
• Fügen Sie weitere Felder hinzu (Name, Telefon, etc.)
• Erweitern Sie um Segmentierungs-Logik
• Integrieren Sie Follow-up-Automatisierungen

**Einsatzbereiche:**
• Leads sammeln
• Newsletter-Anmeldungen
• Marketing-Kampagnen
• Interessenten qualifizieren

---

**🔧 Support-Vorlage**

Technischer Support-Bot für Problemlösung und Anleitungen.

**Features:**
• Problemanalyse durch KI
• Schritt-für-Schritt-Anleitungen
• Ticket-Erstellung bei komplexen Problemen
• Eskalation zu Agenten
• Wissensdatenbank-Integration

**Flow-Struktur:**
1. **Trigger** → Startet bei Keyword "Hilfe"
2. **Willkommensnachricht** → Begrüßt den Nutzer
3. **Frage** → Fragt nach Problembeschreibung
4. **KI-Antwort** → Sucht in Wissensdatenbank
5. **Bedingung** → Prüft ob Lösung gefunden
6. **Lösung** → Zeigt Lösung an
7. **Ticket erstellen** → Falls keine Lösung

**Anpassungen:**
• Fügen Sie Ihre Wissensdatenbank hinzu (PDFs, URLs, Texte)
• Passen Sie die KI-Prompts an
• Verbinden Sie den Webhook mit Ihrem Ticket-System
• Erweitern Sie um weitere Support-Kanäle

**Einsatzbereiche:**
• Technische Probleme lösen
• Anleitungen bereitstellen
• Support-Tickets erstellen
• Eskalation verwalten

---

**❓ FAQ-Vorlage**

Einfacher FAQ-Bot für häufige Fragen und Antworten.

**Features:**
• FAQ-Katalog mit Kategorien
• Intelligente Suche
• Kategorien (Allgemein, Technisch, Konto)
• Statistiken über häufigste Fragen
• Feedback-Sammlung

**Flow-Struktur:**
1. **Trigger** → Startet bei Keyword "FAQ"
2. **Willkommensnachricht** → Zeigt Kategorien
3. **Bedingung** → Erkennt gewählte Kategorie
4. **Allgemeine FAQs** → Antworten zu allgemeinen Fragen
5. **Technische FAQs** → Antworten zu technischen Fragen
6. **Konto-FAQs** → Antworten zu Konto-Fragen

**Anpassungen:**
• Fügen Sie Ihre FAQ-Antworten hinzu
• Erweitern Sie um weitere Kategorien
• Integrieren Sie KI für intelligente Suche
• Fügen Sie Feedback-Mechanismen hinzu

**Einsatzbereiche:**
• Häufige Fragen beantworten
• FAQ-Verwaltung
• Selbstbedienung
• Support entlasten

---

**Best Practices:**
• Starten Sie mit Vorlagen für schnelle Ergebnisse
• Passen Sie Vorlagen an Ihre Bedürfnisse an
• Testen Sie Vorlagen vor dem Live-Schalten
• Kombinieren Sie mehrere Vorlagen für komplexe Use Cases
• Verbinden Sie Webhooks mit Ihren bestehenden Systemen
• Fügen Sie Wissensquellen für KI-gestützte Antworten hinzu`,
      screenshots: [
        { src: '/docs/screenshots/template-selector.png', alt: 'Vorlagen-Auswahl', caption: 'Vorlagen-Bibliothek mit allen verfügbaren Vorlagen nach Kategorien gefiltert' },
        { src: '/docs/screenshots/template-multi-tier.png', alt: 'Multi-Tier Support Vorlage', caption: 'Empfohlene Multi-Tier Support Vorlage mit Tier-1 Automatisierung und Tier-2 Eskalation' },
        { src: '/docs/screenshots/template-customer-service.png', alt: 'Kundenservice-Vorlage', caption: 'Kundenservice-Vorlage mit Flow-Struktur: Trigger → Begrüßung → Bedingung → FAQ/Ticket/Status' },
        { src: '/docs/screenshots/template-e-commerce.png', alt: 'E-Commerce-Vorlage', caption: 'E-Commerce-Vorlage mit Flow-Struktur: Trigger → Begrüßung → Bedingung → Produktsuche/Bestellung/Status' },
        { src: '/docs/screenshots/template-booking.png', alt: 'Buchungs-Vorlage', caption: 'Buchungs-Vorlage mit Flow-Struktur: Trigger → Begrüßung → Datum-Frage → Verfügbarkeit → Buchung' },
      ],
      relatedSections: ['bot-creation', 'bot-builder', 'nodes'],
    },
    {
      id: 'compliance',
      title: 'DSGVO-Compliance und Datenschutz',
      category: 'Rechtliches',
      content: `Die Plattform ist vollständig DSGVO-konform und erfüllt alle rechtlichen Anforderungen für den deutschen und europäischen Markt.

**DSGVO-Konformität:**

**✅ Datenhaltung:**
• Alle Daten werden in der EU gespeichert (bei 360dialog)
• Keine Datenübertragung außerhalb der EU
• Verschlüsselte Speicherung (AES-256-GCM)
• Regelmäßige Sicherheitsaudits

**✅ Datenverarbeitung:**
• Auftragsverarbeitungsvertrag (AVV) mit BSPs
• Transparente Datenverarbeitung
• Nutzer-Zustimmung erforderlich
• Recht auf Auskunft, Löschung, Berichtigung

**✅ Datenschutz:**
• Verschlüsselte Übertragung (HTTPS)
• Sichere API-Credentials-Speicherung
• Zugriffskontrolle
• Regelmäßige Backups

**Compliance-Check:**
Das Compliance-Panel zeigt:
• ✅ Datenschutzerklärung: Vollständig vorhanden
• ✅ Nutzungsbedingungen: Vollständig vorhanden
• ✅ Cookie-Consent: Vollständig vorhanden
• ⚠️ Datenverarbeitung: Prüfen Sie BSP-Konfiguration

**Meta WhatsApp Compliance:**
Ab 15. Januar 2026 gelten neue Meta WhatsApp Richtlinien:
• Allgemeine Konversations-Chatbots sind nicht mehr erlaubt
• Bots müssen einen spezifischen Business-Use-Case haben
• Verfügbare Use-Cases: Kundenservice, Buchungen, E-Commerce, Informationen

**Ihre Verantwortung:**
• Informieren Sie Nutzer über Datenverarbeitung
• Holen Sie Zustimmung ein
• Respektieren Sie Nutzerrechte
• Dokumentieren Sie Verarbeitungsprozesse

**Best Practices:**
• Überprüfen Sie Compliance regelmäßig
• Halten Sie Dokumentation aktuell
• Informieren Sie Nutzer transparent
• Reagieren Sie schnell auf Anfragen`,
      screenshots: [
        { src: '/docs/screenshots/compliance-panel.png', alt: 'Compliance-Panel', caption: 'Compliance-Check-Panel mit Status-Anzeige für alle Compliance-Bereiche' },
      ],
      relatedSections: ['whatsapp-setup'],
    },
    {
      id: 'settings',
      title: 'Einstellungen und Kontoverwaltung',
      category: 'Grundlagen',
      content: `Die Einstellungsseite ermöglicht es Ihnen, Ihre Kontoinformationen und Präferenzen zu verwalten.

**Profil-Einstellungen:**

**E-Mail-Adresse:**
• Wird angezeigt, kann aber nicht geändert werden
• Wird für Anmeldung und Benachrichtigungen verwendet
• Bei Änderungswunsch: Kontaktieren Sie den Support

**Vollständiger Name:**
• Kann jederzeit geändert werden
• Wird für Personalisierung verwendet
• Optional, kann leer bleiben

**Account-Aktionen:**

**Konto löschen:**
• Permanentes Löschen Ihres Kontos und aller zugehörigen Daten
• Alle Bots werden gelöscht
• Alle Wissensquellen werden gelöscht
• Alle Analytics-Daten werden gelöscht
• **Aktion kann nicht rückgängig gemacht werden**

**Wichtig:**
• Änderungen werden sofort gespeichert
• Beim Löschen des Kontos werden alle Daten unwiderruflich entfernt
• Sie erhalten eine Bestätigungs-E-Mail bei wichtigen Änderungen
• Exportieren Sie wichtige Daten vor dem Löschen

**Sicherheit:**
• Passwort kann nicht hier geändert werden (nutzen Sie "Passwort vergessen")
• Zwei-Faktor-Authentifizierung (wenn verfügbar)
• Aktive Sessions werden angezeigt`,
      screenshots: [
        { src: '/docs/screenshots/settings-profile.png', alt: 'Einstellungen Profil', caption: 'Profil-Einstellungen: E-Mail-Adresse und Vollständiger Name' },
        { src: '/docs/screenshots/settings-account.png', alt: 'Account-Aktionen', caption: 'Account-Aktionen: Konto löschen mit Warnung' },
      ],
      relatedSections: ['dashboard'],
    },
    {
      id: 'bot-embedding',
      title: 'Bot einbinden - Integration in Website & Plattformen',
      category: 'Integration',
      content: `Nachdem Sie Ihren Bot erstellt und konfiguriert haben, können Sie ihn in Ihre Website oder auf verschiedenen Plattformen einbinden. Der WhatsApp Bot Builder bietet zwei Modi: einen einfachen Modus für normale Nutzer und einen Experten-Modus für Entwickler.

**Einfach-Modus (Empfohlen für die meisten Nutzer):**

Der Einfach-Modus zeigt nur die 4 häufigsten Plattformen:
• 🌐 **Website** – Für jede normale Website (HTML)
• 📝 **WordPress** – WordPress-Website oder Blog
• 🛍️ **Shopify** – Shopify Online-Shop
• 💬 **WhatsApp Link** – Direkter Link zum Teilen

**So funktioniert's im Einfach-Modus:**

1. **Plattform auswählen:**
   - Wählen Sie Ihre Plattform aus den großen, benutzerfreundlichen Karten
   - Jede Karte zeigt eine Beschreibung, was sie ist

2. **Code kopieren:**
   - Der passende Code wird automatisch angezeigt
   - Klicken Sie auf "Kopieren" um den Code in die Zwischenablage zu kopieren

3. **Code einfügen:**
   - Folgen Sie den Schritt-für-Schritt-Anleitungen
   - Jede Plattform hat spezifische Anweisungen

4. **Fertig!**
   - Speichern Sie die Änderungen
   - Der Bot erscheint automatisch auf Ihrer Website

**Experten-Modus (Für Entwickler):**

Der Experten-Modus bietet Zugriff auf alle 20 Code-Sprachen und Frameworks:

**Frontend:**
• HTML, React, Next.js, Vue.js, Angular, Svelte, Vanilla JavaScript, iframe

**Backend:**
• PHP, Python, Java, Go, Ruby, Node.js

**Frameworks:**
• Django, Flask, Laravel, Spring Boot

**CMS/Platforms:**
• WordPress, Shopify

**Plattform-spezifische Anleitungen:**

**Website (HTML):**
1. Öffnen Sie Ihre Website im Editor (z.B. WordPress, Wix, Squarespace)
2. Kopieren Sie den Code
3. Fügen Sie ihn vor dem schließenden \`</body>\` Tag ein
4. Speichern Sie die Seite

**WordPress:**
1. Loggen Sie sich in Ihr WordPress-Dashboard ein
2. Gehen Sie zu **Design → Theme-Editor** oder installieren Sie ein Plugin wie "Insert Headers and Footers"
3. Kopieren Sie den Code
4. Fügen Sie ihn in den Footer-Bereich ein (vor \`</body>\`)
5. Speichern Sie

**Shopify:**
1. Loggen Sie sich in Ihr Shopify Admin ein
2. Gehen Sie zu **Online Store → Themes → Actions → Edit code**
3. Öffnen Sie \`theme.liquid\`
4. Kopieren Sie den Code
5. Fügen Sie ihn vor dem schließenden \`</body>\` Tag ein
6. Speichern Sie

**WhatsApp Link:**
1. Kopieren Sie den Link
2. Fügen Sie ihn als Button oder Link auf Ihrer Website ein
3. Oder teilen Sie den Link direkt mit Ihren Kunden
4. Beim Klick öffnet sich WhatsApp mit Ihrem Bot

**Wichtige Hinweise:**

• ✅ Stellen Sie sicher, dass Ihr Bot aktiv ist
• ✅ Der Bot muss mindestens einen aktiven Flow haben
• ✅ Für Production: Ersetzen Sie die URL mit Ihrer eigenen Domain (wenn verfügbar)
• ✅ Testen Sie den Bot nach der Integration
• ✅ Der Bot funktioniert nur, wenn WhatsApp Business API korrekt konfiguriert ist

**Troubleshooting:**

**Bot erscheint nicht:**
• Prüfen Sie, ob der Code korrekt eingefügt wurde
• Prüfen Sie, ob der Bot aktiv ist
• Prüfen Sie die Browser-Konsole auf Fehler

**Bot funktioniert nicht:**
• Prüfen Sie die WhatsApp Business API Verbindung
• Prüfen Sie, ob der Bot mindestens einen Flow hat
• Prüfen Sie die Bot-Status im Dashboard

**Best Practices:**

• Testen Sie den Bot vor dem Live-Schalten
• Verwenden Sie den Einfach-Modus, wenn möglich
• Dokumentieren Sie die Integration für Ihr Team
• Überwachen Sie die Bot-Performance nach Integration`,
      screenshots: [
        { src: '/docs/screenshots/embed-code-generator.png', alt: 'Bot einbinden - Code Generator', caption: 'Embed Code Generator mit Einfach/Experten-Modus Toggle' },
        { src: '/docs/screenshots/embed-simple-mode.png', alt: 'Einfach-Modus', caption: 'Einfach-Modus mit 4 Plattformen: Website, WordPress, Shopify, WhatsApp Link' },
        { src: '/docs/screenshots/embed-expert-mode.png', alt: 'Experten-Modus', caption: 'Experten-Modus mit allen 20 Code-Sprachen kategorisiert' },
        { src: '/docs/screenshots/embed-website-code.png', alt: 'Website Code', caption: 'HTML-Code für normale Websites mit Schritt-für-Schritt-Anleitung' },
        { src: '/docs/screenshots/embed-wordpress-code.png', alt: 'WordPress Code', caption: 'WordPress-spezifischer Code mit WordPress-Anleitung' },
        { src: '/docs/screenshots/embed-shopify-code.png', alt: 'Shopify Code', caption: 'Shopify-spezifischer Code mit Shopify-Anleitung' },
        { src: '/docs/screenshots/embed-whatsapp-link.png', alt: 'WhatsApp Link', caption: 'Direkter WhatsApp-Link Code mit Button-Beispiel' },
      ],
      relatedSections: ['bot-creation', 'whatsapp-setup'],
    },
    {
      id: 'demo-mode',
      title: 'Demo-Modus - Funktionen testen',
      category: 'Grundlagen',
      content: `Der Demo-Modus ermöglicht es Ihnen, alle Funktionen der Plattform kostenlos zu testen, ohne Registrierung.

**Was ist der Demo-Modus?**

Der Demo-Modus ist eine vollständig funktionsfähige Version der Plattform mit echten Funktionen:
• ✅ Echte Supabase-Datenbank-Anbindung
• ✅ Vollständiger Bot Builder mit allen Nodes
• ✅ Wissensquellen-Management
• ✅ Analytics Dashboard
• ⚠️ Keine WhatsApp-Verbindung (nur Simulation)

**Demo-Bereiche:**

**1. Demo Dashboard:**
• Übersicht aller Demo-Bots
• Statistiken und Metriken
• Schnellzugriff auf Bot-Funktionen

**2. Demo Bot Builder:**
• Vollständiger visueller Flow-Editor
• Alle Node-Typen verfügbar
• Speichern und Laden von Bots
• Vorschau-Funktion

**3. Demo Knowledge:**
• PDF-Upload (wird verarbeitet)
• URL hinzufügen
• Text eingeben

**4. Demo Analytics:**
• Detaillierte Statistiken
• Trends und Metriken
• Performance-Tracking

**Demo-Modus nutzen:**
1. Besuchen Sie /demo/dashboard
2. Erstellen Sie einen Demo-Bot
3. Testen Sie alle Funktionen
4. Bei Gefallen: Registrieren Sie sich für volle Funktionen

**Hinweis:**
Demo-Bots werden nach 30 Tagen automatisch gelöscht. Für produktive Nutzung registrieren Sie sich bitte.`,
      relatedSections: ['getting-started', 'dashboard'],
    },
  ];

  // Kategorien extrahieren
  const categories = Array.from(new Set(docSections.map(s => s.category)));

  // Highlight Text-Funktion
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-gray-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Filtere Sektionen basierend auf Suche und Kategorie
  const filteredSections = useMemo(() => {
    let filtered = docSections;

    // Filter nach Kategorie
    if (activeCategory) {
      filtered = filtered.filter(s => s.category === activeCategory);
    }

    // Filter nach Suchbegriff
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) ||
        s.content.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [searchQuery, activeCategory]);

  // Scroll zu Sektion
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">📚 Dokumentation</h1>
          <p className="text-lg text-gray-600">
            Umfassende Anleitung für den WhatsApp Bot Builder - Von der Registrierung bis zur Bot-Optimierung
          </p>
        </div>

        {/* Suchleiste */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Suchen Sie in der Dokumentation..."
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          
          {/* Suchergebnisse Count */}
          {searchQuery && (
            <p className="mt-2 text-sm text-gray-600">
              {filteredSections.length} Ergebnis{filteredSections.length !== 1 ? 'se' : ''} gefunden
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Kategorien */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4">Kategorien</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setActiveCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeCategory === null
                      ? 'bg-brand-green text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Alle
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      activeCategory === category
                        ? 'bg-brand-green text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Hauptinhalt */}
          <div className="lg:col-span-3">
            <div className="space-y-8">
              {filteredSections.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600">Keine Ergebnisse gefunden.</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory(null);
                    }}
                    className="mt-4 text-brand-green hover:underline"
                  >
                    Alle Sektionen anzeigen
                  </button>
                </div>
              ) : (
                filteredSections.map((section) => (
                  <div
                    key={section.id}
                    id={section.id}
                    className="bg-white rounded-lg shadow p-6 scroll-mt-8"
                  >
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {searchQuery ? highlightText(section.title, searchQuery) : section.title}
                    </h2>
                    
                    <div className="prose max-w-none mb-4">
                      <p className="text-gray-700 whitespace-pre-line">
                        {searchQuery ? highlightText(section.content, searchQuery) : section.content}
                      </p>
                    </div>

                    {/* Screenshots */}
                    {section.screenshots && section.screenshots.length > 0 && (
                      <div className="mt-6 grid gap-4">
                        {section.screenshots.map((screenshot, idx) => (
                          <a
                            key={idx}
                            href={screenshot.src}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-brand-green"
                          >
                            <div className="bg-gray-50 p-4 flex items-center justify-center">
                              <img
                                src={screenshot.src}
                                alt={screenshot.alt}
                                loading="lazy"
                                className="w-full max-h-[440px] object-contain rounded-md transition-shadow group-hover:shadow-lg"
                              />
                            </div>
                            {screenshot.caption && (
                              <div className="p-4 bg-gray-50 border-t border-gray-200">
                                <p className="text-sm text-gray-700 font-medium">
                                  {screenshot.caption}
                                </p>
                              </div>
                            )}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Verwandte Sektionen */}
                    {section.relatedSections && section.relatedSections.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">
                          Verwandte Themen:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {section.relatedSections.map((relatedId) => {
                            const related = docSections.find(s => s.id === relatedId);
                            if (!related) return null;
                            return (
                              <button
                                key={relatedId}
                                onClick={() => {
                                  setSearchQuery('');
                                  setActiveCategory(null);
                                  setTimeout(() => scrollToSection(relatedId), 100);
                                }}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-brand-green hover:text-white transition-colors text-sm"
                              >
                                {related.title}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
