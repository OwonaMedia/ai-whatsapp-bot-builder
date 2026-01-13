import { config } from '@/lib/config';

export interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'interactive';
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
  interactive?: {
    type: 'button' | 'list';
    body: { text: string };
    action: {
      buttons?: Array<{ type: 'reply'; reply: { id: string; title: string } }>;
      sections?: any[];
    };
  };
}

export interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export class WhatsAppClient {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string;

  constructor(phoneNumberId?: string, accessToken?: string) {
    this.phoneNumberId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
  }

  /**
   * Send a text message
   */
  async sendTextMessage(to: string, text: string): Promise<WhatsAppResponse> {
    return this.sendMessage({
      to,
      type: 'text',
      text: { body: text },
    });
  }

  /**
   * Send a message with buttons
   */
  async sendInteractiveMessage(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<WhatsAppResponse> {
    return this.sendMessage({
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: buttons.map((btn) => ({
            type: 'reply' as const,
            reply: { id: btn.id, title: btn.title },
          })),
        },
      },
    });
  }

  /**
   * Send a template message (for outside 24h window)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'de',
    components?: any[]
  ): Promise<WhatsAppResponse> {
    return this.sendMessage({
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    });
  }

  /**
   * Send a message via WhatsApp Business API
   */
  private async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        ...message,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `WhatsApp API Error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(
    signature: string | null,
    payload: string,
    secret: string
  ): boolean {
    if (!signature || !secret) return false;

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return `sha256=${expectedSignature}` === signature;
  }
}

