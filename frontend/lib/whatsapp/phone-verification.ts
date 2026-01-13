import { MetaGraphAPIClient, PhoneNumber } from './meta-client';

export interface PhoneVerificationOptions {
  method?: 'SMS' | 'VOICE';
  language?: string;
  retries?: number;
  retryDelay?: number;
}

export interface PhoneVerificationResult {
  success: boolean;
  phoneNumberId: string;
  verified: boolean;
  error?: string;
}

export class PhoneVerificationService {
  private client: MetaGraphAPIClient;

  constructor(client: MetaGraphAPIClient) {
    this.client = client;
  }

  /**
   * Get all phone numbers for a business account
   */
  async getPhoneNumbers(businessAccountId: string): Promise<PhoneNumber[]> {
    try {
      return await this.client.listPhoneNumbers(businessAccountId);
    } catch (error) {
      throw new Error(
        `Failed to list phone numbers: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Request verification code for a phone number
   */
  async requestVerificationCode(
    phoneNumberId: string,
    options: PhoneVerificationOptions = {}
  ): Promise<{ success: boolean; code_length?: number }> {
    const { method = 'SMS', language = 'en' } = options;

    try {
      return await this.client.requestPhoneVerification(phoneNumberId, method, language);
    } catch (error) {
      throw new Error(
        `Failed to request verification code: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Verify phone number with code
   */
  async verifyCode(
    phoneNumberId: string,
    code: string
  ): Promise<PhoneVerificationResult> {
    try {
      const result = await this.client.verifyPhoneNumber(phoneNumberId, code);
      
      // Get updated phone number status
      const phoneNumbers = await this.getPhoneNumbers(phoneNumberId.split('_')[0] || '');
      const phoneNumber = phoneNumbers.find(p => p.id === phoneNumberId);

      return {
        success: result.success,
        phoneNumberId,
        verified: phoneNumber?.code_verification_status === 'VERIFIED',
        error: result.success ? undefined : 'Verification failed',
      };
    } catch (error) {
      return {
        success: false,
        phoneNumberId,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if phone number is already verified
   */
  async isVerified(phoneNumberId: string, businessAccountId: string): Promise<boolean> {
    try {
      const phoneNumbers = await this.getPhoneNumbers(businessAccountId);
      const phoneNumber = phoneNumbers.find(p => p.id === phoneNumberId);
      return phoneNumber?.code_verification_status === 'VERIFIED';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get phone number details
   */
  async getPhoneNumberDetails(
    phoneNumberId: string,
    businessAccountId: string
  ): Promise<PhoneNumber | null> {
    try {
      const phoneNumbers = await this.getPhoneNumbers(businessAccountId);
      return phoneNumbers.find(p => p.id === phoneNumberId) || null;
    } catch (error) {
      return null;
    }
  }
}

