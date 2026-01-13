'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { validateStrongPassword } from '@/lib/security';
import { getErrorMessage } from '@/lib/utils';

type Status = 'loading' | 'ready' | 'success' | 'error' | 'expired';

export default function ResetPasswordPage() {
  const router = useRouter();
  const locale = useLocale();
  const { addToast } = useToast();
  const t = useTranslations();
  const tCommon = useTranslations('common');

  // State
  const [status, setStatus] = useState<Status>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Session-Check bei Page-Load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('[ResetPassword] Session check error:', error);
          setStatus('error');
          addToast({
            type: 'error',
            title: tCommon('error'),
            message: t('auth.sessionError') || 'Fehler beim Überprüfen der Session.',
          });
          return;
        }

        if (!session) {
          setStatus('expired');
          addToast({
            type: 'error',
            title: t('auth.sessionExpired') || 'Session abgelaufen',
            message: t('auth.sessionExpiredMessage') || 'Ihre Session ist abgelaufen. Bitte starten Sie den Passwort-Reset-Prozess erneut.',
          });
          return;
        }

        setStatus('ready');
      } catch (error: unknown) {
        console.error('[ResetPassword] Session check exception:', error);
        setStatus('error');
        addToast({
          type: 'error',
          title: tCommon('error'),
          message: getErrorMessage(error) || t('errors.generic') || 'Etwas ist schief gelaufen.',
        });
      }
    };

    checkSession();
  }, [addToast, t, tCommon]);

  // Passwort-Validierung
  useEffect(() => {
    if (!password) {
      setPasswordErrors([]);
      return;
    }

    const errors: string[] = [];

    if (password.length < 8) {
      errors.push(t('auth.passwordMinLength') || 'Mindestens 8 Zeichen erforderlich');
    }

    if (!/[a-z]/.test(password)) {
      errors.push(t('auth.passwordLowercase') || 'Mindestens ein Kleinbuchstabe erforderlich');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push(t('auth.passwordUppercase') || 'Mindestens ein Großbuchstabe erforderlich');
    }

    if (!/[0-9]/.test(password)) {
      errors.push(t('auth.passwordDigit') || 'Mindestens eine Zahl erforderlich');
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push(t('auth.passwordSpecial') || 'Mindestens ein Sonderzeichen erforderlich');
    }

    setPasswordErrors(errors);
  }, [password, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validierung
    if (!password || !confirmPassword) {
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: t('auth.fillAllFields') || 'Bitte füllen Sie alle Felder aus.',
      });
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      addToast({
        type: 'error',
        title: t('auth.passwordsDoNotMatch') || 'Passwörter stimmen nicht überein',
        message: t('auth.passwordsDoNotMatchMessage') || 'Die eingegebenen Passwörter stimmen nicht überein.',
      });
      setIsLoading(false);
      return;
    }

    if (!validateStrongPassword(password)) {
      addToast({
        type: 'error',
        title: t('auth.passwordWeak') || 'Passwort zu schwach',
        message: t('auth.passwordWeakMessage') || 'Das Passwort erfüllt nicht die Sicherheitsanforderungen.',
      });
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Prüfe Session erneut
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setStatus('expired');
        addToast({
          type: 'error',
          title: t('auth.sessionExpired') || 'Session abgelaufen',
          message: t('auth.sessionExpiredMessage') || 'Ihre Session ist abgelaufen. Bitte starten Sie den Passwort-Reset-Prozess erneut.',
        });
        setIsLoading(false);
        return;
      }

      // Passwort aktualisieren
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('[ResetPassword] updateUser error:', error);
        const errorMsg = error.message || '';
        let errorMessage = errorMsg || t('auth.passwordUpdateFailed') || 'Fehler beim Aktualisieren des Passworts.';

        if (errorMsg.includes('same')) {
          errorMessage = t('auth.passwordSameAsOld') || 'Das neue Passwort muss sich vom alten unterscheiden.';
        }

        addToast({
          type: 'error',
          title: t('auth.passwordUpdateFailed') || 'Passwort-Update fehlgeschlagen',
          message: errorMessage,
        });
        setIsLoading(false);
        return;
      }

      // Erfolg
      setStatus('success');
      addToast({
        type: 'success',
        title: t('auth.passwordUpdated') || 'Passwort aktualisiert',
        message: t('auth.passwordUpdatedMessage') || 'Ihr Passwort wurde erfolgreich aktualisiert. Sie werden zur Anmeldung weitergeleitet.',
      });

      // Weiterleitung nach 2 Sekunden
      setTimeout(() => {
        router.push(`/${locale}/auth/login`);
        router.refresh();
      }, 2000);
    } catch (error: any) {
      console.error('[ResetPassword] Update error:', error);
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: error?.message || t('errors.generic') || 'Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.',
      });
      setIsLoading(false);
    }
  };

  // Loading State
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
          <p className="text-gray-600">{t('auth.checkingSession') || 'Session wird überprüft...'}</p>
        </div>
      </div>
    );
  }

  // Expired State
  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">⏱️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('auth.sessionExpired') || 'Session abgelaufen'}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('auth.sessionExpiredMessage') || 'Ihre Session ist abgelaufen. Bitte starten Sie den Passwort-Reset-Prozess erneut.'}
          </p>
          <Link href={`/${locale}/auth/forgot-password`}>
            <Button variant="primary">
              {t('auth.startPasswordReset') || 'Passwort-Reset erneut starten'}
            </Button>
          </Link>
          <div className="mt-4">
            <Link
              href={`/${locale}/auth/login`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {t('auth.backToLogin') || 'Zurück zur Anmeldung'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {tCommon('error')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('auth.resetPasswordError') || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.'}
          </p>
          <Link href={`/${locale}/auth/forgot-password`}>
            <Button variant="primary">
              {t('auth.startPasswordReset') || 'Passwort-Reset erneut starten'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Success State
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('auth.passwordUpdated') || 'Passwort aktualisiert'}
          </h1>
          <p className="text-gray-600">
            {t('auth.redirectingToLogin') || 'Sie werden zur Anmeldung weitergeleitet...'}
          </p>
        </div>
      </div>
    );
  }

  // Ready State - Form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('auth.resetPassword') || 'Passwort zurücksetzen'}
          </h1>
          <p className="text-gray-600">
            {t('auth.resetPasswordDescription') || 'Geben Sie Ihr neues Passwort ein.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.newPassword') || 'Neues Passwort'}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={t('auth.passwordPlaceholder') || '••••••••'}
              autoComplete="new-password"
            />
            {passwordErrors.length > 0 && (
              <ul className="mt-2 text-xs text-red-600 space-y-1">
                {passwordErrors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            )}
            {password && validateStrongPassword(password) && (
              <p className="mt-2 text-xs text-green-600">✅ {t('auth.passwordValid') || 'Passwort erfüllt alle Anforderungen'}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.confirmPassword') || 'Passwort bestätigen'}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={t('auth.passwordPlaceholder') || '••••••••'}
              autoComplete="new-password"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-2 text-xs text-red-600">
                {t('auth.passwordsDoNotMatch') || 'Passwörter stimmen nicht überein'}
              </p>
            )}
            {confirmPassword && password === confirmPassword && password && (
              <p className="mt-2 text-xs text-green-600">✅ {t('auth.passwordsMatch') || 'Passwörter stimmen überein'}</p>
            )}
          </div>

          <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
            <p className="font-semibold mb-1">{t('auth.passwordRequirements') || 'Passwort-Anforderungen:'}</p>
            <ul className="space-y-1">
              <li>• {t('auth.passwordMinLength') || 'Mindestens 8 Zeichen'}</li>
              <li>• {t('auth.passwordLowercase') || 'Mindestens ein Kleinbuchstabe'}</li>
              <li>• {t('auth.passwordUppercase') || 'Mindestens ein Großbuchstabe'}</li>
              <li>• {t('auth.passwordDigit') || 'Mindestens eine Zahl'}</li>
              <li>• {t('auth.passwordSpecial') || 'Mindestens ein Sonderzeichen'}</li>
            </ul>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
            disabled={isLoading || !validateStrongPassword(password) || password !== confirmPassword}
          >
            {t('auth.updatePassword') || 'Passwort aktualisieren'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href={`/${locale}/auth/login`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {t('auth.backToLogin') || 'Zurück zur Anmeldung'}
          </Link>
        </div>
      </div>
    </div>
  );
}

