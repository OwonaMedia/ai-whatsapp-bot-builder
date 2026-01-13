import { useState } from 'react';

export interface CreatePaymentParams {
  provider: 'stripe' | 'paypal' | 'mollie' | 'klarna' | 'mtn-mobile-money';
  amount: number;
  currency: string;
  userId?: string;
  subscriptionId?: string;
  description?: string;
  customerEmail?: string;
  customerName?: string;
  locale?: string; // Wichtig für Rechnungserstellung
  billingCycle?: 'monthly' | 'yearly';
  returnUrl?: string;
  cancelUrl?: string;
  // Provider-spezifische Felder
  method?: string; // Mollie
  redirectUrl?: string; // Mollie
  webhookUrl?: string; // Mollie
  metadata?: Record<string, string>; // Mollie
  purchaseCountry?: string; // Klarna
  orderLines?: Array<Record<string, any>>; // Klarna
  merchantUrls?: Record<string, string>; // Klarna
  customer?: Record<string, any>; // Klarna
  phoneNumber?: string; // MTN Mobile Money
}

export interface PaymentResult {
  success: boolean;
  provider: string;
  paymentIntentId?: string;
  orderId?: string;
  clientSecret?: string;
  approveUrl?: string;
  checkoutUrl?: string; // Mollie
  sessionId?: string; // Klarna
  clientToken?: string; // Klarna
  referenceId?: string; // MTN Mobile Money
  financialTransactionId?: string; // MTN Mobile Money
  amount: number;
  currency: string;
  status: string;
  error?: string;
  payer?: {
    partyIdType: string;
    partyId: string;
  }; // MTN Mobile Money
  paymentMethodCategories?: Array<{ identifier: string; name: string }>; // Klarna
}

interface UsePaymentResult {
  createPayment: (params: CreatePaymentParams) => Promise<PaymentResult | null>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook zum Erstellen von Zahlungen
 */
export function usePayment(): UsePaymentResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayment = async (params: CreatePaymentParams): Promise<PaymentResult | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment');
      }

      return data as PaymentResult;
    } catch (err: any) {
      console.error('[usePayment] Error:', err);
      setError(err.message || 'Failed to create payment');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createPayment,
    loading,
    error,
  };
}

