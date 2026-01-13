'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { PaymentMethod } from '@/hooks/usePaymentMethods';
import { cn } from '@/lib/utils';

export interface PaymentMethodCardProps {
  method: PaymentMethod;
  selected: boolean;
  onSelect: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export function PaymentMethodCard({
  method,
  selected,
  onSelect,
  disabled = false,
}: PaymentMethodCardProps) {
  const t = useTranslations('payments');
  const isDisabled = disabled || method.enabled === false;
  const accentColor = method.brandColor || '#16a34a';
  const baseBorderColor = isDisabled
    ? '#e5e7eb'
    : selected
      ? accentColor
      : '#e5e7eb';
  const backgroundColor = selected && !isDisabled ? `${accentColor}14` : '#ffffff';

  return (
    <button
      type="button"
      onClick={() => !isDisabled && onSelect(method)}
      disabled={isDisabled}
      className={cn(
        'w-full p-4 border-2 rounded-lg transition-all text-left',
        'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2',
        isDisabled && 'opacity-50 cursor-not-allowed'
      )}
      style={{
        borderColor: baseBorderColor,
        backgroundColor,
        boxShadow: selected && !isDisabled ? `0 0 0 1px ${accentColor}33` : undefined,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{method.name}</h3>
              {method.requiresSetup && (
                <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                  Setup erforderlich
                </span>
              )}
              {method.enabled === false && (
                <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-100 rounded">
                  {t('badges.comingSoon')}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {method.processingTime === 'instant' ? 'Sofortige Zahlung' : `Verarbeitung: ${method.processingTime}`}
            </p>
            <div className="mt-2 text-xs text-gray-500">
              Gebühren: {method.fees.percentage}% + {method.fees.fixed} {method.fees.currency}
            </div>
            {method.logos && method.logos.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {method.logos.map((logo) => (
                  <span
                    key={logo}
                    className="inline-flex items-center justify-center rounded-full bg-white px-2 py-1 ring-1 ring-gray-200 shadow-sm"
                  >
                    <Image src={logo} alt={`${method.name} Logo`} width={64} height={20} />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center',
          selected && !isDisabled ? '' : 'border-gray-300'
        )}
        style={{
          borderColor: selected && !isDisabled ? accentColor : undefined,
          backgroundColor: selected && !isDisabled ? accentColor : undefined,
        }}
      >
          {selected && (
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

