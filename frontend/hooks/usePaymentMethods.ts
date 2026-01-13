import { useState, useEffect } from 'react';

export interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  priority: number;
  brandColor?: string;
  logos?: string[];
  fees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  processingTime: 'instant' | '1-3 days' | '24-48h';
  supportedCountries: string[];
  supportedCurrencies: string[];
  requiresSetup?: boolean;
  providerMethod?: string;
  purchaseCountry?: string | null;
  metadata?: Record<string, any>;
  supportsRedirect?: boolean;
  enabled?: boolean;
}

interface UsePaymentMethodsResult {
  methods: PaymentMethod[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  detectedCountry?: string | null;
  detectedCurrency?: string | null;
}

/**
 * Hook zum Abrufen verfügbarer Zahlungsmethoden basierend auf User-Location
 */
export function usePaymentMethods(
  currency?: string,
  country?: string
): UsePaymentMethodsResult {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [detectedCurrency, setDetectedCurrency] = useState<string | null>(null);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (currency) params.append('currency', currency);
      if (country) params.append('country', country);

      const response = await fetch(`/api/payments/methods?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment methods');
      }

      if (data.success && data.data?.paymentMethods) {
        setMethods(data.data.paymentMethods);
        setDetectedCountry(data.data.country || null);
        setDetectedCurrency(data.data.currency || null);
      } else if (data.success && data.data?.methods) {
        // Fallback für alte API-Struktur
        setMethods(data.data.methods);
        setDetectedCountry(data.data.country || null);
        setDetectedCurrency(data.data.currency || null);
      } else {
        setMethods([]);
        setDetectedCountry(null);
        setDetectedCurrency(null);
      }
    } catch (err: any) {
      console.error('[usePaymentMethods] Error:', err);
      setError(err.message || 'Failed to load payment methods');
      setMethods([]);
      setDetectedCountry(null);
      setDetectedCurrency(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, [currency, country]);

  return {
    methods,
    loading,
    error,
    refetch: fetchMethods,
    detectedCountry,
    detectedCurrency,
  };
}

