'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface PayPalSuccessPageProps {
  params: Promise<{ locale: string }>;
}

export default function PayPalSuccessPage({ params }: PayPalSuccessPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locale, setLocale] = React.useState<string>('de');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    // Params als Promise in Next.js 15
    params.then(({ locale: loc }) => {
      setLocale(loc);
    });
  }, [params]);
  
  React.useEffect(() => {
    const capturePayment = async () => {
      try {
        const token = searchParams.get('token');
        const payerId = searchParams.get('PayerID');
        
        if (!token) {
          throw new Error('PayPal token not found in URL');
        }
        
        // PayPal Order capture über API
        const response = await fetch('/api/payments/paypal/capture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: token,
            payerId,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to capture PayPal payment');
        }
        
        // Erfolgreich - Weiterleitung zum Dashboard
        setLoading(false);
        setTimeout(() => {
          router.push(`/${locale}/dashboard?payment=success&provider=paypal`);
        }, 2000);
      } catch (err: any) {
        console.error('[PayPal Success] Error:', err);
        setError(err.message || 'Fehler beim Verarbeiten der PayPal-Zahlung');
        setLoading(false);
      }
    };
    
    if (locale && searchParams) {
      capturePayment();
    }
  }, [locale, searchParams, router]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Zahlung wird verarbeitet...
          </h2>
          <p className="text-gray-600">
            Bitte warten Sie, während wir Ihre PayPal-Zahlung bestätigen.
          </p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Zahlung fehlgeschlagen
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            variant="primary"
            onClick={() => router.push(`/${locale}/pricing`)}
          >
            Zurück zur Preisübersicht
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-4">
          <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Zahlung erfolgreich
        </h2>
        <p className="text-gray-600 mb-6">
          Sie werden zum Dashboard weitergeleitet...
        </p>
      </div>
    </div>
  );
}

