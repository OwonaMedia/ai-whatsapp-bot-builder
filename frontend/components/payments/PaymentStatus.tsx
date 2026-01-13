'use client';

import * as React from 'react';
import { Button } from '@/components/ui/Button';

export type PaymentStatusType = 'pending' | 'processing' | 'success' | 'failed' | 'canceled';

export interface PaymentStatusProps {
  status: PaymentStatusType;
  message?: string;
  onRetry?: () => void;
  onContinue?: () => void;
}

export function PaymentStatus({
  status,
  message,
  onRetry,
  onContinue,
}: PaymentStatusProps) {
  const statusConfig = {
    pending: {
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-200 bg-white">
          <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
        </div>
      ),
      title: 'Zahlung ausstehend',
      message: message || 'Bitte schließen Sie die Zahlung ab.',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
    },
    processing: {
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-yellow-200 bg-white">
          <div className="h-8 w-8 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
        </div>
      ),
      title: 'Zahlung wird verarbeitet',
      message: message || 'Bitte warten Sie, während wir Ihre Zahlung verarbeiten.',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
    },
    success: {
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-green-200 bg-green-50">
          <svg
            className="h-6 w-6 text-green-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ),
      title: 'Zahlung erfolgreich',
      message: message || 'Ihre Zahlung wurde erfolgreich verarbeitet.',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
    },
    failed: {
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-200 bg-red-50">
          <svg
            className="h-6 w-6 text-red-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      ),
      title: 'Zahlung fehlgeschlagen',
      message: message || 'Ihre Zahlung konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
    },
    canceled: {
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-50">
          <svg
            className="h-6 w-6 text-gray-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
      ),
      title: 'Zahlung abgebrochen',
      message: message || 'Die Zahlung wurde abgebrochen.',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-800',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`p-6 border-2 rounded-lg ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-start gap-4">
        <div>{config.icon}</div>
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${config.textColor} mb-2`}>
            {config.title}
          </h3>
          <p className={`${config.textColor} mb-4`}>
            {config.message}
          </p>
          {status === 'processing' && (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              <span className={`text-sm ${config.textColor}`}>Verarbeitung...</span>
            </div>
          )}
          {status === 'failed' && onRetry && (
            <Button
              variant="primary"
              onClick={onRetry}
              className="mt-2"
            >
              Erneut versuchen
            </Button>
          )}
          {status === 'success' && onContinue && (
            <Button
              variant="primary"
              onClick={onContinue}
              className="mt-2"
            >
              Weiter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

