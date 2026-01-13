import { MetaGraphAPIClient } from './meta-client';
import { PhoneVerificationService } from './phone-verification';

export interface AutoSetupConfig {
  accessToken: string;
  businessAccountId: string;
  phoneNumberId?: string;
  webhookUrl: string;
  verifyToken: string;
  webhookFields?: string[];
}

export interface AutoSetupResult {
  success: boolean;
  phoneNumberId?: string;
  webhookConfigured: boolean;
  errors: string[];
}

/**
 * Automatischer Setup-Prozess für WhatsApp Business API
 */
export class AutoSetupService {
  private client: MetaGraphAPIClient;
  private phoneService: PhoneVerificationService;

  constructor(accessToken: string) {
    this.client = new MetaGraphAPIClient(accessToken);
    this.phoneService = new PhoneVerificationService(this.client);
  }

  /**
   * Führt den vollständigen automatischen Setup-Prozess durch
   */
  async performAutoSetup(config: AutoSetupConfig): Promise<AutoSetupResult> {
    const errors: string[] = [];
    let phoneNumberId = config.phoneNumberId;
    let webhookConfigured = false;

    try {
      // Step 1: Phone Number Selection/Verification
      if (!phoneNumberId) {
        const phoneNumbers = await this.phoneService.getPhoneNumbers(config.businessAccountId);
        
        if (phoneNumbers.length === 0) {
          errors.push('Keine Telefonnummern gefunden. Bitte fügen Sie eine in Meta Business Manager hinzu.');
        } else {
          // Auto-select first verified phone number, or first unverified
          const verified = phoneNumbers.find(p => p.code_verification_status === 'VERIFIED');
          const firstNumber = phoneNumbers[0];
          phoneNumberId = verified?.id || (firstNumber ? firstNumber.id : '');
          
          if (!verified) {
            errors.push('Keine verifizierte Telefonnummer gefunden. Bitte verifizieren Sie eine Telefonnummer.');
          }
        }
      }

      // Step 2: Webhook Configuration
      if (phoneNumberId) {
        try {
          await this.client.subscribeToWebhooks(
            config.businessAccountId,
            config.webhookFields || ['messages', 'message_status']
          );
          webhookConfigured = true;
        } catch (error) {
          errors.push(
            `Webhook-Konfiguration fehlgeschlagen: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      return {
        success: errors.length === 0,
        phoneNumberId,
        webhookConfigured,
        errors,
      };
    } catch (error) {
      errors.push(
        `Auto-Setup fehlgeschlagen: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return {
        success: false,
        phoneNumberId,
        webhookConfigured,
        errors,
      };
    }
  }

  /**
   * Validiert die aktuelle Konfiguration
   */
  async validateSetup(config: AutoSetupConfig): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Validate access token
      try {
        await this.client.getBusinessAccount(config.businessAccountId);
      } catch (error) {
        issues.push('Access Token ist ungültig oder abgelaufen');
      }

      // Validate phone number
      if (config.phoneNumberId) {
        const phoneNumbers = await this.phoneService.getPhoneNumbers(config.businessAccountId);
        const phoneNumber = phoneNumbers.find(p => p.id === config.phoneNumberId);
        
        if (!phoneNumber) {
          issues.push('Telefonnummer nicht gefunden');
        } else if (phoneNumber.code_verification_status !== 'VERIFIED') {
          issues.push('Telefonnummer ist nicht verifiziert');
        }
      } else {
        issues.push('Keine Telefonnummer konfiguriert');
      }

      // Validate webhook URL format
      try {
        new URL(config.webhookUrl);
      } catch {
        issues.push('Webhook URL ist ungültig');
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(`Validierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        valid: false,
        issues,
      };
    }
  }

  /**
   * Health Check für die WhatsApp-Verbindung
   */
  async healthCheck(config: AutoSetupConfig): Promise<{
    healthy: boolean;
    status: {
      businessAccount: 'ok' | 'error';
      phoneNumber: 'ok' | 'error' | 'not_configured';
      webhook: 'ok' | 'error' | 'not_configured';
    };
    errors: string[];
  }> {
    const errors: string[] = [];
    const status: {
      businessAccount: 'ok' | 'error';
      phoneNumber: 'ok' | 'error' | 'not_configured';
      webhook: 'ok' | 'error' | 'not_configured';
    } = {
      businessAccount: 'ok',
      phoneNumber: 'not_configured',
      webhook: 'not_configured',
    };

    try {
      // Check business account
      try {
        await this.client.getBusinessAccount(config.businessAccountId);
      } catch (error) {
        status.businessAccount = 'error';
        errors.push('Business Account nicht erreichbar');
      }

      // Check phone number
      if (config.phoneNumberId) {
        try {
          const phoneNumbers = await this.phoneService.getPhoneNumbers(config.businessAccountId);
          const phoneNumber = phoneNumbers.find(p => p.id === config.phoneNumberId);
          
          if (phoneNumber && phoneNumber.code_verification_status === 'VERIFIED') {
            status.phoneNumber = 'ok';
          } else {
            status.phoneNumber = 'error';
            errors.push('Telefonnummer nicht verifiziert');
          }
        } catch (error) {
          status.phoneNumber = 'error';
          errors.push('Telefonnummer nicht erreichbar');
        }
      }

      // Check webhook (basic validation - can't fully test without Meta's verification)
      if (config.webhookUrl) {
        try {
          new URL(config.webhookUrl);
          status.webhook = 'ok';
        } catch {
          status.webhook = 'error';
          errors.push('Webhook URL ungültig');
        }
      }

      return {
        healthy: errors.length === 0 && status.businessAccount === 'ok',
        status,
        errors,
      };
    } catch (error) {
      errors.push(`Health Check fehlgeschlagen: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        healthy: false,
        status,
        errors,
      };
    }
  }
}

