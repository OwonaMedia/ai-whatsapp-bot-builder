'use client';
export const dynamic = 'force-dynamic';

/**
 * TEMPORÄRE DEMO-SEITE: Features Übersicht
 * Zeigt alle Hauptfeatures des Produkts für Screenshots
 */

export default function FeaturesDemoPage() {
  const features = [
    {
      icon: '🔒',
      title: 'DSGVO-konform',
      description: 'Vollständige EU-Compliance mit automatischer Datenlöschung nach 30 Tagen',
      details: [
        'EU-Proxy-Server (automat.owona.de)',
        'Automatische PII-Filterung',
        '30-Tage Datenretention',
        'DSGVO-konforme Datenverarbeitung',
      ],
    },
    {
      icon: '🤖',
      title: 'AI-gestützt',
      description: 'Intelligente Konversationen mit GROQ AI Integration',
      details: [
        'GROQ AI für schnelle Antworten',
        'RAG-System für Wissensquellen',
        'Automatische Spracherkennung',
        'Multi-Language Support',
      ],
    },
    {
      icon: '🎨',
      title: 'Visueller Bot-Builder',
      description: 'Erstellen Sie komplexe Flows ohne Code mit Drag & Drop',
      details: [
        'Drag & Drop Interface',
        'Visueller Flow-Editor',
        'Node-basierte Konfiguration',
        'Live-Vorschau',
      ],
    },
    {
      icon: '📊',
      title: 'Analytics & Insights',
      description: 'Detaillierte Statistiken und Conversion-Tracking',
      details: [
        'Gesprächs-Analytics',
        'Conversion-Tracking',
        'Performance-Metriken',
        'Export-Funktionen',
      ],
    },
    {
      icon: '📚',
      title: 'Wissensquellen',
      description: 'Integrieren Sie PDFs und URLs als Wissensbasis',
      details: [
        'PDF-Upload & Verarbeitung',
        'URL-Integration',
        'Automatische Embeddings',
        'Vektorsuche',
      ],
    },
    {
      icon: '🔗',
      title: 'Integrationen',
      description: 'Verbinden Sie mit CRM, E-Commerce und mehr',
      details: [
        'CRM-Integrationen',
        'E-Commerce-Shops',
        'API-Zugang',
        'Webhook-Support',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">
            Alles was Sie brauchen für professionelle WhatsApp Bots
          </h1>
          <p className="text-xl text-gray-600">
            Eine komplette Lösung von der Erstellung bis zur Analyse
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 mb-6">{feature.description}</p>
              <ul className="space-y-2">
                {feature.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-brand-green mt-1">✓</span>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-xl shadow-lg p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Bereit, loszulegen?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Erstellen Sie Ihren ersten WhatsApp Bot in weniger als 5 Minuten
            </p>
            <div className="flex gap-4 justify-center">
              <button className="px-8 py-4 bg-brand-green text-white rounded-lg font-semibold hover:bg-brand-dark transition-colors">
                Jetzt kostenlos starten
              </button>
              <button className="px-8 py-4 bg-white text-brand-green border-2 border-brand-green rounded-lg font-semibold hover:bg-brand-light/20 transition-colors">
                Demo ansehen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


