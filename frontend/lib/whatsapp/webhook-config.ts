import { MetaGraphAPIClient } from './meta-client';

export interface WebhookConfiguration {
  url: string;
  verifyToken: string;
  fields: string[];
  businessAccountId: string;
  accessToken: string;
}

export interface WebhookConfigResult {
  success: boolean;
  message: string;
  errors?: string[];
}

/**
 * Webhook Auto-Configuration Service
 */
export class WebhookConfigService {
  private client: MetaGraphAPIClient;

  constructor(accessToken: string) {
    this.client = new MetaGraphAPIClient(accessToken);
  }

  /**
   * Konfiguriert den Webhook automatisch
   */
  async configureWebhook(config: WebhookConfiguration): Promise<WebhookConfigResult> {
    try {
      // Validate webhook URL
      try {
        new URL(config.url);
      } catch {
        return {
          success: false,
          message: 'Ungültige Webhook URL',
          errors: ['Die Webhook URL muss eine gültige URL sein'],
        };
      }

      // Subscribe to webhooks
      try {
        await this.client.subscribeToWebhooks(
          config.businessAccountId,
          config.fields
        );
      } catch (error) {
        return {
          success: false,
          message: 'Webhook-Abonnement fehlgeschlagen',
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        };
      }

      return {
        success: true,
        message: 'Webhook erfolgreich konfiguriert',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Webhook-Konfiguration fehlgeschlagen',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Validiert die Webhook-Konfiguration
   */
  async validateWebhookConfig(config: WebhookConfiguration): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // Validate URL
    try {
      new URL(config.url);
    } catch {
      issues.push('Webhook URL ist ungültig');
    }

    // Validate URL is HTTPS
    try {
      const url = new URL(config.url);
      if (url.protocol !== 'https:') {
        issues.push('Webhook URL muss HTTPS verwenden');
      }
    } catch {
      // Already caught above
    }

    // Validate verify token
    if (!config.verifyToken || config.verifyToken.length < 10) {
      issues.push('Verify Token muss mindestens 10 Zeichen lang sein');
    }

    // Validate fields
    if (!config.fields || config.fields.length === 0) {
      issues.push('Mindestens ein Webhook-Feld muss abonniert werden');
    }

    const validFields = ['messages', 'message_status', 'message_template_status'];
    const invalidFields = config.fields.filter(f => !validFields.includes(f));
    if (invalidFields.length > 0) {
      issues.push(`Ungültige Webhook-Felder: ${invalidFields.join(', ')}`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Generiert einen sicheren Verify Token
   */
  static generateVerifyToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Generiert die Webhook URL basierend auf der aktuellen Domain
   */
  static generateWebhookUrl(baseUrl?: string): string {
    if (baseUrl) {
      return `${baseUrl}/api/webhooks/whatsapp`;
    }
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/api/webhooks/whatsapp`;
    }
    return '/api/webhooks/whatsapp';
  }
}

