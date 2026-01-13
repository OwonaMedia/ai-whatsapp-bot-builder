'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { sanitizeInput, validateEmail } from '@/lib/security';
import { getErrorMessage } from '@/lib/utils';

export default function VerifyOTPPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const t = useTranslations();
  const tCommon = useTranslations('common');

  // URL-Parameter
  const tokenHash = searchParams.get('token_hash');
  const code = searchParams.get('code');
  const emailFromUrl = searchParams.get('email');

  // State
  const [email, setEmail] = useState(emailFromUrl || '');
  const [otpCode, setOtpCode] = useState(code || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoVerifying, setIsAutoVerifying] = useState(false);
  const [isEmailEditable, setIsEmailEditable] = useState(!emailFromUrl);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  // Auto-Verifikation bei Page-Load (wenn token/token_hash vorhanden)
  useEffect(() => {
    const autoVerify = async () => {
      if (isVerified || isAutoVerifying) return;

      // PKCE Flow (Magic Link)
      if (tokenHash && emailFromUrl) {
        setIsAutoVerifying(true);
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'magiclink',
          });

          if (error) {
            console.error('[VerifyOTP] Auto-verify error:', error);
            // Nicht als Fehler anzeigen, da manuelle Eingabe möglich ist
            setIsAutoVerifying(false);
            return;
          }

          if (data?.session) {
            setIsVerified(true);
            addToast({
              type: 'success',
              title: t('auth.otpVerified') || 'OTP verifiziert',
              message: t('auth.redirectingToReset') || 'Sie werden weitergeleitet...',
            });
            setTimeout(() => {
              router.push(`/${locale}/auth/reset-password`);
            }, 1000);
          }
        } catch (error: unknown) {
          console.error('[VerifyOTP] Auto-verify exception:', error);
          setIsAutoVerifying(false);
        }
      }
      // Klassischer OTP-Code Flow
      else if (code && emailFromUrl) {
        setIsAutoVerifying(true);
        try {
          const supabase = createClient();
          const { data, error } = await supabase.auth.verifyOtp({
            email: emailFromUrl,
            token: code,
            type: 'email',
          });

          if (error) {
            console.error('[VerifyOTP] Auto-verify error:', error);
            setIsAutoVerifying(false);
            return;
          }

          if (data?.session) {
            setIsVerified(true);
            addToast({
              type: 'success',
              title: t('auth.otpVerified') || 'OTP verifiziert',
              message: t('auth.redirectingToReset') || 'Sie werden weitergeleitet...',
            });
            setTimeout(() => {
              router.push(`/${locale}/auth/reset-password`);
            }, 1000);
          }
        } catch (error: unknown) {
          console.error('[VerifyOTP] Auto-verify exception:', error);
          setIsAutoVerifying(false);
        }
      }
    };

    autoVerify();
    return undefined;
  }, [tokenHash, emailFromUrl, code, isVerified, isAutoVerifying, locale, router, addToast, t]);

  // Resend Countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => {
        clearTimeout(timer);
      };
    } else {
      return undefined;
    }
  }, [resendCountdown]);

  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!email.trim() || !otpCode.trim()) {
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: t('auth.fillAllFields') || 'Bitte füllen Sie alle Felder aus.',
      });
      setIsLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      addToast({
        type: 'error',
        title: t('auth.invalidEmail') || 'Ungültige E-Mail',
        message: t('auth.invalidEmailMessage') || 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      });
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const sanitizedEmail = sanitizeInput(email);

      // Versuche zuerst mit token_hash (PKCE)
      if (tokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });

        if (!error && data?.session) {
          setIsVerified(true);
          addToast({
            type: 'success',
            title: t('auth.otpVerified') || 'OTP verifiziert',
            message: t('auth.redirectingToReset') || 'Sie werden weitergeleitet...',
          });
          setTimeout(() => {
            router.push(`/${locale}/auth/reset-password`);
          }, 1000);
          setIsLoading(false);
          return;
        }
      }

      // Fallback: Klassischer OTP-Code
      const { data, error } = await supabase.auth.verifyOtp({
        email: sanitizedEmail,
        token: otpCode.trim(),
        type: 'email',
      });

      if (error) {
        console.error('[VerifyOTP] verifyOtp error:', error);
        const errorMsg = error.message || '';
        let errorMessage = errorMsg || t('auth.otpInvalid') || 'Ungültiger OTP-Code.';

        if (errorMsg.includes('expired')) {
          errorMessage = t('auth.otpExpired') || 'Der OTP-Code ist abgelaufen. Bitte fordern Sie einen neuen an.';
        } else if (errorMsg.includes('invalid')) {
          errorMessage = t('auth.otpInvalid') || 'Ungültiger OTP-Code. Bitte überprüfen Sie Ihre Eingabe.';
        }

        addToast({
          type: 'error',
          title: t('auth.verificationFailed') || 'Verifizierung fehlgeschlagen',
          message: errorMessage,
        });
        setIsLoading(false);
        return;
      }

      if (data?.session) {
        setIsVerified(true);
        addToast({
          type: 'success',
          title: t('auth.otpVerified') || 'OTP verifiziert',
          message: t('auth.redirectingToReset') || 'Sie werden weitergeleitet...',
        });
        setTimeout(() => {
          router.push(`/${locale}/auth/reset-password`);
        }, 1000);
      }
    } catch (error: any) {
      console.error('[VerifyOTP] Verification error:', error);
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: error?.message || t('errors.generic') || 'Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || !email.trim()) return;

    if (!validateEmail(email)) {
      addToast({
        type: 'error',
        title: t('auth.invalidEmail') || 'Ungültige E-Mail',
        message: t('auth.invalidEmailMessage') || 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const sanitizedEmail = sanitizeInput(email);

      const { error } = await supabase.auth.signInWithOtp({
        email: sanitizedEmail,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/${locale}/auth/reset-password`,
        },
      });

      if (error) {
        console.error('[VerifyOTP] Resend error:', error);
        const errorMsg = error.message || '';
        addToast({
          type: 'error',
          title: t('auth.resendFailed') || 'Erneutes Senden fehlgeschlagen',
          message: errorMsg || t('auth.resendFailedMessage') || 'Bitte versuchen Sie es später erneut.',
        });
        setIsLoading(false);
        return;
      }

      addToast({
        type: 'success',
        title: t('auth.otpResent') || 'OTP erneut gesendet',
        message: t('auth.checkEmailForOtp') || 'Bitte prüfen Sie Ihr E-Mail-Postfach.',
      });

      setResendCountdown(60);
      setOtpCode('');
    } catch (error: any) {
      console.error('[VerifyOTP] Resend exception:', error);
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: error?.message || t('errors.generic') || 'Etwas ist schief gelaufen.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('auth.otpVerified') || 'OTP verifiziert'}
          </h1>
          <p className="text-gray-600">
            {t('auth.redirectingToReset') || 'Sie werden weitergeleitet...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('auth.verifyOtp') || 'OTP verifizieren'}
          </h1>
          <p className="text-gray-600">
            {t('auth.verifyOtpDescription') || 'Geben Sie den OTP-Code aus Ihrer E-Mail ein.'}
          </p>
        </div>

        {isAutoVerifying && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-sm text-blue-800">
              {t('auth.autoVerifying') || 'Automatische Verifizierung...'}
            </p>
          </div>
        )}

        <form onSubmit={handleManualVerify} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.email') || 'E-Mail-Adresse'}
              </label>
              {!isEmailEditable && emailFromUrl && (
                <button
                  type="button"
                  onClick={() => setIsEmailEditable(true)}
                  className="text-xs text-brand-green hover:text-brand-dark"
                >
                  {t('auth.changeEmail') || 'E-Mail ändern'}
                </button>
              )}
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={!isEmailEditable || isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={t('auth.emailPlaceholder') || 'ihre@email.de'}
            />
          </div>

          <div>
            <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.otpCode') || 'OTP-Code'}
            </label>
            <input
              id="otpCode"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\s/g, ''))}
              required
              disabled={isLoading || isAutoVerifying}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent text-center text-lg tracking-widest disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={t('auth.otpPlaceholder') || '123456'}
              maxLength={6}
            />
            <p className="mt-1 text-xs text-gray-500">
              {t('auth.otpHint') || 'Geben Sie den 6-stelligen Code aus Ihrer E-Mail ein.'}
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading || isAutoVerifying}
            disabled={isLoading || isAutoVerifying}
          >
            {t('auth.verify') || 'Verifizieren'}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCountdown > 0 || isLoading || !email.trim()}
              className="text-sm text-brand-green hover:text-brand-dark disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              {resendCountdown > 0
                ? t('auth.resendCountdown', { seconds: resendCountdown }) || `Erneut senden (${resendCountdown}s)`
                : t('auth.resendOtp') || 'OTP erneut senden'}
            </button>
          </div>

          <div className="text-center">
            <Link
              href={`/${locale}/auth/login`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t('auth.backToLogin') || 'Zurück zur Anmeldung'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

