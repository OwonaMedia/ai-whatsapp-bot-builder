import { WhatsAppClient, WhatsAppResponse } from '@/lib/whatsapp/client';

/**
 * Web Chat Client
 * Mock WhatsApp Client that collects messages instead of sending via WhatsApp
 */
export class WebChatClient extends WhatsAppClient {
  public onMessage?: (message: string) => void;
  public messageQueue: string[] = [];

  /**
   * Send text message (collects instead of sending via WhatsApp)
   */
  async sendTextMessage(to: string, text: string): Promise<WhatsAppResponse> {
    // Instead of sending via WhatsApp, collect the message
    if (this.onMessage) {
      this.onMessage(text);
    } else {
      this.messageQueue.push(text);
    }

    // Return mock response
    return {
      messaging_product: 'whatsapp',
      contacts: [{ input: to, wa_id: to }],
      messages: [{ id: `web_${Date.now()}` }],
    };
  }

  /**
   * Send interactive message (collects instead of sending)
   */
  async sendInteractiveMessage(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<WhatsAppResponse> {
    // Format interactive message for web chat
    const buttonText = buttons.map((b) => `${b.title}`).join(' | ');
    const fullMessage = `${body}\n\n[${buttonText}]`;

    if (this.onMessage) {
      this.onMessage(fullMessage);
    } else {
      this.messageQueue.push(fullMessage);
    }

    return {
      messaging_product: 'whatsapp',
      contacts: [{ input: to, wa_id: to }],
      messages: [{ id: `web_${Date.now()}` }],
    };
  }

  /**
   * Get queued messages (if onMessage wasn't set)
   */
  getQueuedMessages(): string[] {
    return this.messageQueue;
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    this.messageQueue = [];
  }
}

