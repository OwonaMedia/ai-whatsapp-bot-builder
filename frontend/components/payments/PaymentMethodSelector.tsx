'use client';

import * as React from 'react';
import { usePaymentMethods, PaymentMethod } from '@/hooks/usePaymentMethods';
import { PaymentMethodCard } from './PaymentMethodCard';
import { Button } from '@/components/ui/Button';

export interface PaymentMethodSelectorProps {
  currency?: string;
  country?: string;
  selectedMethod?: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  onContinue?: () => void;
  showContinueButton?: boolean;
}

export function PaymentMethodSelector({
  currency,
  country,
  selectedMethod,
  onSelect,
  onContinue,
  showContinueButton = false,
}: PaymentMethodSelectorProps) {
  const [regionOverride, setRegionOverride] = React.useState<string | undefined>(undefined);
  const [currencyOverride, setCurrencyOverride] = React.useState<string | undefined>(undefined);

  const {
    methods,
    loading,
    error,
    refetch,
    detectedCountry,
    detectedCurrency,
  } = usePaymentMethods(currencyOverride ?? currency, regionOverride ?? country);

  React.useEffect(() => {
    if (!regionOverride && detectedCountry) {
      setRegionOverride(detectedCountry);
    }
    if (!currencyOverride && detectedCurrency) {
      setCurrencyOverride(detectedCurrency);
    }
  }, [detectedCountry, detectedCurrency, regionOverride, currencyOverride]);

  const COUNTRY_CURRENCY_MAP: Record<string, string> = {
    DE: 'EUR',
    AT: 'EUR',
    CH: 'EUR',
    EU: 'EUR',
    GH: 'GHS',
    NG: 'NGN',
    KE: 'KES',
    UG: 'UGX',
    RW: 'RWF',
    ZA: 'ZAR',
  };

  const AFRICAN_REGIONS = [
    { code: 'GH', label: '🇬🇭 Ghana (MTN MoMo, Paystack)' },
    { code: 'NG', label: '🇳🇬 Nigeria (MTN MoMo, Paystack)' },
    { code: 'UG', label: '🇺🇬 Uganda (MTN MoMo)' },
    { code: 'RW', label: '🇷🇼 Ruanda (MTN MoMo)' },
    { code: 'KE', label: '🇰🇪 Kenia (M-Pesa, Airtel Money)' },
    { code: 'ZA', label: '🇿🇦 Südafrika (Instant EFT)' },
  ];

  const handleRegionChange = (newRegion?: string) => {
    setRegionOverride(newRegion);
    if (newRegion) {
      setCurrencyOverride(
        COUNTRY_CURRENCY_MAP[newRegion] ??
          currency ??
          detectedCurrency ??
          'USD',
      );
    } else {
      setCurrencyOverride(undefined);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-green"></div>
        <span className="ml-3 text-gray-600">Lade Zahlungsmethoden...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800 font-medium">Fehler beim Laden der Zahlungsmethoden</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={refetch}
        >
          Erneut versuchen
        </Button>
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Keine Zahlungsmethoden für Ihre Region verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Zahlungsmethode wählen
          </h3>
          <p className="text-sm text-gray-600">
            Wählen Sie Ihre bevorzugte Zahlungsmethode aus
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium uppercase text-gray-500">
            Region auswählen
          </label>
          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
            value={regionOverride ?? detectedCountry ?? ''}
            onChange={(event) =>
              handleRegionChange(event.target.value ? event.target.value : undefined)
            }
          >
            <option value="">
              Automatisch ({detectedCountry ?? 'unbekannt'})
            </option>
            <optgroup label="Afrika (Mobile Money)">
              {AFRICAN_REGIONS.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.label}
                </option>
              ))}
            </optgroup>
          </select>
          {regionOverride && (
            <button
              type="button"
              onClick={() => handleRegionChange(undefined)}
              className="text-xs text-brand-green underline text-left"
            >
              Automatische Erkennung wiederherstellen
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600">
          {regionOverride
            ? `Region festgelegt auf ${regionOverride}.`
            : 'Region wird automatisch anhand deiner Sprache/IP ausgewählt.'}
        </p>
      </div>

      <div className="space-y-3">
        {methods.map((method) => (
          <PaymentMethodCard
            key={method.id}
            method={method}
            selected={selectedMethod?.id === method.id}
            onSelect={onSelect}
            disabled={method.enabled === false}
          />
        ))}
      </div>

      {showContinueButton && selectedMethod && onContinue && (
        <div className="pt-4 border-t">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onContinue}
          >
            Weiter zur Zahlung
          </Button>
        </div>
      )}
    </div>
  );
}

