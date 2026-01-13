'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase';
import { sanitizeInput, validateEmail } from '@/lib/security';
import { getErrorMessage } from '@/lib/utils';

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const locale = useLocale();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      addToast({
        type: 'error',
        title: t('auth.error') || 'Fehler',
        message: t('auth.emailRequired') || 'Bitte geben Sie Ihre E-Mail-Adresse ein.',
      });
      return;
    }

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

      // Verwende signInWithOtp gemäß Reverse Engineering Dokumentation (Zeile 495)
      // redirectTo zeigt auf verify-otp, nicht direkt auf reset-password
      const { error } = await supabase.auth.signInWithOtp({
        email: sanitizedEmail,
        options: {
          shouldCreateUser: false, // Wichtig: Keine neuen User erstellen
          emailRedirectTo: `${window.location.origin}/${locale}/auth/verify-otp`,
        },
      });

      if (error) throw error;

      setEmailSent(true);
      addToast({
        type: 'success',
        title: t('auth.success') || 'Erfolg',
        message: t('auth.passwordResetEmailSent') || 'Wir haben Ihnen eine E-Mail zum Zurücksetzen Ihres Passworts gesendet.',
      });
    } catch (error: unknown) {
      console.error('[ForgotPassword] Password reset error:', error);
      addToast({
        type: 'error',
        title: t('auth.error') || 'Fehler',
        message: getErrorMessage(error) || t('auth.passwordResetFailed') || 'Fehler beim Senden der E-Mail. Bitte versuchen Sie es erneut.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">📧</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('auth.checkEmail') || 'E-Mail prüfen'}
            </h1>
            <p className="text-gray-600 mb-6">
              {t('auth.passwordResetEmailSent') || 'Wir haben Ihnen eine E-Mail zum Zurücksetzen Ihres Passworts gesendet. Bitte prüfen Sie Ihr Postfach.'}
            </p>
            <Link href={`/${locale}/auth/login`}>
              <Button variant="primary">
                {t('auth.backToLogin') || 'Zurück zur Anmeldung'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('auth.forgotPassword') || 'Passwort vergessen?'}
          </h1>
          <p className="text-gray-600">
            {t('auth.forgotPasswordDescription') || 'Geben Sie Ihre E-Mail-Adresse ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.email') || 'E-Mail-Adresse'}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
              placeholder={t('auth.emailPlaceholder') || 'ihre@email.de'}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            {t('auth.sendResetLink') || 'Link zum Zurücksetzen senden'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href={`/${locale}/auth/login`} className="text-sm text-brand-green hover:underline">
            {t('auth.backToLogin') || 'Zurück zur Anmeldung'}
          </Link>
        </div>
      </div>
    </div>
  );
}












