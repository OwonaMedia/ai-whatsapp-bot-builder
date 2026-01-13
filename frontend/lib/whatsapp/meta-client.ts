import { config } from '@/lib/config';

export interface MetaOAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  business_account_id?: string;
  user_id?: string;
}

export interface WhatsAppBusinessAccount {
  id: string;
  name: string;
  timezone_id: string;
  message_template_namespace?: string;
}

export interface PhoneNumber {
  id: string;
  verified_name: string;
  display_phone_number: string;
  quality_rating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  code_verification_status: 'VERIFIED' | 'UNVERIFIED' | 'EXPIRED';
  eligibility_for_api_business_global_search?: string;
}

export interface WebhookConfig {
  url: string;
  verify_token: string;
  fields: string[];
}

export class MetaGraphAPIClient {
  private accessToken: string;
  private apiVersion: string;
  private baseUrl: string;

  constructor(accessToken: string, apiVersion: string = 'v18.0') {
    this.accessToken = accessToken;
    this.apiVersion = apiVersion;
    this.baseUrl = `https://graph.facebook.com/${apiVersion}`;
  }

  /**
   * Get WhatsApp Business Account details
   */
  async getBusinessAccount(businessAccountId: string): Promise<WhatsAppBusinessAccount> {
    const response = await fetch(
      `${this.baseUrl}/${businessAccountId}?fields=id,name,timezone_id,message_template_namespace`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Meta API Error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * List phone numbers for a WhatsApp Business Account
   */
  async listPhoneNumbers(businessAccountId: string): Promise<PhoneNumber[]> {
    const response = await fetch(
      `${this.baseUrl}/${businessAccountId}/phone_numbers?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status,eligibility_for_api_business_global_search`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Meta API Error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Request phone number verification code
   */
  async requestPhoneVerification(
    phoneNumberId: string,
    method: 'SMS' | 'VOICE' = 'SMS',
    language?: string
  ): Promise<{ success: boolean; code_length?: number }> {
    const response = await fetch(
      `${this.baseUrl}/${phoneNumberId}/request_code`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code_method: method,
          language: language || 'en',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Meta API Error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Verify phone number with code
   */
  async verifyPhoneNumber(phoneNumberId: string, code: string): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.baseUrl}/${phoneNumberId}/verify_code`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Meta API Error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Subscribe app to WhatsApp Business Account webhooks
   */
  async subscribeToWebhooks(
    businessAccountId: string,
    subscribedFields: string[] = ['messages', 'message_status']
  ): Promise<{ success: boolean }> {
    const response = await fetch(
      `${this.baseUrl}/${businessAccountId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscribed_fields: subscribedFields,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Meta API Error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Get current webhook configuration
   */
  async getWebhookConfig(appId: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/${appId}/subscriptions`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Meta API Error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }

  /**
   * Send a message via WhatsApp Business API
   */
  async sendMessage(
    phoneNumberId: string,
    to: string,
    message: {
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
  ): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          ...message,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Meta API Error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    return response.json();
  }
}

