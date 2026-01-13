'use client';

import { useState, useEffect, Suspense } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Temporäre Seite für Screenshots
 * Zeigt nur die relevanten Bereiche für Dokumentations-Screenshots
 */
function ScreenshotsPageContent() {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const sectionParam = searchParams.get('section');
  const [activeSection, setActiveSection] = useState<string>(sectionParam || 'registration-form');

  // Wenn section-Parameter vorhanden, direkt zu diesem Bereich springen
  useEffect(() => {
    if (sectionParam) {
      setActiveSection(sectionParam);
      // Scroll zum Inhalt nach kurzer Verzögerung
      setTimeout(() => {
        const contentElement = document.getElementById('screenshot-content');
        if (contentElement) {
          contentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [sectionParam]);

  const sections = [
    { id: 'registration-form', title: 'Registrierungsformular', description: 'Vollständiges Registrierungsformular mit HelpIcons' },
    { id: 'registration-email', title: 'E-Mail-Feld', description: 'E-Mail-Eingabefeld mit Validierung' },
    { id: 'registration-password', title: 'Passwort-Feld', description: 'Passwort-Eingabefeld mit Stärke-Anzeige' },
    { id: 'dashboard-overview', title: 'Dashboard Übersicht', description: 'Dashboard mit Bot-Übersicht' },
    { id: 'dashboard-stats', title: 'Dashboard Statistiken', description: 'Statistik-Karten' },
    { id: 'bot-creation-form', title: 'Bot-Erstellung Formular', description: 'Formular zum Erstellen eines neuen Bots' },
    { id: 'bot-builder-canvas', title: 'Bot Builder Canvas', description: 'Bot Builder mit Node-Palette und Canvas' },
    { id: 'node-palette', title: 'Node-Palette', description: 'Verfügbare Node-Typen' },
    { id: 'node-properties', title: 'Node-Eigenschaften', description: 'Eigenschaften-Panel' },
    { id: 'node-connections', title: 'Node-Verbindungen', description: 'Nodes verbinden' },
    { id: 'message-node', title: 'Nachrichten-Node', description: 'Nachrichten-Node Konfiguration' },
    { id: 'question-node', title: 'Fragen-Node', description: 'Fragen-Node Konfiguration' },
    { id: 'condition-node', title: 'Bedingungs-Node', description: 'Bedingungs-Node Konfiguration' },
    { id: 'ai-node', title: 'AI-Node', description: 'AI-Node Konfiguration' },
    { id: 'knowledge-node', title: 'Knowledge-Node', description: 'Knowledge-Node Konfiguration' },
    { id: 'whatsapp-setup-wizard', title: 'WhatsApp Setup Wizard', description: 'Setup Wizard - BSP-Auswahl' },
    { id: 'bsp-selection', title: 'BSP-Auswahl', description: 'Auswahl zwischen BSPs' },
    { id: 'gdpr-consent', title: 'DSGVO-Consent', description: 'DSGVO-Consent-Checkboxen' },
    { id: '360dialog-dashboard', title: '360dialog Dashboard', description: '360dialog Dashboard - API Keys' },
    { id: '360dialog-api-key', title: '360dialog API-Key', description: 'API-Key Eingabefeld' },
    { id: '360dialog-success', title: '360dialog Erfolg', description: 'Erfolgreiche Verbindung' },
    { id: 'twilio-credentials', title: 'Twilio Credentials', description: 'Twilio Account SID und Auth Token' },
    { id: 'messagebird-api-key', title: 'MessageBird API-Key', description: 'MessageBird API-Key Eingabe' },
    { id: 'knowledge-overview', title: 'Wissensquellen Übersicht', description: 'Übersicht aller Quellen' },
    { id: 'pdf-upload', title: 'PDF hochladen', description: 'PDF-Upload-Funktion' },
    { id: 'url-add', title: 'URL hinzufügen', description: 'URL-Eingabefeld' },
    { id: 'text-input', title: 'Text eingeben', description: 'Text-Eingabefelder' },
    { id: 'knowledge-processing', title: 'Verarbeitungs-Status', description: 'Status während Verarbeitung' },
    { id: 'analytics-dashboard', title: 'Analytics Dashboard', description: 'Analytics Dashboard mit Metriken' },
    { id: 'analytics-metrics', title: 'Analytics Metriken', description: 'Detaillierte Metriken-Karten' },
    { id: 'analytics-trends', title: 'Tägliche Trends', description: 'Trends-Grafik' },
    { id: 'template-selector', title: 'Template-Auswahl', description: 'Template-Auswahl-Dialog' },
    { id: 'template-customer-service', title: 'Kundenservice-Vorlage', description: 'Kundenservice-Vorlage mit Flow-Struktur' },
    { id: 'template-e-commerce', title: 'E-Commerce-Vorlage', description: 'E-Commerce-Vorlage mit Flow-Struktur' },
    { id: 'template-booking', title: 'Buchungs-Vorlage', description: 'Buchungs-Vorlage mit Flow-Struktur' },
    { id: 'template-multi-tier', title: 'Multi-Tier Support Vorlage', description: 'Tier-1/Tier-2 Support mit Eskalation' },
    { id: 'compliance-panel', title: 'Compliance-Panel', description: 'Compliance-Check-Panel' },
    { id: 'embed-code-generator', title: 'Bot einbinden - Code Generator', description: 'Embed Code Generator mit Einfach/Experten-Modus' },
    { id: 'embed-simple-mode', title: 'Einfach-Modus', description: 'Einfach-Modus mit 4 Plattformen: Website, WordPress, Shopify, WhatsApp Link' },
    { id: 'embed-expert-mode', title: 'Experten-Modus', description: 'Experten-Modus mit allen 20 Code-Sprachen' },
    { id: 'embed-website-code', title: 'Website Code', description: 'HTML-Code für normale Websites' },
    { id: 'embed-wordpress-code', title: 'WordPress Code', description: 'WordPress-spezifischer Code' },
    { id: 'embed-shopify-code', title: 'Shopify Code', description: 'Shopify-spezifischer Code' },
    { id: 'embed-whatsapp-link', title: 'WhatsApp Link', description: 'Direkter WhatsApp-Link Code' },
    { id: 'checkout-page', title: 'Checkout-Seite', description: 'Haupt-Checkout-Seite mit Payment Method Selector' },
    { id: 'payment-method-selector', title: 'Payment Method Selector', description: 'Auswahl verfügbarer Zahlungsmethoden' },
    { id: 'payment-method-card', title: 'Payment Method Card', description: 'Einzelne Zahlungsmethoden-Karte' },
    { id: 'checkout-form', title: 'Checkout Form', description: 'Checkout-Formular mit Order Summary' },
    { id: 'payment-status-success', title: 'Payment Status Success', description: 'Erfolgreiche Zahlung mit Bestätigung' },
    { id: 'payment-status-failed', title: 'Payment Status Failed', description: 'Fehlgeschlagene Zahlung mit Retry-Option' },
    { id: 'checkout-success', title: 'Checkout Success', description: 'Checkout Erfolgs-Seite' },
    { id: 'checkout-cancel', title: 'Checkout Cancel', description: 'Checkout Abbruch-Seite' },
  ];

  const Bullet = ({ className }: { className?: string }) => (
    <span className={`mt-1 inline-flex h-2 w-2 rounded-full bg-brand-green flex-shrink-0 ${className || ''}`} />
  );

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'registration-form':
        return (
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Registrierung</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vollständiger Name (optional)
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                </label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Max Mustermann" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-Mail-Adresse *
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                </label>
                <input type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="ihre@email.de" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort * (min. 8 Zeichen, inkl. Anforderungen)
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                </label>
                <input type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort bestätigen *
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                </label>
                <input type="password" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
              </div>
              <button className="w-full bg-brand-green text-white py-2 px-4 rounded-lg hover:bg-brand-dark transition-colors">
                Registrieren
              </button>
            </form>
          </div>
        );

      case 'dashboard-overview':
        return (
          <div className="bg-gradient-to-r from-brand-green to-brand-dark rounded-lg shadow-lg p-8 mb-8 text-white">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-4xl font-bold">Dashboard</h1>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors cursor-help text-sm">?</span>
            </div>
            <p className="text-white/90 mb-1">Willkommen, <span className="font-semibold">user@example.com</span></p>
            <p className="text-white/80 text-sm">Verwalten Sie Ihre WhatsApp Bots</p>
          </div>
        );

      case 'dashboard-stats':
        return (
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { label: 'Gesamt Bots', value: '5', color: 'border-brand-green' },
              { label: 'Aktive Bots', value: '3', color: 'border-green-500' },
              { label: 'Pausierte Bots', value: '1', color: 'border-yellow-500' },
              { label: 'Entwürfe', value: '1', color: 'border-gray-400' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow p-4 border-l-4 relative">
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        );

      case 'bot-builder-canvas':
        return (
          <div className="bg-white rounded-lg shadow-lg p-4 h-96 flex">
            <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Node-Palette</h3>
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
              </div>
              <div className="space-y-2">
                {['📨 Nachricht', '❓ Frage', '🔀 Bedingung', '🤖 AI', '📚 Knowledge', '🏁 Ende'].map((node, idx) => (
                  <div key={idx} className="p-2 border border-gray-200 rounded text-sm">{node}</div>
                ))}
              </div>
            </div>
            <div className="flex-1 bg-gray-100 p-4 relative">
              <div className="absolute top-4 left-4 bg-white p-3 rounded shadow border-2 border-brand-green">
                <div className="text-sm font-medium">Start</div>
              </div>
            </div>
          </div>
        );

      case 'whatsapp-setup-wizard':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">WhatsApp Business API Einrichten</h2>
            <div className="space-y-4">
              <div className="border-2 border-brand-green rounded-lg p-4 bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">💬</span>
                  <h5 className="font-semibold">360dialog</h5>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Empfohlen</span>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    360dialog API-Key <span className="text-red-500">*</span>
                    <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                  </label>
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'knowledge-overview':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold">Wissensquellen</h2>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">📄 PDF hochladen</h3>
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                </div>
                <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm">PDF auswählen</button>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">🔗 URL hinzufügen</h3>
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                </div>
                <input type="url" className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm" placeholder="https://..." />
                <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm">Hinzufügen</button>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">📝 Text eingeben</h3>
                  <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                </div>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm" placeholder="Titel..." />
                <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm" rows={3} placeholder="Text..." />
                <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm">Hinzufügen</button>
              </div>
            </div>
          </div>
        );

      case 'analytics-dashboard':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-2xl font-bold">Analytics</h2>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-sm">?</span>
            </div>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { label: 'Gespräche', value: '42', sub: '12 aktiv' },
                { label: 'Nachrichten', value: '158', sub: '85 eingehend, 73 ausgehend' },
                { label: 'Conversion', value: '29%' },
              ].map((metric, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-6 relative">
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                  <div className="text-sm text-gray-600">{metric.label}</div>
                  {metric.sub && <div className="text-xs text-green-600 mt-2">{metric.sub}</div>}
                </div>
              ))}
            </div>
          </div>
        );

      case 'registration-email':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail-Adresse *
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
              </label>
              <input type="email" className="w-full px-4 py-2 border-2 border-brand-green rounded-lg focus:ring-2 focus:ring-brand-green" placeholder="ihre@email.de" />
              <p className="text-xs text-gray-500 mt-1">Diese E-Mail wird für Anmeldung und Benachrichtigungen verwendet</p>
            </div>
          </div>
        );

      case 'registration-password':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Passwort * (min. 8 Zeichen, inkl. Anforderungen)
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
              </label>
              <input type="password" className="w-full px-4 py-2 border-2 border-brand-green rounded-lg focus:ring-2 focus:ring-brand-green" />
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-xs"><Bullet className="bg-green-500" /> <span className="text-gray-600">Mindestens 8 Zeichen</span></div>
                <div className="flex items-center gap-2 text-xs"><Bullet className="bg-green-500" /> <span className="text-gray-600">Groß- und Kleinbuchstaben</span></div>
                <div className="flex items-center gap-2 text-xs"><Bullet className="bg-green-500" /> <span className="text-gray-600">Zahlen und Sonderzeichen</span></div>
              </div>
            </div>
          </div>
        );

      case 'bot-creation-form':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Neuen Bot erstellen</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bot-Name *</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg" placeholder="Mein WhatsApp Bot" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung (optional)</label>
                <textarea className="w-full px-4 py-2 border border-gray-300 rounded-lg" rows={3} placeholder="Beschreiben Sie, wofür dieser Bot verwendet wird..." />
              </div>
              <button className="w-full bg-brand-green text-white py-2 px-4 rounded-lg hover:bg-brand-dark transition-colors">Bot erstellen</button>
            </form>
          </div>
        );

      case 'node-palette':
        return (
          <div className="bg-white rounded-lg shadow-lg p-4 w-64">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Node-Palette</h3>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
            </div>
            <div className="space-y-2">
              {[{ icon: '📨', label: 'Nachricht', desc: 'Text senden' }, { icon: '❓', label: 'Frage', desc: 'Antwort sammeln' }, { icon: '🔀', label: 'Bedingung', desc: 'Wenn-Dann-Logik' }, { icon: '🤖', label: 'AI', desc: 'KI-Antworten' }, { icon: '📚', label: 'Knowledge', desc: 'Wissensquellen' }, { icon: '🏁', label: 'Ende', desc: 'Gespräch beenden' }].map((node, idx) => (
                <div key={idx} className="p-3 border border-gray-200 rounded-lg hover:border-brand-green hover:bg-green-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{node.icon}</span>
                    <div><div className="font-medium text-gray-900">{node.label}</div><div className="text-xs text-gray-500">{node.desc}</div></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'node-properties':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <h3 className="font-semibold text-gray-900 mb-4">Node-Eigenschaften</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nachrichtentext</label>
                <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={4} placeholder="Geben Sie Ihre Nachricht ein..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Node-Label</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Nachricht 1" />
              </div>
              <button className="w-full bg-brand-green text-white py-2 px-4 rounded-lg text-sm hover:bg-brand-dark transition-colors">Speichern</button>
            </div>
          </div>
        );

      case 'node-connections':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="relative h-64 bg-gray-50 rounded-lg">
              <div className="absolute top-8 left-8 bg-white p-4 rounded-lg shadow border-2 border-brand-green">
                <div className="text-sm font-medium">Start</div>
                <div className="w-2 h-2 bg-brand-green rounded-full mt-2 mx-auto"></div>
              </div>
              <div className="absolute top-8 left-1/2 transform -translate-x-1/2"><div className="w-16 h-0.5 bg-brand-green"></div></div>
              <div className="absolute top-8 right-8 bg-white p-4 rounded-lg shadow border border-gray-300">
                <div className="text-sm font-medium">Nachricht</div>
                <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 mx-auto"></div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4 text-center">Nodes werden durch Klicken auf Verbindungspunkte verbunden</p>
          </div>
        );

      case 'message-node':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 w-80">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📨</span>
              <h3 className="font-semibold text-gray-900">Nachrichten-Node</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nachrichtentext *</label>
                <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={4} defaultValue="Hallo! Wie kann ich Ihnen helfen?" />
              </div>
            </div>
          </div>
        );

      case 'question-node':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">❓</span>
              <h3 className="font-semibold text-gray-900">Fragen-Node</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frage *</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" defaultValue="Wie können wir Ihnen helfen?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Antwortoptionen</label>
                <div className="space-y-2">
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" defaultValue="Option 1" />
                  <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" defaultValue="Option 2" />
                  <button className="text-sm text-brand-green hover:underline">+ Option hinzufügen</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'condition-node':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🔀</span>
              <h3 className="font-semibold text-gray-900">Bedingungs-Node</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedingung</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option>Wenn Antwort gleich</option>
                  <option>Wenn Antwort enthält</option>
                  <option>Wenn Variable</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wert</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Wert zum Vergleich" />
              </div>
            </div>
          </div>
        );

      case 'ai-node':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🤖</span>
              <h3 className="font-semibold text-gray-900">AI-Node</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">AI-Prompt *</label>
                <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" rows={6} defaultValue="Du bist ein hilfreicher Assistent. Antworte auf Deutsch und sei freundlich." />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" defaultChecked />
                <label className="text-sm text-gray-700">Wissensquellen verwenden</label>
              </div>
            </div>
          </div>
        );

      case 'knowledge-node':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📚</span>
              <h3 className="font-semibold text-gray-900">Knowledge-Node</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wissensquellen auswählen</label>
                <select multiple className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" size={4}>
                  <option selected>Produktkatalog.pdf</option>
                  <option selected>FAQ-Website</option>
                  <option>Kundenhandbuch</option>
                </select>
              </div>
              <p className="text-xs text-gray-500">Halten Sie Strg/Cmd gedrückt, um mehrere auszuwählen</p>
            </div>
          </div>
        );

      case 'bsp-selection':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">BSP auswählen</h2>
            <div className="space-y-4">
              {[
                { name: '360dialog', logo: '💬', recommended: true, eu: true },
                { name: 'Twilio', logo: '📱', recommended: false, eu: false },
                { name: 'MessageBird', logo: '🐦', recommended: false, eu: false },
              ].map((bsp, idx) => (
                <div key={idx} className={`border-2 rounded-lg p-4 ${idx === 0 ? 'border-brand-green bg-green-50' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{bsp.logo}</span>
                    <h5 className="font-semibold">{bsp.name}</h5>
                    {bsp.recommended && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Empfohlen</span>}
                    {bsp.eu && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">EU-Datenhaltung</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'gdpr-consent':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-semibold text-blue-900 mb-2 text-sm">📋 DSGVO-konforme Datenverarbeitung</h5>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" />
                  <label className="text-xs text-blue-800">
                    <strong>Zustimmung zur Datenweitergabe:</strong> Ich stimme zu, dass zur Bereitstellung des WhatsApp Business API Service folgende Daten an 360dialog (Business Solution Provider) übertragen werden...
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" />
                  <label className="text-xs text-blue-800">
                    <strong>Auftragsverarbeitungsvertrag (AVV):</strong> Ich bestätige, dass 360dialog als Auftragsverarbeiter gemäß Art. 28 DSGVO agiert...
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case '360dialog-dashboard':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">360dialog Dashboard</h2>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">API Keys</h3>
              <div className="bg-white rounded border border-gray-200 p-3 font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</span>
                  <button className="text-brand-green hover:underline text-xs">Kopieren</button>
                </div>
              </div>
              <button className="mt-3 px-4 py-2 bg-brand-green text-white rounded-lg text-sm hover:bg-brand-dark">+ Neuen API-Key erstellen</button>
            </div>
          </div>
        );

      case '360dialog-api-key':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                360dialog API-Key <span className="text-red-500">*</span>
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
              </label>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              <p className="text-xs text-gray-500 mt-1">Format: UUID (z.B. 12345678-1234-1234-1234-123456789abc)</p>
            </div>
          </div>
        );

      case '360dialog-success':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verbindung erfolgreich!</h2>
              <p className="text-gray-600 mb-4">Ihr Bot ist jetzt mit 360dialog verbunden.</p>
              <button className="px-6 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-dark">Weiter</button>
            </div>
          </div>
        );

      case 'twilio-credentials':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg mx-auto">
            <h2 className="text-xl font-semibold mb-4">Twilio Credentials</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account SID <span className="text-red-500">*</span>
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                </label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                <p className="text-xs text-gray-500 mt-1">Beginnt mit "AC"</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Auth Token <span className="text-red-500">*</span>
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                </label>
                <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm" placeholder="Ihr geheimer Auth Token" />
                <p className="text-xs text-red-600 mt-1">⚠️ Wird nur einmal angezeigt!</p>
              </div>
            </div>
          </div>
        );

      case 'messagebird-api-key':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MessageBird API-Key <span className="text-red-500">*</span>
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
              </label>
              <input type="password" className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm" placeholder="Ihr MessageBird API-Key" />
              <p className="text-xs text-gray-500 mt-1">Alphanumerischer String (mindestens 20 Zeichen)</p>
            </div>
          </div>
        );

      case 'pdf-upload':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium">📄 PDF hochladen</h3>
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600 mb-2">PDF-Datei hier ablegen</p>
                <p className="text-xs text-gray-500">oder</p>
                <button className="mt-2 px-4 py-2 bg-brand-green text-white rounded-lg text-sm hover:bg-brand-dark">Datei auswählen</button>
                <p className="text-xs text-gray-500 mt-2">Max. 10 MB</p>
              </div>
            </div>
          </div>
        );

      case 'url-add':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium">🔗 URL hinzufügen</h3>
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
              </div>
              <input type="url" className="w-full px-3 py-2 border-2 border-brand-green rounded-lg mb-2 text-sm" placeholder="https://example.com" />
              <button className="w-full px-4 py-2 bg-brand-green text-white rounded-lg text-sm hover:bg-brand-dark">Hinzufügen</button>
            </div>
          </div>
        );

      case 'text-input':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium">📝 Text eingeben</h3>
                <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
              </div>
              <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm" placeholder="Titel..." />
              <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm" rows={4} placeholder="Textinhalt..." />
              <button className="w-full px-4 py-2 bg-brand-green text-white rounded-lg text-sm hover:bg-brand-dark">Hinzufügen</button>
            </div>
          </div>
        );

      case 'knowledge-processing':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <h3 className="font-semibold text-gray-900 mb-4">Wissensquellen</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                  <div>
                    <div className="font-medium text-gray-900">Produktkatalog.pdf</div>
                    <div className="text-sm text-yellow-700">In Verarbeitung...</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">FAQ-Website</div>
                    <div className="text-sm text-green-700">Bereit</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'analytics-metrics':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { label: 'Gespräche', value: '42', sub: '12 aktiv', color: 'border-green-500' },
                { label: 'Nachrichten', value: '158', sub: '85 eingehend, 73 ausgehend', color: 'border-blue-500' },
                { label: 'Conversion', value: '29%', color: 'border-purple-500' },
              ].map((metric, idx) => (
                <div key={idx} className={`bg-white rounded-lg shadow p-6 border-l-4 relative ${metric.color}`}>
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center justify-center w-3 h-3 rounded-full bg-gray-200 text-gray-600 hover:bg-brand-green hover:text-white transition-colors cursor-help text-xs">?</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
                  <div className="text-sm text-gray-600 mt-1">{metric.label}</div>
                  {metric.sub && <div className="text-xs text-green-600 mt-2">{metric.sub}</div>}
                </div>
              ))}
            </div>
          </div>
        );

      case 'analytics-trends':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Tägliche Trends (letzte 7 Tage)</h3>
            <div className="h-64 flex items-end justify-between gap-2">
              {[65, 45, 80, 55, 90, 70, 85].map((height, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-brand-green rounded-t" style={{ height: `${height}%` }}></div>
                  <div className="text-xs text-gray-600 mt-2">Tag {idx + 1}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-green rounded"></div>
                <span className="text-sm text-gray-600">Nachrichten</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">Gespräche</span>
              </div>
            </div>
          </div>
        );

      case 'template-selector':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Template auswählen</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { name: 'Kundenservice', desc: 'Basis-Kundenservice Bot' },
                { name: 'FAQ Bot', desc: 'Häufige Fragen beantworten' },
                { name: 'E-Commerce', desc: 'Produktberatung und Bestellung' },
                { name: 'Terminvereinbarung', desc: 'Termine planen und verwalten' },
              ].map((template, idx) => (
                <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 hover:border-brand-green cursor-pointer">
                  <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-sm text-gray-600">{template.desc}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'template-customer-service':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">💬</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Kundenservice-Vorlage</h2>
                  <p className="text-sm text-gray-600">Professioneller Support-Bot für Kundenanfragen</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Flow-Struktur:</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Trigger</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Begrüßung</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Bedingung</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">FAQ/Ticket/Status</span>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Features:</h4>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li className="flex items-start gap-2"><Bullet /> <span>Automatische Begrüßung</span></li>
                  <li className="flex items-start gap-2"><Bullet /> <span>FAQ-Beantwortung</span></li>
                  <li className="flex items-start gap-2"><Bullet /> <span>Ticket-Erstellung</span></li>
                  <li className="flex items-start gap-2"><Bullet /> <span>Status-Abfragen</span></li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Einsatzbereiche:</h4>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• 24/7 Kundenbetreuung</li>
                  <li>• Häufige Fragen beantworten</li>
                  <li>• Support-Tickets erstellen</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Nodes:</h4>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">trigger</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">message</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">condition</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">webhook</span>
                  <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">question</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'template-e-commerce':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">🛒</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">E-Commerce-Vorlage</h2>
                  <p className="text-sm text-gray-600">Bot für Bestellungen und Produktanfragen</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Flow-Struktur:</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Trigger</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Begrüßung</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Bedingung</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Produktsuche/Bestellung/Status</span>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Features:</h4>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li className="flex items-start gap-2"><Bullet /> <span>Produktsuche</span></li>
                  <li className="flex items-start gap-2"><Bullet /> <span>Bestellaufgabe</span></li>
                  <li className="flex items-start gap-2"><Bullet /> <span>Bestellstatus</span></li>
                  <li className="flex items-start gap-2"><Bullet /> <span>Warenkorb-Verwaltung</span></li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Einsatzbereiche:</h4>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• Produkte finden</li>
                  <li>• Bestellungen aufgeben</li>
                  <li>• Bestellstatus prüfen</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Nodes:</h4>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">trigger</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">message</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">condition</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">webhook</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'template-booking':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl">📅</span>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Buchungs-Vorlage</h2>
                  <p className="text-sm text-gray-600">Bot für Terminbuchungen und Reservierungen</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Flow-Struktur:</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Trigger</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Begrüßung</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-xs font-medium">Datum-Frage</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Verfügbarkeit</span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">Buchung</span>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Features:</h4>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li className="flex items-start gap-2"><Bullet /> <span>Terminbuchung</span></li>
                  <li className="flex items-start gap-2"><Bullet /> <span>Verfügbarkeit prüfen</span></li>
                  <li className="flex items-start gap-2"><Bullet /> <span>Buchungsbestätigung</span></li>
                  <li className="flex items-start gap-2"><Bullet /> <span>Erinnerungen</span></li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Einsatzbereiche:</h4>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• Termine buchen</li>
                  <li>• Verfügbarkeit anzeigen</li>
                  <li>• Buchungen verwalten</li>
                </ul>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Nodes:</h4>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">trigger</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">message</span>
                  <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">question</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">webhook</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">condition</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'template-multi-tier':
        return (
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🛡️</span>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-green/10 text-brand-green text-xs font-semibold rounded-full uppercase tracking-wide">
                    Empfohlene Vorlage
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mt-2">Multi-Tier Kundenservice</h2>
                  <p className="text-sm text-gray-600">
                    Tier-1 Automatisierung, Silent Checks & Eskalation an Tier-2 Spezialisten – unser produktiver Support-Flow.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mb-6">
              <div className="border border-brand-green/30 bg-brand-green/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-lg">⚙️</span> Tier-1 Automatisierung
                </h3>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• Begrüßung & Problemaufnahme</li>
                  <li>• Silent Checks & AI-Zusammenfassung</li>
                  <li>• Erste Antworten & Statusprüfung</li>
                </ul>
              </div>
              <div className="border border-amber-400/40 bg-amber-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-lg">🚨</span> Eskalation an Tier-2
                </h3>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• Automatische Ticket-Erstellung</li>
                  <li>• Übergabe mit Kontextdaten</li>
                  <li>• Zuweisung an Spezialisten</li>
                </ul>
              </div>
              <div className="border border-brand-dark/30 bg-brand-dark/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="text-lg">📈</span> Follow-up & Monitoring
                </h3>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>• Ticketstatus & Updates</li>
                  <li>• Rückfragen an Kunden</li>
                  <li>• Abschlussnachrichten</li>
                </ul>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Flow-Struktur</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  { label: 'Trigger', color: 'bg-blue-100 text-blue-800' },
                  { label: 'Tier-1 Nachricht', color: 'bg-green-100 text-green-800' },
                  { label: 'Kategorie-Frage', color: 'bg-pink-100 text-pink-800' },
                  { label: 'Routing', color: 'bg-yellow-100 text-yellow-800' },
                  { label: 'Silent Check (AI)', color: 'bg-purple-100 text-purple-800' },
                  { label: 'Ticket-Webhooks', color: 'bg-amber-100 text-amber-800' },
                  { label: 'Follow-up', color: 'bg-gray-200 text-gray-800' },
                ].map((badge) => (
                  <span key={badge.label} className={`px-3 py-1 rounded-full font-medium ${badge.color}`}>
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'compliance-panel':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">DSGVO-Compliance Check</h2>
            <div className="space-y-3">
              {[
                { label: 'Datenschutzerklärung', status: 'passed' },
                { label: 'Nutzungsbedingungen', status: 'passed' },
                { label: 'Cookie-Consent', status: 'passed' },
                { label: 'Datenverarbeitung', status: 'warning' },
              ].map((check, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{check.label}</span>
                  {check.status === 'passed' ? (
                    <span className="flex items-center gap-2 text-green-600 text-sm">
                      <Bullet className="bg-green-500" />
                      <span>Bestanden</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-yellow-600 text-sm">
                      <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-yellow-500 flex-shrink-0" />
                      <span>Prüfen</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'embed-code-generator':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Bot einbinden</h2>
                <p className="text-sm text-gray-600">Integrieren Sie Ihren Bot in Ihre Website oder Anwendung</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Einfach</span>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-brand-green">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                </div>
                <span className="text-xs text-gray-500">Experten</span>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-4">📱 Wählen Sie Ihre Plattform aus:</p>
            </div>
          </div>
        );

      case 'embed-simple-mode':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Bot einbinden</h2>
                <p className="text-sm text-gray-600">Wählen Sie Ihre Plattform aus und kopieren Sie den Code. Fertig! 🎉</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Einfach</span>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-brand-green">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                </div>
                <span className="text-xs text-gray-500">Experten</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {[
                { badge: 'WEB', label: 'Website', description: 'Für jede normale Website' },
                { badge: 'WP', label: 'WordPress', description: 'WordPress-Website oder Blog' },
                { badge: 'SHOP', label: 'Shopify', description: 'Shopify Online-Shop' },
                { badge: 'WA', label: 'WhatsApp Link', description: 'Direkter WhatsApp-Link' },
              ].map((platform, idx) => (
                <div key={idx} className={`p-4 rounded-xl border-2 ${idx === 0 ? 'border-brand-green bg-brand-green/10' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold ${idx === 0 ? 'bg-brand-green text-white' : 'bg-gray-100 text-brand-dark'}`}>
                      {platform.badge}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{platform.label}</h4>
                      <p className="text-sm text-gray-600">{platform.description}</p>
                    </div>
                    {idx === 0 && (
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-brand-green">
                        <Bullet />
                        <span>Empfohlen</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'embed-expert-mode':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Bot einbinden</h2>
                <p className="text-sm text-gray-600">Integrieren Sie Ihren Bot in Ihre Website oder Anwendung mit einem einfachen Code-Snippet.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Einfach</span>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300">
                  <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                </div>
                <span className="text-xs text-gray-500">Experten</span>
              </div>
            </div>
            <div className="space-y-4 mt-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Frontend</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {['HTML', 'React', 'Next.js', 'Vue.js', 'Angular'].map((lang) => (
                    <button key={lang} className="px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-gray-700 text-sm font-medium">
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Backend</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {['PHP', 'Python', 'Java', 'Go', 'Ruby', 'Node.js'].map((lang) => (
                    <button key={lang} className="px-3 py-2 rounded-lg border-2 border-gray-200 bg-white text-gray-700 text-sm font-medium">
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'embed-website-code':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Website Code</h2>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <button className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50">📋 Kopieren</button>
              </div>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono">
                <code>{`<!-- WhatsApp Bot Builder - Mein Bot -->
<script src="https://whatsapp.owona.de/widget.js" data-bot-id="abc123"></script>`}</code>
              </pre>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">📦 So funktioniert's:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                <li>Öffnen Sie Ihre Website im Editor</li>
                <li>Kopieren Sie den Code oben</li>
                <li>Fügen Sie ihn vor dem schließenden &lt;/body&gt; Tag ein</li>
                <li>Speichern Sie die Seite - fertig! 🎉</li>
              </ol>
            </div>
          </div>
        );

      case 'embed-wordpress-code':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">WordPress Code</h2>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <button className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50">📋 Kopieren</button>
              </div>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono">
                <code>{`<!-- WordPress: In functions.php oder Plugin hinzufügen -->
<?php
function add_chatbot_widget() {
    ?>
    <script src="https://whatsapp.owona.de/widget.js" data-bot-id="abc123"></script>
    <?php
}
add_action('wp_footer', 'add_chatbot_widget');
?>`}</code>
              </pre>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">📦 So funktioniert's:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                <li>Loggen Sie sich in Ihr WordPress-Dashboard ein</li>
                <li>Gehen Sie zu <strong>Design → Theme-Editor</strong></li>
                <li>Kopieren Sie den Code oben</li>
                <li>Fügen Sie ihn in den Footer-Bereich ein</li>
                <li>Speichern Sie - fertig! 🎉</li>
              </ol>
            </div>
          </div>
        );

      case 'embed-shopify-code':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Shopify Code</h2>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <button className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50">📋 Kopieren</button>
              </div>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono">
                <code>{`<!-- Shopify: In theme.liquid vor </body> Tag -->
<script src="https://whatsapp.owona.de/widget.js" data-bot-id="abc123"></script>`}</code>
              </pre>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">📦 So funktioniert's:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                <li>Loggen Sie sich in Ihr Shopify Admin ein</li>
                <li>Gehen Sie zu <strong>Online Store → Themes → Actions → Edit code</strong></li>
                <li>Öffnen Sie <code className="bg-green-100 px-1 rounded">theme.liquid</code></li>
                <li>Kopieren Sie den Code oben</li>
                <li>Fügen Sie ihn vor dem schließenden &lt;/body&gt; Tag ein</li>
                <li>Speichern Sie - fertig! 🎉</li>
              </ol>
            </div>
          </div>
        );

      case 'embed-whatsapp-link':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">WhatsApp Link</h2>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Code</label>
                <button className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50">📋 Kopieren</button>
              </div>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm font-mono">
                <code>{`https://whatsapp.owona.de/widget/embed?botId=abc123

<!-- Als Button auf Ihrer Website: -->
<a href="https://whatsapp.owona.de/widget/embed?botId=abc123" 
   target="_blank" 
   style="display: inline-block; padding: 12px 24px; background: #25D366; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
  💬 Chat mit uns auf WhatsApp
</a>`}</code>
              </pre>
            </div>
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">📦 So funktioniert's:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-green-800">
                <li>Kopieren Sie den Link oben</li>
                <li>Fügen Sie ihn als Button oder Link auf Ihrer Website ein</li>
                <li>Oder teilen Sie den Link direkt mit Ihren Kunden</li>
                <li>Beim Klick öffnet sich WhatsApp mit Ihrem Bot - fertig! 🎉</li>
              </ol>
            </div>
          </div>
        );

      case 'checkout-page':
        return (
          <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
                <p className="mt-2 text-gray-600">Schließen Sie Ihre Bestellung ab</p>
              </div>
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Bestellübersicht</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">WhatsApp Bot Builder - Starter Plan (monthly)</span>
                      <span className="font-semibold text-gray-900">€29,00</span>
                    </div>
                    <div className="flex justify-between text-lg font-semibold pt-3 border-t">
                      <span>Gesamt</span>
                      <span className="text-brand-green">€29,00</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Zahlungsmethode wählen</h3>
                    <p className="text-sm text-gray-600 mb-4">Wählen Sie Ihre bevorzugte Zahlungsmethode aus</p>
                    <div className="space-y-3">
                      <div className="w-full p-4 border-2 border-brand-green rounded-lg bg-brand-light/10 ring-2 ring-brand-green">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-2xl">💳</span>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">Kreditkarte</h3>
                              <p className="text-sm text-gray-600 mt-1">Sofortige Zahlung</p>
                              <div className="mt-2 text-xs text-gray-500">
                                Gebühren: 2.9% + 0.30 EUR
                              </div>
                            </div>
                          </div>
                          <div className="w-5 h-5 rounded-full border-2 border-brand-green bg-brand-green flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-brand-green/50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <span className="text-2xl">💳</span>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">PayPal</h3>
                              <p className="text-sm text-gray-600 mt-1">Sofortige Zahlung</p>
                              <div className="mt-2 text-xs text-gray-500">
                                Gebühren: 3.4% + 0.35 EUR
                              </div>
                            </div>
                          </div>
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t mt-4">
                      <button className="w-full bg-brand-green text-white py-3 px-4 rounded-lg hover:bg-brand-dark font-semibold">
                        Weiter zur Zahlung
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'payment-method-selector':
        return (
          <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-2xl mx-auto">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Zahlungsmethode wählen</h3>
              <p className="text-sm text-gray-600 mb-4">Wählen Sie Ihre bevorzugte Zahlungsmethode aus</p>
              <div className="space-y-3">
                <div className="w-full p-4 border-2 border-brand-green rounded-lg bg-brand-light/10 ring-2 ring-brand-green">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">💳</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">Kreditkarte</h3>
                        <p className="text-sm text-gray-600 mt-1">Sofortige Zahlung</p>
                        <div className="mt-2 text-xs text-gray-500">Gebühren: 2.9% + 0.30 EUR</div>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-brand-green bg-brand-green flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-brand-green/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">💳</span>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">PayPal</h3>
                        <p className="text-sm text-gray-600 mt-1">Sofortige Zahlung</p>
                        <div className="mt-2 text-xs text-gray-500">Gebühren: 3.4% + 0.35 EUR</div>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'payment-method-card':
        return (
          <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-lg mx-auto">
            <div className="w-full p-4 border-2 border-brand-green rounded-lg bg-brand-light/10 ring-2 ring-brand-green">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">💳</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">Kreditkarte</h3>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Sofortige Zahlung</p>
                    <div className="mt-2 text-xs text-gray-500">
                      Gebühren: 2.9% + 0.30 EUR
                    </div>
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full border-2 border-brand-green bg-brand-green flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        );

      case 'checkout-form':
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Bestellübersicht</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">WhatsApp Bot Builder - Starter Plan (monthly)</span>
                  <span className="font-semibold text-gray-900">€29,00</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 pt-3 border-t">
                  <span>Zahlungsmethode Gebühren</span>
                  <span>€1,14</span>
                </div>
                <div className="flex justify-between text-lg font-semibold pt-3 border-t">
                  <span>Gesamt</span>
                  <span className="text-brand-green">€29,00</span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Zahlungsmethode</h3>
              <div className="space-y-3">
                <div className="p-4 border-2 border-brand-green rounded-lg bg-brand-light/10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💳</span>
                    <div>
                      <h4 className="font-semibold">Kreditkarte</h4>
                      <p className="text-sm text-gray-600">Stripe</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'payment-status-success':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="p-6 border-2 rounded-lg bg-green-50 border-green-200">
              <div className="flex items-start gap-4">
                <span className="text-4xl">✅</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Zahlung erfolgreich</h3>
                  <p className="text-green-800 mb-4">
                    Ihre Zahlung wurde erfolgreich verarbeitet.
                  </p>
                  <button className="bg-brand-green text-white px-4 py-2 rounded-lg hover:bg-brand-dark mt-2">
                    Weiter
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'payment-status-failed':
        return (
          <div className="max-w-2xl mx-auto">
            <div className="p-6 border-2 rounded-lg bg-red-50 border-red-200">
              <div className="flex items-start gap-4">
                <span className="text-4xl">❌</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Zahlung fehlgeschlagen</h3>
                  <p className="text-red-800 mb-4">
                    Ihre Zahlung konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.
                  </p>
                  <button className="bg-brand-green text-white px-4 py-2 rounded-lg hover:bg-brand-dark mt-2">
                    Erneut versuchen
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'checkout-success':
        return (
          <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <div className="mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                    <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Zahlung erfolgreich!</h1>
                <p className="text-lg text-gray-600 mb-8">
                  Vielen Dank für Ihre Zahlung. Ihre Subscription wird aktiviert, sobald die Zahlung verarbeitet wurde.
                </p>
                <div className="space-y-4">
                  <button className="w-full bg-brand-green text-white py-3 px-4 rounded-lg hover:bg-brand-dark font-semibold">
                    Zum Dashboard
                  </button>
                  <button className="w-full border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 font-semibold">
                    Subscription verwalten
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'checkout-cancel':
        return (
          <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
                <div className="mb-6">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
                    <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Zahlung abgebrochen</h1>
                <p className="text-lg text-gray-600 mb-8">
                  Die Zahlung wurde abgebrochen. Keine Sorge - Sie wurden nicht belastet.
                </p>
                <div className="space-y-4">
                  <button className="w-full bg-brand-green text-white py-3 px-4 rounded-lg hover:bg-brand-dark font-semibold">
                    Zurück zur Preisübersicht
                  </button>
                  <button className="w-full border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 font-semibold">
                    Zum Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-gray-600">Screenshot-Bereich für: {sections.find(s => s.id === activeSection)?.title}</p>
            <p className="text-sm text-gray-500 mt-2">{sections.find(s => s.id === activeSection)?.description}</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">📸 Screenshot-Bereiche</h1>
          <p className="text-gray-600">Temporäre Seite für Dokumentations-Screenshots</p>
          <Link href={`/${locale}/docs`} className="text-brand-green hover:underline text-sm mt-2 inline-block">
            ← Zurück zur Dokumentation
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 sticky top-8">
              <h3 className="font-semibold text-gray-900 mb-4">Bereiche</h3>
              <div className="space-y-1 max-h-96 overflow-y-auto">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors text-sm ${
                      activeSection === section.id
                        ? 'bg-brand-green text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div id="screenshot-content" className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {sections.find(s => s.id === activeSection)?.title}
              </h2>
              <p className="text-sm text-gray-600">
                {sections.find(s => s.id === activeSection)?.description}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                💡 Screenshot-Bereich für Dokumentation. Verwenden Sie Browser-Tools (z.B. Browser DevTools) um partielle Screenshots dieses Bereichs zu erstellen.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-lg">
              {renderSection(activeSection)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScreenshotsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-gray-600">Lädt...</p>
        </div>
      </div>
    }>
      <ScreenshotsPageContent />
    </Suspense>
  );
}

