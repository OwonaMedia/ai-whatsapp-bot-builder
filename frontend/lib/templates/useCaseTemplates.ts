import { BotFlow } from '@/types/bot';

export interface UseCaseTemplate {
  id: string;
  name: string;
  description: string;
  useCaseType: 'customer_service' | 'booking' | 'ecommerce' | 'information';
  flow: BotFlow;
  aiPromptTemplate: string;
  suggestedKnowledgeSources: string[];
}

export const USE_CASE_TEMPLATES: Record<string, UseCaseTemplate> = {
  customer_service: {
    id: 'customer_service',
    name: 'Kundenservice Bot',
    description: 'FAQ-Bot für Kundenservice und Support-Anfragen',
    useCaseType: 'customer_service',
    flow: {
      name: 'Kundenservice Flow',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 100 },
          data: {
            label: 'Nachricht empfangen',
            config: {
              trigger_type: 'whatsapp_message',
            },
          },
        },
        {
          id: 'welcome-1',
          type: 'message',
          position: { x: 250, y: 200 },
          data: {
            label: 'Willkommensnachricht',
            config: {
              message_text: 'Hallo! 👋\n\nIch bin dein Kundenservice-Assistent. Wie kann ich dir helfen?\n\nDu kannst Fragen zu unseren Produkten, Bestellungen oder allgemeinen Anfragen stellen.',
            },
          },
        },
        {
          id: 'ai-faq-1',
          type: 'ai',
          position: { x: 250, y: 300 },
          data: {
            label: 'FAQ AI',
            config: {
              ai_prompt: `Du bist ein hilfreicher Kundenservice-Bot für ein Unternehmen.

Antworte NUR zu Fragen über:
- Produkte und Dienstleistungen
- Bestellungen und Lieferungen
- Support-Anfragen
- Rückgaben und Umtausch
- Preise und Angebote

Bei Fragen außerhalb dieser Bereiche: Sage dem Kunden, dass du für diese spezifische Frage an einen menschlichen Support-Mitarbeiter weiterleitest.

Antworte immer freundlich, professionell und hilfreich auf Deutsch.`,
              ai_model: 'groq',
              use_context: true,
            },
          },
        },
        {
          id: 'satisfaction-1',
          type: 'question',
          position: { x: 250, y: 400 },
          data: {
            label: 'Zufriedenheitsfrage',
            config: {
              question_text: 'Konnte ich dir weiterhelfen?',
              options: [
                { id: 'yes', label: 'Ja, danke!', value: 'yes' },
                { id: 'no', label: 'Nein, brauche mehr Hilfe', value: 'no' },
              ],
              allow_custom_response: false,
            },
          },
        },
        {
          id: 'end-yes',
          type: 'end',
          position: { x: 100, y: 500 },
          data: {
            label: 'Ende (zufrieden)',
            config: {},
          },
        },
        {
          id: 'support-option',
          type: 'message',
          position: { x: 400, y: 500 },
          data: {
            label: 'Support weiterleiten',
            config: {
              message_text: 'Verstanden! Ich leite dich an unseren Support weiter. Du wirst in Kürze von einem Mitarbeiter kontaktiert.\n\nVielen Dank für deine Geduld! 🙏',
            },
          },
        },
        {
          id: 'end-support',
          type: 'end',
          position: { x: 400, y: 600 },
          data: {
            label: 'Ende (Support)',
            config: {},
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'welcome-1' },
        { id: 'e2', source: 'welcome-1', target: 'ai-faq-1' },
        { id: 'e3', source: 'ai-faq-1', target: 'satisfaction-1' },
        { id: 'e4', source: 'satisfaction-1', target: 'end-yes', label: 'yes' },
        { id: 'e5', source: 'satisfaction-1', target: 'support-option', label: 'no' },
        { id: 'e6', source: 'support-option', target: 'end-support' },
      ],
    },
    aiPromptTemplate: `Du bist ein hilfreicher Kundenservice-Bot für [UNTERNEHMEN].

Antworte NUR zu Fragen über:
- Produkte und Dienstleistungen
- Bestellungen und Lieferungen
- Support-Anfragen
- Rückgaben und Umtausch
- Preise und Angebote

Bei Fragen außerhalb dieser Bereiche: Sage dem Kunden, dass du für diese spezifische Frage an einen menschlichen Support-Mitarbeiter weiterleitest.

Antworte immer freundlich, professionell und hilfreich auf Deutsch.`,
    suggestedKnowledgeSources: [
      'FAQ-Dokument',
      'Produktkatalog',
      'Rückgabebedingungen',
      'Versandinformationen',
    ],
  },

  booking: {
    id: 'booking',
    name: 'Buchungs-Bot',
    description: 'Terminbuchung und Reservierungen',
    useCaseType: 'booking',
    flow: {
      name: 'Buchungs Flow',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 100 },
          data: {
            label: 'Buchung starten',
            config: {
              trigger_type: 'keyword',
              keyword: 'buchen',
            },
          },
        },
        {
          id: 'welcome-1',
          type: 'message',
          position: { x: 250, y: 200 },
          data: {
            label: 'Willkommensnachricht',
            config: {
              message_text: 'Hallo! 👋\n\nGerne helfe ich dir bei der Terminbuchung. Lass uns gemeinsam einen passenden Termin finden!',
            },
          },
        },
        {
          id: 'service-selection',
          type: 'question',
          position: { x: 250, y: 300 },
          data: {
            label: 'Service-Auswahl',
            config: {
              question_text: 'Welchen Service möchtest du buchen?',
              options: [
                { id: 'service1', label: 'Service Option 1', value: 'service1' },
                { id: 'service2', label: 'Service Option 2', value: 'service2' },
                { id: 'service3', label: 'Service Option 3', value: 'service3' },
              ],
              allow_custom_response: false,
            },
          },
        },
        {
          id: 'date-question',
          type: 'question',
          position: { x: 250, y: 400 },
          data: {
            label: 'Datum-Frage',
            config: {
              question_text: 'Wann passt es dir? Bitte gib das Datum ein (z.B. DD.MM.YYYY)',
              options: [],
              allow_custom_response: true,
            },
          },
        },
        {
          id: 'time-question',
          type: 'question',
          position: { x: 250, y: 500 },
          data: {
            label: 'Uhrzeit-Frage',
            config: {
              question_text: 'Welche Uhrzeit passt dir?',
              options: [
                { id: 'morning', label: 'Vormittag (9-12 Uhr)', value: 'morning' },
                { id: 'afternoon', label: 'Nachmittag (12-17 Uhr)', value: 'afternoon' },
                { id: 'evening', label: 'Abend (17-20 Uhr)', value: 'evening' },
              ],
              allow_custom_response: false,
            },
          },
        },
        {
          id: 'confirmation',
          type: 'message',
          position: { x: 250, y: 600 },
          data: {
            label: 'Bestätigung',
            config: {
              message_text: 'Perfekt! ✅\n\nDein Termin wurde gebucht:\n- Service: [SERVICE]\n- Datum: [DATUM]\n- Uhrzeit: [UHRZEIT]\n\nDu erhältst eine Bestätigungs-Email. Bei Fragen einfach melden!',
            },
          },
        },
        {
          id: 'end-1',
          type: 'end',
          position: { x: 250, y: 700 },
          data: {
            label: 'Ende',
            config: {},
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'welcome-1' },
        { id: 'e2', source: 'welcome-1', target: 'service-selection' },
        { id: 'e3', source: 'service-selection', target: 'date-question' },
        { id: 'e4', source: 'date-question', target: 'time-question' },
        { id: 'e5', source: 'time-question', target: 'confirmation' },
        { id: 'e6', source: 'confirmation', target: 'end-1' },
      ],
    },
    aiPromptTemplate: `Du bist ein Buchungsassistent für [SERVICE].

Antworte NUR zu:
- Verfügbarkeit prüfen
- Termine buchen
- Buchungen ändern/stornieren
- Preise und Angebote
- Öffnungszeiten

Bei anderen Fragen: Leite zur Website oder Hotline weiter.

Antworte freundlich und hilfreich auf Deutsch.`,
    suggestedKnowledgeSources: [
      'Service-Beschreibungen',
      'Preisliste',
      'Öffnungszeiten',
      'Stornierungsbedingungen',
    ],
  },

  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce Bot',
    description: 'Produktberatung und Bestellabwicklung',
    useCaseType: 'ecommerce',
    flow: {
      name: 'E-Commerce Flow',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 100 },
          data: {
            label: 'Nachricht empfangen',
            config: {
              trigger_type: 'whatsapp_message',
            },
          },
        },
        {
          id: 'welcome-1',
          type: 'message',
          position: { x: 250, y: 200 },
          data: {
            label: 'Willkommensnachricht',
            config: {
              message_text: 'Willkommen in unserem Shop! 🛒\n\nIch helfe dir gerne bei:\n- Produktberatung\n- Bestellungen\n- Lieferstatus\n- Rückgaben\n\nWobei kann ich dir helfen?',
            },
          },
        },
        {
          id: 'main-menu',
          type: 'question',
          position: { x: 250, y: 300 },
          data: {
            label: 'Hauptmenü',
            config: {
              question_text: 'Wobei kann ich dir helfen?',
              options: [
                { id: 'products', label: 'Produkte suchen', value: 'products' },
                { id: 'order', label: 'Bestellung aufgeben', value: 'order' },
                { id: 'tracking', label: 'Lieferstatus prüfen', value: 'tracking' },
                { id: 'return', label: 'Rückgabe', value: 'return' },
              ],
              allow_custom_response: false,
            },
          },
        },
        {
          id: 'ai-product-consultation',
          type: 'ai',
          position: { x: 100, y: 400 },
          data: {
            label: 'Produktberatung AI',
            config: {
              ai_prompt: `Du bist ein Produktberater für einen Online-Shop.

Antworte NUR zu:
- Produktempfehlungen
- Produktdetails und Spezifikationen
- Verfügbarkeit
- Preise und Angebote
- Produktvergleiche

Bei Bestellwünschen: Leite zur Bestellung weiter.
Bei anderen Fragen: Verweise auf Support.

Antworte freundlich, verkaufsorientiert aber nicht aufdringlich auf Deutsch.`,
              ai_model: 'groq',
              use_context: true,
            },
          },
        },
        {
          id: 'end-products',
          type: 'end',
          position: { x: 100, y: 500 },
          data: {
            label: 'Ende (Produkte)',
            config: {},
          },
        },
        {
          id: 'order-flow',
          type: 'message',
          position: { x: 400, y: 400 },
          data: {
            label: 'Bestell-Info',
            config: {
              message_text: 'Gerne helfe ich dir bei deiner Bestellung! 📦\n\nBitte gib die Artikel-Nummern oder Produktnamen ein, die du bestellen möchtest.',
            },
          },
        },
        {
          id: 'end-order',
          type: 'end',
          position: { x: 400, y: 500 },
          data: {
            label: 'Ende (Bestellung)',
            config: {},
          },
        },
        {
          id: 'tracking-info',
          type: 'message',
          position: { x: 100, y: 400 },
          data: {
            label: 'Tracking-Info',
            config: {
              message_text: 'Für den Lieferstatus benötige ich deine Bestellnummer. Bitte gib sie ein.',
            },
          },
        },
        {
          id: 'return-info',
          type: 'message',
          position: { x: 400, y: 400 },
          data: {
            label: 'Rückgabe-Info',
            config: {
              message_text: 'Für die Rückgabe benötige ich:\n- Bestellnummer\n- Grund der Rückgabe\n\nBitte sende mir diese Informationen.',
            },
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'welcome-1' },
        { id: 'e2', source: 'welcome-1', target: 'main-menu' },
        { id: 'e3', source: 'main-menu', target: 'ai-product-consultation', label: 'products' },
        { id: 'e4', source: 'ai-product-consultation', target: 'end-products' },
        { id: 'e5', source: 'main-menu', target: 'order-flow', label: 'order' },
        { id: 'e6', source: 'order-flow', target: 'end-order' },
        { id: 'e7', source: 'main-menu', target: 'tracking-info', label: 'tracking' },
        { id: 'e8', source: 'main-menu', target: 'return-info', label: 'return' },
      ],
    },
    aiPromptTemplate: `Du bist ein Produktberater für einen Online-Shop.

Antworte NUR zu:
- Produktempfehlungen
- Produktdetails und Spezifikationen
- Verfügbarkeit
- Preise und Angebote
- Produktvergleiche

Bei Bestellwünschen: Leite zur Bestellung weiter.
Bei anderen Fragen: Verweise auf Support.

Antworte freundlich, verkaufsorientiert aber nicht aufdringlich auf Deutsch.`,
    suggestedKnowledgeSources: [
      'Produktkatalog',
      'Preisliste',
      'Lieferinformationen',
      'Rückgabebedingungen',
    ],
  },

  information: {
    id: 'information',
    name: 'Informations-Bot',
    description: 'News, Updates und Event-Informationen',
    useCaseType: 'information',
    flow: {
      name: 'Informations Flow',
      nodes: [
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 100 },
          data: {
            label: 'Nachricht empfangen',
            config: {
              trigger_type: 'whatsapp_message',
            },
          },
        },
        {
          id: 'welcome-1',
          type: 'message',
          position: { x: 250, y: 200 },
          data: {
            label: 'Willkommensnachricht',
            config: {
              message_text: 'Hallo! 👋\n\nIch informiere dich über:\n- Aktuelle News\n- Events und Veranstaltungen\n- Updates\n- Kontaktinformationen\n\nWonach suchst du?',
            },
          },
        },
        {
          id: 'main-menu',
          type: 'question',
          position: { x: 250, y: 300 },
          data: {
            label: 'Hauptmenü',
            config: {
              question_text: 'Welche Information benötigst du?',
              options: [
                { id: 'news', label: 'Aktuelle News', value: 'news' },
                { id: 'events', label: 'Events', value: 'events' },
                { id: 'contact', label: 'Kontakt', value: 'contact' },
              ],
              allow_custom_response: false,
            },
          },
        },
        {
          id: 'ai-information',
          type: 'ai',
          position: { x: 250, y: 400 },
          data: {
            label: 'Informations-AI',
            config: {
              ai_prompt: `Du bist ein Informations-Bot.

Antworte NUR zu:
- Aktuelle News und Updates
- Events und Veranstaltungen
- Kontaktinformationen
- Allgemeine Informationen über [ORGANISATION]

Bei spezifischen Support-Fragen: Verweise auf Support-Kontakt.

Antworte informativ, präzise und freundlich auf Deutsch.`,
              ai_model: 'groq',
              use_context: true,
            },
          },
        },
        {
          id: 'end-1',
          type: 'end',
          position: { x: 250, y: 500 },
          data: {
            label: 'Ende',
            config: {},
          },
        },
      ],
      edges: [
        { id: 'e1', source: 'trigger-1', target: 'welcome-1' },
        { id: 'e2', source: 'welcome-1', target: 'main-menu' },
        { id: 'e3', source: 'main-menu', target: 'ai-information' },
        { id: 'e4', source: 'ai-information', target: 'end-1' },
      ],
    },
    aiPromptTemplate: `Du bist ein Informations-Bot.

Antworte NUR zu:
- Aktuelle News und Updates
- Events und Veranstaltungen
- Kontaktinformationen
- Allgemeine Informationen über [ORGANISATION]

Bei spezifischen Support-Fragen: Verweise auf Support-Kontakt.

Antworte informativ, präzise und freundlich auf Deutsch.`,
    suggestedKnowledgeSources: [
      'Aktuelle News',
      'Event-Kalender',
      'Kontaktinformationen',
      'Über uns',
    ],
  },
};

/**
 * Get template by use case type
 */
export function getTemplateByUseCase(useCaseType: string): UseCaseTemplate | null {
  return USE_CASE_TEMPLATES[useCaseType] || null;
}

/**
 * Get all templates
 */
export function getAllTemplates(): UseCaseTemplate[] {
  return Object.values(USE_CASE_TEMPLATES);
}

/**
 * Customize template with bot-specific information
 */
export function customizeTemplate(
  template: UseCaseTemplate,
  botName: string,
  companyName?: string
): BotFlow {
  const flow = JSON.parse(JSON.stringify(template.flow)); // Deep clone

  // Replace placeholders in messages
  flow.nodes.forEach((node: any) => {
    if (node.type === 'message' && node.data.config.message_text) {
      node.data.config.message_text = node.data.config.message_text
        .replace('[UNTERNEHMEN]', companyName || botName)
        .replace('[ORGANISATION]', companyName || botName)
        .replace('[SERVICE]', companyName || botName);
    }
    if (node.type === 'ai' && node.data.config.ai_prompt) {
      node.data.config.ai_prompt = node.data.config.ai_prompt
        .replace('[UNTERNEHMEN]', companyName || botName)
        .replace('[ORGANISATION]', companyName || botName)
        .replace('[SERVICE]', companyName || botName);
    }
  });

  flow.name = `${botName} - ${template.name}`;

  return flow;
}

