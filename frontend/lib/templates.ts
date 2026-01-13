import { BotFlow, FlowNode } from '@/types/bot';

export interface BotTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'customer-service' | 'e-commerce' | 'booking' | 'marketing' | 'support' | 'faq';
  flow: BotFlow;
  features: string[];
  useCases: string[];
}

// Helper function to create nodes with correct structure
function createNode(
  id: string,
  type: FlowNode['type'],
  position: { x: number; y: number },
  label: string,
  config: any = {}
): FlowNode {
  return {
    id,
    type,
    position,
    data: {
      label,
      config,
    },
  };
}

export const botTemplates: BotTemplate[] = [
  {
    id: 'multi-tier-support',
    name: 'Multi-Tier Kundenservice (Empfohlen)',
    description:
      'Intelligenter Support-Flow mit automatischer Vorqualifizierung, Silent Checks und Eskalation von Tier 1 zu Tier 2.',
    icon: '🛡️',
    category: 'support',
    features: [
      'Tier-1 Begrüßung mit Schnellantworten',
      'Silent Checks & Statusprüfung',
      'Ticket-Erstellung im Support-Center',
      'Eskalations-Workflow zu Tier-2 Experten',
      'AI-Zusammenfassung und Follow-Up',
    ],
    useCases: [
      'Skalierbarer 24/7 Kundensupport',
      'Automatisierte Vorqualifizierung von Tickets',
      'Schnelle Weiterleitung an Spezialisten',
      'Status-Updates & proaktive Follow-ups',
    ],
    flow: {
      name: 'Multi-Tier Support Bot',
      nodes: [
        createNode('trigger-1', 'trigger', { x: 100, y: 80 }, 'Start', {
          trigger_type: 'whatsapp_message',
        }),
        createNode('message-1', 'message', { x: 100, y: 220 }, 'Tier-1 Begrüßung', {
          message_text:
            'Hallo! 👋 Ich bin Ihr Tier-1 Support-Assistent. Bitte schildern Sie Ihr Anliegen – ich prüfe sofort, wie ich helfen kann.',
        }),
        createNode('question-1', 'question', { x: 100, y: 380 }, 'Kategorie', {
          question_text: 'Wie können wir helfen?',
          allow_custom_response: true,
        }),
        createNode('condition-1', 'condition', { x: 100, y: 540 }, 'Routing', {
          condition_type: 'contains',
          condition_field: 'user_message',
        }),
        createNode('ai-1', 'ai', { x: -120, y: 700 }, 'Silent Check & Analyse', {
          ai_prompt:
            'Analysiere das Kundenproblem, fasse es kurz zusammen und prüfe interne Statusinformationen.',
          ai_model: 'groq',
          use_knowledge: true,
        }),
        createNode('message-2', 'message', { x: -120, y: 860 }, 'Tier-1 Antwort', {
          message_text:
            'Ich habe die wichtigsten Punkte zusammengefasst und erste Schritte eingeleitet. Hier ist, was ich gefunden habe:',
        }),
        createNode('webhook-1', 'webhook', { x: 120, y: 720 }, 'Ticket erstellen', {
          webhook_url: 'https://api.example.com/support/ticket',
          webhook_method: 'POST',
        }),
        createNode('message-3', 'message', { x: 120, y: 880 }, 'Eskalation Tier-2', {
          message_text:
            'Ich eskaliere Ihr Ticket an unser Tier-2 Team. Sie erhalten in Kürze ein Update von einem Spezialisten.',
        }),
        createNode('message-4', 'message', { x: 360, y: 720 }, 'Status Follow-up', {
          message_text:
            'Ihr aktueller Ticketstatus lautet: {status}. Benötigen Sie weitere Unterstützung?',
        }),
        createNode('question-2', 'question', { x: 360, y: 880 }, 'Weitere Hilfe?', {
          question_text: 'Kann ich sonst noch etwas für Sie tun?',
          allow_custom_response: true,
          options: [
            { id: 'yes', label: 'Ja, bitte weiterhelfen' },
            { id: 'no', label: 'Nein, danke' },
          ],
        }),
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'message-1' },
        { id: 'e2-3', source: 'message-1', target: 'question-1' },
        { id: 'e3-4', source: 'question-1', target: 'condition-1' },
        { id: 'e4-5', source: 'condition-1', target: 'ai-1' },
        { id: 'e5-6', source: 'ai-1', target: 'message-2' },
        { id: 'e4-7', source: 'condition-1', target: 'webhook-1' },
        { id: 'e7-8', source: 'webhook-1', target: 'message-3' },
        { id: 'e4-9', source: 'condition-1', target: 'message-4' },
        { id: 'e9-10', source: 'message-4', target: 'question-2' },
      ],
    },
  },
  {
    id: 'customer-service',
    name: 'Kundenservice',
    description: 'Professioneller Support-Bot für Kundenanfragen und Support-Tickets',
    icon: '💬',
    category: 'customer-service',
    features: [
      'Automatische Begrüßung',
      'FAQ-Beantwortung',
      'Ticket-Erstellung',
      'Weiterleitung zu Agenten',
      'Status-Abfragen',
    ],
    useCases: [
      '24/7 Kundenbetreuung',
      'Häufige Fragen beantworten',
      'Support-Tickets erstellen',
      'Kundenanfragen priorisieren',
    ],
    flow: {
      name: 'Kundenservice Bot',
      nodes: [
        createNode('trigger-1', 'trigger', { x: 250, y: 100 }, 'Start', {
          trigger_type: 'whatsapp_message',
        }),
        createNode('message-1', 'message', { x: 250, y: 250 }, 'Willkommensnachricht', {
          message_text: 'Hallo! 👋 Willkommen beim Kundenservice. Wie kann ich Ihnen helfen?',
        }),
        createNode('condition-1', 'condition', { x: 250, y: 400 }, 'Anfrage-Typ', {
          condition_type: 'contains',
          condition_field: 'user_message',
        }),
        createNode('message-2', 'message', { x: 50, y: 550 }, 'FAQ-Antwort', {
          message_text: 'Hier sind die häufigsten Fragen und Antworten...',
        }),
        createNode('webhook-1', 'webhook', { x: 250, y: 550 }, 'Ticket erstellen', {
          webhook_url: 'https://api.example.com/create-ticket',
          webhook_method: 'POST',
        }),
        createNode('question-1', 'question', { x: 450, y: 550 }, 'Status-Abfrage', {
          question_text: 'Bitte geben Sie Ihre Ticket-Nummer ein:',
          allow_custom_response: true,
        }),
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'message-1' },
        { id: 'e2-3', source: 'message-1', target: 'condition-1' },
        { id: 'e3-4', source: 'condition-1', target: 'message-2' },
        { id: 'e3-5', source: 'condition-1', target: 'webhook-1' },
        { id: 'e3-6', source: 'condition-1', target: 'question-1' },
      ],
    },
  },
  {
    id: 'e-commerce',
    name: 'E-Commerce',
    description: 'Bot für Bestellungen, Produktanfragen und Bestellstatus',
    icon: '🛒',
    category: 'e-commerce',
    features: [
      'Produktsuche',
      'Bestellaufgabe',
      'Bestellstatus',
      'Warenkorb-Verwaltung',
      'Zahlungsabwicklung',
    ],
    useCases: [
      'Produkte finden',
      'Bestellungen aufgeben',
      'Bestellstatus prüfen',
      'Retouren verwalten',
    ],
    flow: {
      name: 'E-Commerce Bot',
      nodes: [
        createNode('trigger-1', 'trigger', { x: 250, y: 100 }, 'Start', {
          trigger_type: 'whatsapp_message',
        }),
        createNode('message-1', 'message', { x: 250, y: 250 }, 'Willkommensnachricht', {
          message_text: 'Willkommen in unserem Shop! 🛍️ Was möchten Sie tun?',
        }),
        createNode('condition-1', 'condition', { x: 250, y: 400 }, 'Aktion', {
          condition_type: 'contains',
          condition_field: 'user_message',
        }),
        createNode('webhook-1', 'webhook', { x: 50, y: 550 }, 'Produktsuche', {
          webhook_url: 'https://api.example.com/search-products',
          webhook_method: 'POST',
        }),
        createNode('webhook-2', 'webhook', { x: 250, y: 550 }, 'Bestellung', {
          webhook_url: 'https://api.example.com/create-order',
          webhook_method: 'POST',
        }),
        createNode('webhook-3', 'webhook', { x: 450, y: 550 }, 'Status prüfen', {
          webhook_url: 'https://api.example.com/check-order-status',
          webhook_method: 'POST',
        }),
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'message-1' },
        { id: 'e2-3', source: 'message-1', target: 'condition-1' },
        { id: 'e3-4', source: 'condition-1', target: 'webhook-1' },
        { id: 'e3-5', source: 'condition-1', target: 'webhook-2' },
        { id: 'e3-6', source: 'condition-1', target: 'webhook-3' },
      ],
    },
  },
  {
    id: 'booking',
    name: 'Buchungen',
    description: 'Bot für Terminbuchungen, Reservierungen und Kalenderverwaltung',
    icon: '📅',
    category: 'booking',
    features: [
      'Terminbuchung',
      'Verfügbarkeit prüfen',
      'Buchungsbestätigung',
      'Erinnerungen',
      'Stornierung',
    ],
    useCases: [
      'Termine buchen',
      'Verfügbarkeit anzeigen',
      'Buchungen verwalten',
      'Erinnerungen senden',
    ],
    flow: {
      name: 'Buchungs Bot',
      nodes: [
        createNode('trigger-1', 'trigger', { x: 250, y: 100 }, 'Start', {
          trigger_type: 'keyword',
          keyword: 'Termin',
        }),
        createNode('message-1', 'message', { x: 250, y: 250 }, 'Willkommensnachricht', {
          message_text: 'Gerne helfe ich Ihnen bei der Terminbuchung! 📅',
        }),
        createNode('question-1', 'question', { x: 250, y: 400 }, 'Datum wählen', {
          question_text: 'Bitte wählen Sie ein Datum für Ihren Termin:',
          allow_custom_response: true,
        }),
        createNode('webhook-1', 'webhook', { x: 250, y: 550 }, 'Verfügbarkeit prüfen', {
          webhook_url: 'https://api.example.com/check-availability',
          webhook_method: 'POST',
        }),
        createNode('condition-1', 'condition', { x: 250, y: 700 }, 'Verfügbar?', {
          condition_type: 'equals',
          condition_field: 'availability',
        }),
        createNode('webhook-2', 'webhook', { x: 50, y: 850 }, 'Termin buchen', {
          webhook_url: 'https://api.example.com/book-appointment',
          webhook_method: 'POST',
        }),
        createNode('message-2', 'message', { x: 450, y: 850 }, 'Alternative Termine', {
          message_text: 'Leider ist dieser Termin nicht verfügbar. Hier sind alternative Termine...',
        }),
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'message-1' },
        { id: 'e2-3', source: 'message-1', target: 'question-1' },
        { id: 'e3-4', source: 'question-1', target: 'webhook-1' },
        { id: 'e4-5', source: 'webhook-1', target: 'condition-1' },
        { id: 'e5-6', source: 'condition-1', target: 'webhook-2' },
        { id: 'e5-7', source: 'condition-1', target: 'message-2' },
      ],
    },
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Bot für Lead-Generierung, Newsletter-Anmeldung und Kampagnen',
    icon: '📢',
    category: 'marketing',
    features: [
      'Lead-Erfassung',
      'Newsletter-Anmeldung',
      'Kampagnen-Verwaltung',
      'Interessenten-Segmentierung',
      'Follow-up-Automatisierung',
    ],
    useCases: [
      'Leads sammeln',
      'Newsletter-Anmeldungen',
      'Marketing-Kampagnen',
      'Interessenten qualifizieren',
    ],
    flow: {
      name: 'Marketing Bot',
      nodes: [
        createNode('trigger-1', 'trigger', { x: 250, y: 100 }, 'Start', {
          trigger_type: 'keyword',
          keyword: 'Newsletter',
        }),
        createNode('message-1', 'message', { x: 250, y: 250 }, 'Willkommensnachricht', {
          message_text: 'Vielen Dank für Ihr Interesse! 📢 Möchten Sie unseren Newsletter abonnieren?',
        }),
        createNode('question-1', 'question', { x: 250, y: 400 }, 'E-Mail', {
          question_text: 'Bitte geben Sie Ihre E-Mail-Adresse ein:',
          allow_custom_response: true,
        }),
        createNode('webhook-1', 'webhook', { x: 250, y: 550 }, 'Newsletter anmelden', {
          webhook_url: 'https://api.example.com/subscribe-newsletter',
          webhook_method: 'POST',
        }),
        createNode('message-2', 'message', { x: 250, y: 700 }, 'Bestätigung', {
          message_text: 'Vielen Dank! Sie erhalten in Kürze eine Bestätigungs-E-Mail. ✅',
        }),
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'message-1' },
        { id: 'e2-3', source: 'message-1', target: 'question-1' },
        { id: 'e3-4', source: 'question-1', target: 'webhook-1' },
        { id: 'e4-5', source: 'webhook-1', target: 'message-2' },
      ],
    },
  },
  {
    id: 'support',
    name: 'Support',
    description: 'Technischer Support-Bot für Problemlösung und Anleitungen',
    icon: '🔧',
    category: 'support',
    features: [
      'Problemanalyse',
      'Schritt-für-Schritt-Anleitungen',
      'Ticket-Erstellung',
      'Eskalation zu Agenten',
      'Wissensdatenbank',
    ],
    useCases: [
      'Technische Probleme lösen',
      'Anleitungen bereitstellen',
      'Support-Tickets erstellen',
      'Eskalation verwalten',
    ],
    flow: {
      name: 'Support Bot',
      nodes: [
        createNode('trigger-1', 'trigger', { x: 250, y: 100 }, 'Start', {
          trigger_type: 'keyword',
          keyword: 'Hilfe',
        }),
        createNode('message-1', 'message', { x: 250, y: 250 }, 'Willkommensnachricht', {
          message_text: 'Hallo! 🔧 Wie kann ich Ihnen helfen? Beschreiben Sie Ihr Problem.',
        }),
        createNode('question-1', 'question', { x: 250, y: 400 }, 'Problem beschreiben', {
          question_text: 'Beschreiben Sie Ihr Problem:',
          allow_custom_response: true,
        }),
        createNode('ai-1', 'ai', { x: 250, y: 550 }, 'Lösung suchen', {
          ai_prompt: 'Suche in der Wissensdatenbank nach Lösungen für das beschriebene Problem.',
          ai_model: 'groq',
          use_knowledge: true,
        }),
        createNode('condition-1', 'condition', { x: 250, y: 700 }, 'Lösung gefunden?', {
          condition_type: 'contains',
          condition_field: 'ai_response',
        }),
        createNode('message-2', 'message', { x: 50, y: 850 }, 'Lösung', {
          message_text: 'Hier ist die Lösung für Ihr Problem...',
        }),
        createNode('webhook-1', 'webhook', { x: 450, y: 850 }, 'Ticket erstellen', {
          webhook_url: 'https://api.example.com/create-support-ticket',
          webhook_method: 'POST',
        }),
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'message-1' },
        { id: 'e2-3', source: 'message-1', target: 'question-1' },
        { id: 'e3-4', source: 'question-1', target: 'ai-1' },
        { id: 'e4-5', source: 'ai-1', target: 'condition-1' },
        { id: 'e5-6', source: 'condition-1', target: 'message-2' },
        { id: 'e5-7', source: 'condition-1', target: 'webhook-1' },
      ],
    },
  },
  {
    id: 'faq',
    name: 'FAQ',
    description: 'Einfacher FAQ-Bot für häufige Fragen und Antworten',
    icon: '❓',
    category: 'faq',
    features: [
      'FAQ-Katalog',
      'Intelligente Suche',
      'Kategorien',
      'Statistiken',
      'Feedback-Sammlung',
    ],
    useCases: [
      'Häufige Fragen beantworten',
      'FAQ-Verwaltung',
      'Selbstbedienung',
      'Support entlasten',
    ],
    flow: {
      name: 'FAQ Bot',
      nodes: [
        createNode('trigger-1', 'trigger', { x: 250, y: 100 }, 'Start', {
          trigger_type: 'keyword',
          keyword: 'FAQ',
        }),
        createNode('message-1', 'message', { x: 250, y: 250 }, 'Willkommensnachricht', {
          message_text: 'Hallo! ❓ Hier sind die häufigsten Fragen. Wählen Sie eine Kategorie:',
        }),
        createNode('condition-1', 'condition', { x: 250, y: 400 }, 'Kategorie', {
          condition_type: 'contains',
          condition_field: 'user_message',
        }),
        createNode('message-2', 'message', { x: 50, y: 550 }, 'Allgemeine FAQs', {
          message_text: 'Hier sind die allgemeinen Fragen und Antworten...',
        }),
        createNode('message-3', 'message', { x: 250, y: 550 }, 'Technische FAQs', {
          message_text: 'Hier sind die technischen Fragen und Antworten...',
        }),
        createNode('message-4', 'message', { x: 450, y: 550 }, 'Konto-FAQs', {
          message_text: 'Hier sind die Konto-Fragen und Antworten...',
        }),
      ],
      edges: [
        { id: 'e1-2', source: 'trigger-1', target: 'message-1' },
        { id: 'e2-3', source: 'message-1', target: 'condition-1' },
        { id: 'e3-4', source: 'condition-1', target: 'message-2' },
        { id: 'e3-5', source: 'condition-1', target: 'message-3' },
        { id: 'e3-6', source: 'condition-1', target: 'message-4' },
      ],
    },
  },
];

export function getTemplateById(id: string): BotTemplate | undefined {
  return botTemplates.find((template) => template.id === id);
}

export function getTemplatesByCategory(category: BotTemplate['category']): BotTemplate[] {
  return botTemplates.filter((template) => template.category === category);
}
