'use client';

import * as React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Elements,
  CardElement,
  PaymentRequestButtonElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  loadStripe,
  type StripeCardElementOptions,
  type StripeElementLocale,
  type StripeElementsOptions,
  type PaymentRequest as StripePaymentRequest,
  type PaymentRequestPaymentMethodEvent as StripePaymentRequestPaymentMethodEvent,
} from '@stripe/stripe-js';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import type { PaymentMethod } from '@/hooks/usePaymentMethods';
import { PaymentStatus, PaymentStatusType } from './PaymentStatus';
import { usePayment } from '@/hooks/usePayment';
import { Button } from '@/components/ui/Button';

// Stripe.js initialisieren
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

export interface CheckoutFormProps {
  amount: number;
  currency: string;
  subscriptionId?: string;
  userId?: string;
  description?: string;
  customerEmail?: string;
  customerName?: string;
  locale?: string;
  billingCycle?: 'monthly' | 'yearly';
}

export function CheckoutForm({
  amount,
  currency,
  subscriptionId,
  userId,
  description,
  customerEmail,
  customerName,
  locale = 'de',
  billingCycle = 'monthly',
}: CheckoutFormProps) {
  const [selectedMethod, setSelectedMethod] = React.useState<PaymentMethod | null>(null);
  const [paymentStatus, setPaymentStatus] = React.useState<PaymentStatusType>('pending');
  const [paymentResult, setPaymentResult] = React.useState<any>(null);
  const [stripeClientSecret, setStripeClientSecret] = React.useState<string | null>(null);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = React.useState(false);
  const [mobileMoneyPhone, setMobileMoneyPhone] = React.useState('');
  const [mobileMoneyPhoneError, setMobileMoneyPhoneError] = React.useState<string | null>(null);
  const [mobileMoneyReferenceId, setMobileMoneyReferenceId] = React.useState<string | null>(null);
  const [mobileMoneyStatus, setMobileMoneyStatus] = React.useState<'PENDING' | 'SUCCESSFUL' | 'FAILED' | null>(null);
  const [mobileMoneyPolling, setMobileMoneyPolling] = React.useState(false);
  const [mobileMoneyStatusMessage, setMobileMoneyStatusMessage] = React.useState<string | null>(null);
  const mobileMoneyPollTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { createPayment, loading: paymentLoading, error: usePaymentError } = usePayment();
  const tPayments = useTranslations('payments');
  const trustItems = (tPayments.raw('trust.items') as string[]) || [];
  const trustHeading = tPayments('trust.heading');
  const trustSubheading = tPayments('trust.subheading');
  const primaryTrustLogos = [
    { src: '/payment-logos/visa.svg', alt: 'Visa', width: 70, height: 28 },
    { src: '/payment-logos/mastercard.svg', alt: 'Mastercard', width: 70, height: 28 },
    { src: '/payment-logos/paypal.svg', alt: 'PayPal', width: 90, height: 28 },
    { src: '/payment-logos/stripe.svg', alt: 'Stripe', width: 70, height: 28 },
    { src: '/payment-logos/apple-pay.svg', alt: 'Apple Pay', width: 60, height: 28 },
    { src: '/payment-logos/google-pay.svg', alt: 'Google Pay', width: 70, height: 28 },
  ];

  // Redirect-Effect: Sobald Zahlung erfolgreich ist, sofort redirecten
  React.useEffect(() => {
    if (paymentStatus === 'success' && !isRedirecting) {
      console.log('[CheckoutForm] Payment successful, initiating redirect to dashboard...');
      setIsRedirecting(true);
      // Kurze Verzögerung für bessere UX (Zeit für Success-Message)
      const redirectPath = `/${locale}/dashboard?payment=success`;
      console.log('[CheckoutForm] Redirect path:', redirectPath);
      const timer = setTimeout(() => {
        console.log('[CheckoutForm] Executing redirect now...');
        try {
          window.location.href = redirectPath;
        } catch (error) {
          console.error('[CheckoutForm] Redirect error:', error);
          // Fallback: Versuche window.location.replace
          window.location.replace(redirectPath);
        }
      }, 1500); // Erhöht auf 1.5s für bessere UX
      return () => clearTimeout(timer);
    }
    return undefined; // Explicit return for all code paths
  }, [paymentStatus, isRedirecting, locale]);

  React.useEffect(() => {
    if (selectedMethod?.provider !== 'mtn-mobile-money') {
      return;
    }
    if (!mobileMoneyReferenceId || !mobileMoneyPolling) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 24; // ca. 2 Minuten bei 5s Intervall

    const pollStatus = async () => {
      if (cancelled) {
        return;
      }

      attempts += 1;

      try {
        const response = await fetch(
          `/api/payments/mtn/status?referenceId=${encodeURIComponent(mobileMoneyReferenceId)}`,
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Status request failed');
        }

        const status = (data.status || 'PENDING').toUpperCase() as
          | 'PENDING'
          | 'SUCCESSFUL'
          | 'FAILED';

        setMobileMoneyStatus(status);

        if (status === 'SUCCESSFUL') {
          setMobileMoneyStatusMessage('Zahlung erfolgreich bestätigt.');
          setPaymentStatus('success');
          setMobileMoneyPolling(false);
          return;
        }

        if (status === 'FAILED') {
          const reason =
            data.reason ||
            data.errorCode ||
            'MTN Mobile Money meldet einen Fehler. Bitte an den Support wenden.';
          setMobileMoneyStatusMessage(reason);
          setPaymentStatus('failed');
          setPaymentError(reason);
          setMobileMoneyPolling(false);
          return;
        }

        if (!cancelled) {
          if (attempts >= maxAttempts) {
            const timeoutMessage =
              'Keine Bestätigung von MTN Mobile Money erhalten. Bitte prüfen Sie die Zahlung auf Ihrem Gerät.';
            setMobileMoneyStatusMessage(timeoutMessage);
            setPaymentStatus('failed');
            setPaymentError(timeoutMessage);
            setMobileMoneyPolling(false);
            return;
          }

          mobileMoneyPollTimeout.current = setTimeout(pollStatus, 5000);
        }
      } catch (error: any) {
        console.error('[CheckoutForm] MTN status polling error:', error);

        if (!cancelled) {
          if (attempts >= maxAttempts) {
            const errorMessage =
              'Statusabfrage für MTN Mobile Money fehlgeschlagen. Bitte versuchen Sie es erneut.';
            setMobileMoneyStatusMessage(errorMessage);
            setPaymentStatus('failed');
            setPaymentError(errorMessage);
            setMobileMoneyPolling(false);
            return;
          }

          mobileMoneyPollTimeout.current = setTimeout(pollStatus, 7000);
        }
      }
    };

    pollStatus();

    return () => {
      cancelled = true;
      if (mobileMoneyPollTimeout.current) {
        clearTimeout(mobileMoneyPollTimeout.current);
        mobileMoneyPollTimeout.current = null;
      }
    };
  }, [
    selectedMethod?.provider,
    mobileMoneyReferenceId,
    mobileMoneyPolling,
  ]);

  const handleMethodSelect = (method: PaymentMethod) => {
    // Verhindere Änderung wenn Zahlung bereits erfolgreich war
    if (paymentStatus === 'success') {
      return;
    }
    setSelectedMethod(method);
    setPaymentStatus('pending');
    setPaymentResult(null);
    setStripeClientSecret(null);
    setPaymentError(null);
    setMobileMoneyPhone('');
    setMobileMoneyPhoneError(null);
    setMobileMoneyReferenceId(null);
    setMobileMoneyStatus(null);
    setMobileMoneyStatusMessage(null);
    setMobileMoneyPolling(false);
    if (mobileMoneyPollTimeout.current) {
      clearTimeout(mobileMoneyPollTimeout.current);
      mobileMoneyPollTimeout.current = null;
    }
  };

  const handleContinue = async () => {
    if (!selectedMethod) return;

    try {
      setPaymentStatus('processing');

      const origin = window.location.origin;
      const provider = (selectedMethod.provider || 'stripe') as
        | 'stripe'
        | 'paypal'
        | 'mollie'
        | 'klarna'
        | 'mtn-mobile-money';

      const payload: any = {
        provider,
        amount,
        currency,
        userId,
        subscriptionId,
        description: description || `Subscription Payment - ${selectedMethod.name}`,
        customerEmail,
        customerName,
        locale,
        billingCycle,
      };

      const defaultCancelUrl = `${origin}/${locale}/checkout?tier=${subscriptionId || 'starter'}&billing_cycle=${billingCycle}`;

      if (provider === 'mtn-mobile-money') {
        const sanitizedInput = mobileMoneyPhone.trim();
        const digitsOnly = sanitizedInput.replace(/[^\d]/g, '');

        if (!sanitizedInput || digitsOnly.length < 8) {
          const message =
            'Bitte geben Sie eine gültige MTN Mobile Money Nummer im internationalen Format ein (z. B. +233241234567).';
          setMobileMoneyPhoneError(message);
          setPaymentError(message);
          setPaymentStatus('pending');
          return;
        }

        setMobileMoneyPhoneError(null);
        setPaymentError(null);
        payload.phoneNumber = sanitizedInput;
      }

      switch (provider) {
        case 'stripe':
          payload.returnUrl = `${origin}/${locale}/checkout/success`;
          payload.cancelUrl = defaultCancelUrl;
          break;
        case 'paypal':
          payload.returnUrl = `${origin}/${locale}/checkout/paypal/success`;
          payload.cancelUrl = defaultCancelUrl;
          break;
        case 'mollie':
          payload.method = selectedMethod.providerMethod || selectedMethod.id;
          payload.redirectUrl = `${origin}/${locale}/checkout/success?provider=mollie`;
          payload.cancelUrl = defaultCancelUrl;
          payload.metadata = {
            subscriptionId: subscriptionId || '',
            userId: userId || '',
            providerMethod: payload.method,
          };
          break;
        case 'klarna':
          payload.purchaseCountry = selectedMethod.purchaseCountry || selectedMethod.supportedCountries[0] || 'DE';
          payload.merchantUrls = {
            success: `${origin}/${locale}/checkout/success?provider=klarna`,
            cancel: `${origin}/${locale}/checkout?provider=klarna&status=cancelled`,
            failure: `${origin}/${locale}/checkout?provider=klarna&status=failure`,
          };
          payload.orderLines = [
            {
              name: description || `WhatsApp Bot Builder - ${subscriptionId || 'Plan'}`,
              quantity: 1,
              unitPrice: amount,
            },
          ];
          payload.customer = {
            email: customerEmail,
            first_name: customerName?.split(' ')[0],
            last_name: customerName?.split(' ').slice(1).join(' ') || undefined,
          };
          break;
        case 'mtn-mobile-money':
          payload.description = description || 'WhatsApp Bot Builder – MTN Mobile Money';
          break;
        default:
          break;
      }

      const result = await createPayment(payload);

      if (!result) {
        setPaymentStatus('failed');
        return;
      }

      setPaymentResult(result);

      if (result.provider === 'stripe' && result.clientSecret) {
        // Validierung: clientSecret muss im Format "pi_xxx_secret_xxx" sein
        if (!result.clientSecret.match(/^pi_[a-zA-Z0-9]+_secret_[a-zA-Z0-9]+$/)) {
          console.error('[CheckoutForm] Invalid clientSecret format:', result.clientSecret);
          setPaymentStatus('failed');
          setPaymentError('Ungültiges Payment Secret Format. Bitte versuchen Sie es erneut.');
          return;
        }
        
        // Stripe Payment Intent wurde erstellt
        setStripeClientSecret(result.clientSecret);
        setPaymentStatus('pending');
        // Stripe Elements werden gerendert, User kann zahlen
      } else if (result.provider === 'paypal' && result.approveUrl) {
        // PayPal: Weiterleitung zur PayPal-Zahlung
        window.location.href = result.approveUrl;
      } else if (result.provider === 'mtn-mobile-money') {
        if (!result.referenceId) {
          console.error('[CheckoutForm] Missing MTN Mobile Money referenceId in response', result);
          setPaymentStatus('failed');
          setPaymentError('MTN Mobile Money konnte nicht gestartet werden. Bitte versuchen Sie es erneut.');
          return;
        }

        setMobileMoneyReferenceId(result.referenceId);
        setMobileMoneyStatus('PENDING');
        setMobileMoneyStatusMessage(
          'Bitte bestätige die Zahlungsanfrage in deiner MTN Mobile Money App oder per *170#.',
        );
        setMobileMoneyPolling(true);
        setPaymentStatus('processing');
        setPaymentError(null);
      } else if (result.provider === 'mollie' && result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else if (result.provider === 'klarna' && result.clientToken) {
        // Klarna-Integration kommt in separatem Schritt
        console.warn('[CheckoutForm] Klarna session created – UI integration pending.', result);
        setPaymentStatus('failed');
        setPaymentError('Klarna Integration befindet sich noch im Aufbau. Bitte wählen Sie eine andere Zahlungsmethode.');
      } else {
        setPaymentStatus('success');
        // Redirect to success page after payment
        setTimeout(() => {
          window.location.href = `/${locale}/dashboard?payment=success`;
        }, 2000);
      }
    } catch (error: any) {
      console.error('[CheckoutForm] Error:', error);
      setPaymentStatus('failed');
      setPaymentError(error.message || 'Fehler beim Erstellen der Zahlung. Bitte versuchen Sie es erneut.');
    }
  };

  const handleStripePaymentSuccess = React.useCallback(() => {
    // Verhindere mehrfaches Aufrufen
    if (paymentStatus === 'success' || isRedirecting) {
      console.log('[CheckoutForm] handleStripePaymentSuccess already called, ignoring');
      return;
    }
    console.log('[CheckoutForm] Payment succeeded, setting status to success');
    setPaymentStatus('success');
    setPaymentError(null); // Fehler zurücksetzen
    // Redirect wird durch useEffect gehandhabt
    // Zusätzlich: Direkter Redirect als Fallback nach 3 Sekunden, falls useEffect nicht greift
    const fallbackTimer = setTimeout(() => {
      console.log('[CheckoutForm] Fallback redirect after 3 seconds - useEffect may not have fired');
      const redirectPath = `/${locale}/dashboard?payment=success`;
      try {
        window.location.href = redirectPath;
      } catch (error) {
        console.error('[CheckoutForm] Fallback redirect error:', error);
        window.location.replace(redirectPath);
      }
    }, 3000);
    // Cleanup wird nicht benötigt, da wir redirecten
  }, [paymentStatus, isRedirecting, locale]);
  
  const handleStripePaymentError = React.useCallback((errorMessage?: string) => {
    // Verhindere mehrfaches Aufrufen
    if (paymentStatus === 'success') {
      return;
    }
    console.log('[CheckoutForm] Payment failed:', errorMessage);
    setPaymentStatus('failed');
    if (errorMessage) {
      setPaymentError(errorMessage);
    }
  }, [paymentStatus]);

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Order Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Bestellübersicht
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">{description || 'Abonnement'}</span>
            <span className="font-semibold text-gray-900">
              {formatPrice(amount, currency)}
            </span>
          </div>
          {selectedMethod && (
            <div className="flex justify-between text-sm text-gray-500 pt-3 border-t">
              <span>Zahlungsmethode Gebühren</span>
              <span>
                {formatPrice(
                  (amount * selectedMethod.fees.percentage) / 100 + selectedMethod.fees.fixed,
                  currency
                )}
              </span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold pt-3 border-t">
            <span>Gesamt</span>
            <span className="text-brand-green">
              {formatPrice(amount, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Success State - wird angezeigt während Redirect */}
      {paymentStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-green-800 font-medium text-lg">Zahlung erfolgreich</p>
          <p className="text-green-600 text-sm mt-2">Sie werden zum Dashboard weitergeleitet...</p>
          {isRedirecting && (
            <p className="text-green-500 text-xs mt-2">Weiterleitung läuft...</p>
          )}
          {!isRedirecting && (
            <div className="mt-4">
              <Button
                variant="primary"
                onClick={() => {
                  window.location.href = `/${locale}/dashboard?payment=success`;
                }}
              >
                Zum Dashboard
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Payment Method Selection - nur wenn nicht erfolgreich und nicht processing */}
      {!stripeClientSecret && paymentStatus !== 'success' && paymentStatus !== 'processing' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <PaymentMethodSelector
            currency={currency}
            selectedMethod={selectedMethod}
            onSelect={handleMethodSelect}
            onContinue={handleContinue}
            showContinueButton={true}
          />
        </div>
      )}

      {selectedMethod?.provider === 'mtn-mobile-money' &&
        paymentStatus !== 'processing' &&
        paymentStatus !== 'success' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                MTN Mobile Money verknüpfen
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Bitte gib die Mobilfunknummer ein, die für MTN Mobile Money registriert ist. Verwende das internationale Format (z.&nbsp;B. +233241234567).
              </p>
            </div>
            <div>
              <label
                htmlFor="mtn-mobile-money-phone"
                className="block text-sm font-medium text-gray-700"
              >
                MTN Mobile Money Nummer
              </label>
              <input
                id="mtn-mobile-money-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+233241234567"
                className={`mt-1 block w-full rounded-md border ${
                  mobileMoneyPhoneError ? 'border-red-400' : 'border-gray-300'
                } bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green sm:text-sm`}
                value={mobileMoneyPhone}
                onChange={(event) => {
                  setMobileMoneyPhone(event.target.value);
                  setMobileMoneyPhoneError(null);
                  setPaymentError(null);
                }}
              />
              {mobileMoneyPhoneError && (
                <p className="mt-2 text-sm text-red-600">
                  {mobileMoneyPhoneError}
                </p>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
              <p className="font-medium">So funktioniert es:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Zahlung starten mit „Weiter zur Zahlung“.</li>
                <li>Bestätige die Zahlungsanfrage in der MTN-App oder per *170#.</li>
                <li>Wir prüfen den Status automatisch und leiten dich weiter.</li>
              </ol>
            </div>
          </div>
        )}

      {/* Trust Banner */}
      {paymentStatus !== 'success' && (
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-gray-100 rounded-xl border border-gray-700 shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">{trustHeading}</p>
              <h3 className="text-xl font-semibold text-white mt-1">{trustSubheading}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
              {primaryTrustLogos.map((logo) => (
                <span
                  key={logo.alt}
                  className="inline-flex items-center justify-center rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20"
                  aria-label={logo.alt}
                >
                  <Image src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} />
                </span>
              ))}
            </div>
          </div>
          <ul className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-200">
            {trustItems.map((item, index) => (
              <li key={`${item}-${index}`} className="flex items-start gap-2">
                <span aria-hidden className="mt-1 h-2 w-2 rounded-full bg-emerald-300 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Loading State während Zahlung verarbeitet wird */}
      {paymentStatus === 'processing' &&
        selectedMethod?.provider === 'mtn-mobile-money' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <PaymentStatus
              status="processing"
              message={
                mobileMoneyStatusMessage ||
                'Bitte bestätige die MTN Mobile Money Zahlungsanfrage auf deinem Telefon.'
              }
            />
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <span className="font-medium text-gray-800">Aktueller Status:</span>{' '}
                {mobileMoneyStatus === 'SUCCESSFUL'
                  ? 'Bestätigt'
                  : mobileMoneyStatus === 'FAILED'
                    ? 'Fehlgeschlagen'
                    : 'Warte auf Bestätigung'}
              </p>
              {mobileMoneyReferenceId && (
                <p className="break-all">
                  <span className="font-medium text-gray-800">Referenz-ID:</span>{' '}
                  {mobileMoneyReferenceId}
                </p>
              )}
              <p>
                Falls keine Push-Benachrichtigung erscheint, öffne die MTN Mobile Money App
                oder wähle <code>*170#</code>, um die Zahlung manuell zu bestätigen.
              </p>
            </div>
          </div>
        )}

      {paymentStatus === 'processing' &&
        selectedMethod?.provider !== 'mtn-mobile-money' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-gray-600">Zahlung wird verarbeitet...</p>
        </div>
      )}

      {/* Stripe Payment Elements - nur wenn nicht erfolgreich und nicht fehlgeschlagen */}
      {stripeClientSecret &&
        paymentStatus === 'pending' && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <Elements
              stripe={stripePromise}
              options={buildElementsOptions(locale)}
            >
              <StripeCardPayment
                clientSecret={stripeClientSecret}
                locale={locale}
                customerEmail={customerEmail}
                customerName={customerName}
                amount={amount}
                currency={currency}
                description={description || `WhatsApp Bot Builder - ${subscriptionId || 'Plan'}`}
                country={selectedMethod?.purchaseCountry || selectedMethod?.supportedCountries?.[0] || 'DE'}
                selectedMethodId={selectedMethod?.id}
                onSuccess={handleStripePaymentSuccess}
                onError={handleStripePaymentError}
              />
            </Elements>
          </div>
        )}

      {/* Payment Status - bei Fehlern anzeigen */}
      {paymentStatus === 'failed' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <PaymentStatus
            status={paymentStatus}
            message={paymentError || usePaymentError || 'Ihre Zahlung konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut.'}
            onRetry={() => {
              setPaymentStatus('pending');
              setPaymentResult(null);
              setStripeClientSecret(null);
              setPaymentError(null);
              setSelectedMethod(null); // Reset Payment Method Selection
              setMobileMoneyPhone('');
              setMobileMoneyPhoneError(null);
              setMobileMoneyReferenceId(null);
              setMobileMoneyStatus(null);
              setMobileMoneyStatusMessage(null);
              setMobileMoneyPolling(false);
              if (mobileMoneyPollTimeout.current) {
                clearTimeout(mobileMoneyPollTimeout.current);
                mobileMoneyPollTimeout.current = null;
              }
              // Payment Method Selection wird wieder angezeigt
            }}
            onContinue={() => {
              window.location.href = `/${locale}/dashboard?payment=success`;
            }}
          />
        </div>
      )}

      {/* Cancel Button - nur wenn nicht erfolgreich */}
      {paymentStatus !== 'success' && paymentStatus !== 'processing' && (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => {
              window.location.href = `/${locale}/pricing`;
            }}
            disabled={paymentLoading || isRedirecting}
          >
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  );
}

// Stripe Card Element (Legacy) Component – kompatibel mit älteren Stripe API-Versionen
interface StripeCardPaymentProps {
  clientSecret: string;
  locale?: string;
  customerEmail?: string;
  customerName?: string;
  amount: number;
  currency: string;
  description?: string;
  country?: string | null;
  selectedMethodId?: string | null;
  onSuccess: () => void;
  onError: (errorMessage?: string) => void;
}

function StripeCardPayment({
  clientSecret,
  locale = 'de',
  customerEmail,
  customerName,
  amount,
  currency,
  description,
  country,
  selectedMethodId,
  onSuccess,
  onError,
}: StripeCardPaymentProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = React.useState<StripePaymentRequest | null>(null);
  const [showPaymentRequestButton, setShowPaymentRequestButton] = React.useState(false);
  const paymentRequestEligibleMethods = React.useMemo(
    () => new Set(['apple-pay', 'google-pay']),
    []
  );
  const isPaymentRequestMethod =
    !!selectedMethodId && paymentRequestEligibleMethods.has(selectedMethodId);
  const paymentRequestLabel =
    selectedMethodId === 'google-pay' ? 'Google Pay' : 'Apple Pay';

  React.useEffect(() => {
    if (!stripe || !clientSecret || !isPaymentRequestMethod) {
      setPaymentRequest(null);
      setShowPaymentRequestButton(false);
      return;
    }

    let mounted = true;
    const normalizedCurrency = (currency || 'EUR').toLowerCase();
    const normalizedCountry = (country || 'DE').toUpperCase();
    const totalLabel =
      description?.trim() ||
      `WhatsApp Bot Builder (${normalizedCurrency.toUpperCase()})`;

    const request = stripe.paymentRequest({
      country: normalizedCountry,
      currency: normalizedCurrency,
      total: {
        label: totalLabel,
        amount: Math.round(amount * 100),
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: false,
    });

    request.canMakePayment().then((result) => {
      if (!mounted) return;
      const canUseApplePay = Boolean(result?.applePay);
      const canUseGooglePay = Boolean(
        (result as Record<string, unknown>)?.googlePay ||
        (result as Record<string, unknown>)?.paymentMethodType === 'card'
      );

      if (
        (selectedMethodId === 'apple-pay' && canUseApplePay) ||
        (selectedMethodId === 'google-pay' && canUseGooglePay)
      ) {
        setPaymentRequest(request);
        setShowPaymentRequestButton(true);
      } else {
        setPaymentRequest(null);
        setShowPaymentRequestButton(false);
      }
    });

    const handlePaymentMethod = async (
      event: StripePaymentRequestPaymentMethodEvent,
    ) => {
      if (!stripe) {
        event.complete('fail');
        const msg = 'Stripe wurde nicht initialisiert.';
        setErrorMessage(msg);
        onError(msg);
        return;
      }

      setIsProcessing(true);
      setErrorMessage(null);

      try {
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: event.paymentMethod.id,
            // billing_details wird bereits in der Payment Method gespeichert
          },
          {
            handleActions: false,
          }
        );

        if (error) {
          event.complete('fail');
          const message =
            error.message || 'Apple Pay konnte nicht verarbeitet werden.';
          setErrorMessage(message);
          onError(message);
          setIsProcessing(false);
          return;
        }

        if (paymentIntent?.status === 'requires_action') {
          const { error: confirmError, paymentIntent: confirmedIntent } =
            await stripe.confirmCardPayment(clientSecret);
          if (confirmError) {
            event.complete('fail');
            const message =
              confirmError.message ||
              'Authentifizierung für Apple Pay erforderlich.';
            setErrorMessage(message);
            onError(message);
            setIsProcessing(false);
            return;
          }

          if (confirmedIntent?.status !== 'succeeded') {
            event.complete('success');
            onSuccess();
            setIsProcessing(false);
            return;
          }
        }

        event.complete('success');
        onSuccess();
        setIsProcessing(false);
      } catch (err: any) {
        event.complete('fail');
        const message =
          err?.message || 'Apple Pay konnte nicht abgeschlossen werden.';
        setErrorMessage(message);
        onError(message);
        setIsProcessing(false);
      }
    };

    request.on('paymentmethod', handlePaymentMethod);

    return () => {
      mounted = false;
      request.off('paymentmethod', handlePaymentMethod);
    };
  }, [
    stripe,
    clientSecret,
    selectedMethodId,
    currency,
    country,
    amount,
    description,
    customerEmail,
    customerName,
    onSuccess,
    onError,
    isPaymentRequestMethod,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Validierung: clientSecret Format prüfen
      if (
        !clientSecret ||
        !clientSecret.match(/^pi_[a-zA-Z0-9]+_secret_[a-zA-Z0-9]+$/)
      ) {
        throw new Error(
          'Ungültiges Payment Secret Format. Bitte versuchen Sie es erneut.'
        );
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error(
          'Karteneingabe konnte nicht initialisiert werden. Bitte laden Sie die Seite neu.'
        );
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: customerEmail || undefined,
              name: customerName || undefined,
            },
          },
          return_url: `${window.location.origin}/${locale}/dashboard?payment=success`,
        },
        {
          handleActions: true,
        }
      );

      if (error) {
        // Extrahiere Fehlerdetails aus Error-Objekt und Payment Intent (falls vorhanden)
        const declineCode = (error as any).decline_code || (paymentIntent as any)?.last_payment_error?.decline_code;
        const errorMessage = error.message || (paymentIntent as any)?.last_payment_error?.message;
        const errorCode = error.code || (paymentIntent as any)?.last_payment_error?.code;
        
        console.error('[Stripe Payment] Error Details:', {
          type: error.type,
          code: error.code,
          errorCode,
          message: error.message,
          errorMessage,
          decline_code: declineCode,
          paymentIntentStatus: (paymentIntent as any)?.status,
          lastPaymentError: (paymentIntent as any)?.last_payment_error,
          fullError: error,
        });
        
        // Detaillierte Fehlermeldung basierend auf Fehlertyp und Code
        let errorMsg = errorMessage || error.message || 'Zahlung fehlgeschlagen';
        
        // Spezifische Fehlermeldungen basierend auf Stripe Error Codes und Decline Codes
        if (error.type === 'card_error') {
          // Prüfe decline_code für spezifischere Fehlermeldungen
          // decline_code hat Priorität vor error.code
          
          // Spezifische Fehlerbehandlung basierend auf decline_code
          if (declineCode === 'insufficient_funds') {
            errorMsg = 'Nicht genügend Guthaben auf der Karte. Bitte verwenden Sie eine andere Karte oder kontaktieren Sie Ihre Bank.';
          } else if (declineCode === 'generic_decline' || error.code === 'card_declined') {
            // Prüfe ob die Message spezifischer ist
            const msgLower = errorMsg.toLowerCase();
            if (msgLower.includes('insufficient funds')) {
              errorMsg = 'Nicht genügend Guthaben auf der Karte. Bitte verwenden Sie eine andere Karte oder kontaktieren Sie Ihre Bank.';
            } else if (msgLower.includes('card was declined') || msgLower.includes('card declined')) {
              errorMsg = 'Ihre Karte wurde abgelehnt. Bitte verwenden Sie eine andere Karte oder kontaktieren Sie Ihre Bank.';
            } else {
              errorMsg = 'Ihre Karte wurde abgelehnt. Bitte verwenden Sie eine andere Karte oder kontaktieren Sie Ihre Bank.';
            }
          } else if (declineCode === 'lost_card' || errorCode === 'lost_card') {
            errorMsg = 'Die Karte wurde als verloren gemeldet. Bitte kontaktieren Sie Ihre Bank.';
          } else if (declineCode === 'stolen_card' || errorCode === 'stolen_card') {
            errorMsg = 'Die Karte wurde als gestohlen gemeldet. Bitte kontaktieren Sie Ihre Bank.';
          } else if (declineCode === 'expired_card' || errorCode === 'expired_card') {
            errorMsg = 'Ihre Karte ist abgelaufen. Bitte verwenden Sie eine andere Karte.';
          } else if (declineCode === 'incorrect_cvc' || errorCode === 'incorrect_cvc') {
            errorMsg = 'Der CVC-Code ist falsch. Bitte überprüfen Sie Ihre Kartendaten.';
          } else if (declineCode === 'incorrect_number' || errorCode === 'incorrect_number') {
            errorMsg = 'Die Kartennummer ist falsch. Bitte überprüfen Sie Ihre Kartendaten.';
          } else if (declineCode === 'processing_error' || errorCode === 'processing_error') {
            errorMsg = 'Ein Fehler ist bei der Verarbeitung Ihrer Zahlung aufgetreten. Bitte versuchen Sie es erneut.';
          } else if (declineCode === 'pickup_card') {
            errorMsg = 'Die Karte wurde zur Abholung markiert. Bitte kontaktieren Sie Ihre Bank.';
          } else if (declineCode === 'restricted_card') {
            errorMsg = 'Die Karte ist eingeschränkt. Bitte kontaktieren Sie Ihre Bank.';
          } else if (declineCode === 'security_violation') {
            errorMsg = 'Sicherheitsverletzung erkannt. Bitte kontaktieren Sie Ihre Bank.';
          } else if (declineCode === 'service_not_allowed') {
            errorMsg = 'Dieser Service ist für diese Karte nicht erlaubt. Bitte verwenden Sie eine andere Karte.';
          } else if (declineCode === 'stop_payment_order') {
            errorMsg = 'Die Zahlung wurde durch den Karteninhaber gestoppt.';
          } else if (declineCode === 'testmode_decline') {
            errorMsg = 'Diese Test-Karte wurde abgelehnt. Bitte verwenden Sie eine andere Test-Karte.';
          } else if (declineCode === 'withdrawal_count_limit_exceeded') {
            errorMsg = 'Das Abhebungslimit wurde überschritten. Bitte versuchen Sie es später erneut.';
          } else if (declineCode === 'do_not_honor') {
            errorMsg = 'Die Karte wurde nicht akzeptiert. Bitte kontaktieren Sie Ihre Bank.';
          } else if (declineCode === 'invalid_account') {
            errorMsg = 'Ungültiges Kartenkonto. Bitte verwenden Sie eine andere Karte.';
          } else if (declineCode === 'invalid_amount') {
            errorMsg = 'Ungültiger Betrag. Bitte versuchen Sie es mit einem anderen Betrag.';
          } else if (declineCode === 'invalid_cvc') {
            errorMsg = 'Der CVC-Code ist ungültig. Bitte überprüfen Sie Ihre Kartendaten.';
          } else if (declineCode === 'invalid_expiry_month' || declineCode === 'invalid_expiry_year') {
            errorMsg = 'Das Ablaufdatum ist ungültig. Bitte überprüfen Sie Ihre Kartendaten.';
          } else if (declineCode === 'invalid_number') {
            errorMsg = 'Die Kartennummer ist ungültig. Bitte überprüfen Sie Ihre Kartendaten.';
          } else {
            // Fallback: Prüfe ob die Message spezifische Informationen enthält
            const msgLower = errorMsg.toLowerCase();
            if (msgLower.includes('insufficient funds') || msgLower.includes('unzureichende mittel')) {
              errorMsg = 'Nicht genügend Guthaben auf der Karte. Bitte verwenden Sie eine andere Karte oder kontaktieren Sie Ihre Bank.';
            } else if (msgLower.includes('declined') || msgLower.includes('abgelehnt')) {
              errorMsg = 'Ihre Karte wurde abgelehnt. Bitte verwenden Sie eine andere Karte oder kontaktieren Sie Ihre Bank.';
            } else if (!errorMsg || errorMsg === 'Zahlung fehlgeschlagen') {
              errorMsg = 'Ihre Karte wurde abgelehnt. Bitte überprüfen Sie Ihre Kartendaten oder verwenden Sie eine andere Karte.';
            }
            // Wenn errorMsg bereits spezifisch ist (z.B. von Stripe), behalten wir sie
          }
        } else if (error.type === 'validation_error') {
          errorMsg = error.message || 'Ungültige Kartendaten. Bitte überprüfen Sie Ihre Eingaben.';
        } else if (error.type === 'rate_limit_error') {
          errorMsg = 'Zu viele Anfragen. Bitte versuchen Sie es in einem Moment erneut.';
        } else if (error.type === 'invalid_request_error') {
          errorMsg = 'Ungültige Anfrage. Bitte versuchen Sie es erneut.';
        } else if (error.code === 'payment_intent_unexpected_state') {
          errorMsg = 'Der Zahlungsvorgang wurde bereits verarbeitet. Bitte laden Sie die Seite neu.';
        } else if (error.code === 'authentication_required') {
          errorMsg = 'Zusätzliche Authentifizierung erforderlich. Bitte folgen Sie den Anweisungen Ihrer Bank.';
        }
        
        console.log('[Stripe Payment] Final Error Message:', errorMsg);
        setErrorMessage(errorMsg);
        setIsProcessing(false);
        // Fehlermeldung an Parent weitergeben
        onError(errorMsg);
      } else if (paymentIntent) {
        console.log('[Stripe Payment] Payment Intent Status:', paymentIntent.status);
        
        if (paymentIntent.status === 'succeeded') {
          console.log('[Stripe Payment] Payment succeeded, calling onSuccess');
          setIsProcessing(false);
          // onSuccess wird aufgerufen, was den Status auf 'success' setzt
          // Der Redirect wird durch useEffect in CheckoutForm gehandhabt
          onSuccess();
          // Zusätzlich: Direkter Redirect nach kurzer Verzögerung als Fallback
          setTimeout(() => {
            console.log('[Stripe Payment] Fallback redirect to dashboard');
            window.location.href = `/${locale}/dashboard?payment=success`;
          }, 2500);
        } else if (paymentIntent.status === 'requires_action') {
          // 3D Secure oder andere Aktionen erforderlich
          setErrorMessage('Zusätzliche Authentifizierung erforderlich. Bitte folgen Sie den Anweisungen.');
          setIsProcessing(false);
        } else if (paymentIntent.status === 'processing') {
          setErrorMessage('Ihre Zahlung wird verarbeitet. Bitte warten Sie einen Moment.');
          // Nach kurzer Zeit prüfen
          setTimeout(() => {
            window.location.href = `/${locale}/dashboard?payment=processing`;
          }, 2000);
        } else if (paymentIntent.status === 'requires_payment_method') {
          const errorMsg = 'Die Zahlung konnte nicht verarbeitet werden. Bitte versuchen Sie es mit einer anderen Zahlungsmethode.';
          setErrorMessage(errorMsg);
          setIsProcessing(false);
          onError(errorMsg);
        } else if (paymentIntent.status === 'canceled') {
          const errorMsg = 'Die Zahlung wurde abgebrochen. Bitte versuchen Sie es erneut.';
          setErrorMessage(errorMsg);
          setIsProcessing(false);
          onError(errorMsg);
        } else {
          const errorMsg = `Zahlungsstatus: ${paymentIntent.status}. Bitte versuchen Sie es erneut.`;
          setErrorMessage(errorMsg);
          setIsProcessing(false);
          onError(errorMsg);
        }
      }
    } catch (err: any) {
      console.error('[Stripe Payment] Exception:', err);
      let errorMsg = 'Ein unerwarteter Fehler ist aufgetreten';
      
      if (err.message) {
        errorMsg = err.message;
      } else if (err.type === 'StripeCardError') {
        errorMsg = 'Ihre Karte wurde abgelehnt. Bitte überprüfen Sie Ihre Kartendaten.';
      } else if (err.statusCode === 402) {
        errorMsg = 'Die Zahlung konnte nicht verarbeitet werden. Bitte überprüfen Sie Ihre Kartendaten oder versuchen Sie eine andere Karte.';
      }
      
      setErrorMessage(errorMsg);
      onError(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {showPaymentRequestButton && paymentRequest && (
          <div className="space-y-2">
            <PaymentRequestButtonElement
              options={{
                paymentRequest,
                style: {
                  paymentRequestButton: {
                    type: selectedMethodId === 'google-pay' ? 'buy' : 'buy',
                    theme:
                      selectedMethodId === 'google-pay' ? 'light' : 'dark',
                    height: '44px',
                  },
                },
              }}
            />
            <p className="text-xs text-gray-500 leading-relaxed">
              Bezahlen Sie in Sekunden mit {paymentRequestLabel}. Keine Eingabe von Kartendaten nötig.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-gray-200 p-4">
          <CardElement options={cardElementOptions} />
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Ihre Kartendaten werden sicher über Stripe verarbeitet. Wir speichern
          keine vollständigen Kartennummern auf unseren Servern.
        </p>
      </div>
      
      {errorMessage && (
        <div className="text-red-600 text-sm mt-2">
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={!stripe || isProcessing}
        className="w-full mt-4"
      >
        {isProcessing
          ? 'Wird verarbeitet...'
          : isPaymentRequestMethod
            ? `Mit ${paymentRequestLabel} zahlen`
            : 'Jetzt zahlen'}
      </Button>
    </form>
  );
}

const cardElementOptions: StripeCardElementOptions = {
  hidePostalCode: false,
  style: {
    base: {
      color: '#111827',
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '16px',
      fontSmoothing: 'antialiased',
      '::placeholder': {
        color: '#9CA3AF',
      },
    },
    invalid: {
      color: '#DC2626',
      iconColor: '#DC2626',
    },
    complete: {
      color: '#047857',
    },
  },
};

function buildElementsOptions(locale?: string): StripeElementsOptions {
  const supportedLocales: Record<string, StripeElementLocale> = {
    de: 'de',
    en: 'en',
    fr: 'fr',
    es: 'es',
    it: 'it',
    nl: 'nl',
    sv: 'sv',
    pt: 'pt',
    pl: 'pl',
  };

  const normalizedLocale = locale?.toLowerCase() ?? 'de';

  return {
    locale: supportedLocales[normalizedLocale] ?? 'auto',
  };
}

