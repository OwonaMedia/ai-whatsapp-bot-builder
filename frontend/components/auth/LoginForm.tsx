'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { sanitizeInput, validateEmail } from '@/lib/security';
import { FacebookLoginButton } from './FacebookLoginButton';

interface LoginFormProps {
  redirectTo?: string;
}

export default function LoginForm({ redirectTo = '/dashboard' }: LoginFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const { addToast } = useToast();
  const t = useTranslations();
  const tCommon = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleFacebookLogin = async (facebookResult: any) => {
    try {
      setIsLoading(true);

      // Facebook User Info abrufen
      const fbResponse = await fetch(`https://graph.facebook.com/me?fields=email&access_token=${facebookResult.accessToken}`);
      const fbUser = await fbResponse.json();

      if (!fbUser.email) {
        addToast({
          type: 'error',
          title: 'Facebook Fehler',
          message: 'Keine E-Mail-Adresse von Facebook erhalten.',
        });
        return;
      }

      // Mit Facebook bei Supabase anmelden
      let supabase;
      try {
        supabase = createClient();
      } catch (clientError: any) {
        console.error('[FacebookLogin] Supabase client creation failed:', clientError);
        addToast({
          type: 'error',
          title: tCommon('error'),
          message: 'Supabase ist nicht konfiguriert.',
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: fbUser.email,
        password: `fb_${facebookResult.userID}`, // Facebook User haben ein spezielles Passwort
      });

      if (error) {
        addToast({
          type: 'error',
          title: 'Facebook Anmeldung fehlgeschlagen',
          message: 'Bitte registrieren Sie sich zuerst mit Facebook.',
        });
        return;
      }

      addToast({
        type: 'success',
        title: 'Anmeldung erfolgreich',
        message: 'Willkommen zurück!',
      });

      router.push(redirectTo);
    } catch (error) {
      console.error('Facebook login error:', error);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Facebook Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Input Validation
    if (!email || !password) {
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
      // Try to create Supabase client
      let supabase;
      try {
        supabase = createClient();
      } catch (clientError: any) {
        console.error('[LoginForm] Supabase client creation failed:', clientError);
        addToast({
          type: 'error',
          title: tCommon('error'),
          message: 'Supabase ist nicht konfiguriert. Bitte setzen Sie NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY in PM2. Siehe SETUP_INSTRUCTIONS.md auf dem Server.',
        });
        setIsLoading(false);
        return;
      }

      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email);

      // Sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: password, // Password wird nicht sanitized, sondern hashed
      });

      if (error) {
        console.error('[LoginForm] Supabase auth error:', error);
        console.error('[LoginForm] Error code:', error.status);
        console.error('[LoginForm] Error message:', error.message);

        // ✅ Bessere Fehlerbehandlung für verschiedene Fehlertypen
        let errorMessage = error.message || t('auth.checkCredentials') || 'Bitte überprüfen Sie Ihre Zugangsdaten.';

        // Spezifische Fehlermeldungen
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = 'Ungültige E-Mail-Adresse oder Passwort. Bitte versuchen Sie es erneut.';
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.';
        } else if (error.status === 400) {
          errorMessage = 'Anmeldefehler: Bitte überprüfen Sie Ihre Eingaben.';
        } else if (error.status === 429) {
          errorMessage = 'Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.';
        }

        addToast({
          type: 'error',
          title: t('auth.loginFailed') || 'Anmeldung fehlgeschlagen',
          message: errorMessage,
        });
        setIsLoading(false);
        return;
      }

      // ✅ Prüfe ob data existiert und Session gesetzt wurde
      if (!data || !data.session) {
        console.error('[LoginForm] No session returned after login');
        addToast({
          type: 'error',
          title: t('auth.loginFailed') || 'Anmeldung fehlgeschlagen',
          message: 'Session konnte nicht erstellt werden. Bitte versuchen Sie es erneut.',
        });
        setIsLoading(false);
        return;
      }

      // Success
      addToast({
        type: 'success',
        title: t('auth.loginSuccess') || 'Erfolgreich angemeldet',
        message: t('auth.redirecting') || 'Sie werden weitergeleitet...',
      });

      // Redirect with locale prefix
      // ✅ FIX: Prüfe ob redirectTo bereits einen locale-Prefix hat
      let redirectPath = redirectTo;
      if (!redirectPath.startsWith(`/${locale}`)) {
        // Wenn kein locale-Prefix vorhanden, füge es hinzu
        redirectPath = redirectTo.startsWith('/') ? `/${locale}${redirectTo}` : `/${locale}/${redirectTo}`;
      }

      // ✅ Warte kurz, damit Toast-Nachricht sichtbar ist
      await new Promise(resolve => setTimeout(resolve, 500));

      router.push(redirectPath);
      router.refresh();
    } catch (error: any) {
      console.error('[LoginForm] Login error:', error);
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: error?.message || t('errors.generic') || 'Etwas ist schief gelaufen. Bitte versuchen Sie es erneut.',
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('auth.welcomeBack') || 'Willkommen zurück'}
        </h1>
        <p className="text-gray-600">
          {t('auth.loginDescription') || 'Melden Sie sich an, um fortzufahren'}
        </p>
      </div>

      <div className="text-center">
        <FacebookLoginButton
          variant="login"
          onSuccess={handleFacebookLogin}
          onError={(error) => {
            addToast({
              type: 'error',
              title: 'Facebook Fehler',
              message: error.message,
            });
          }}
          className="w-full mb-4"
        />
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">oder</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.email')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            placeholder={t('auth.emailPlaceholder') || 'ihre@email.de'}
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {t('auth.password')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            placeholder="••••••••"
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {t('auth.login')}
        </Button>
      </form>

      <div className="text-center space-y-2">
        <p className="text-sm text-gray-600">
          {t('auth.noAccount')}{' '}
          <Link
            href={`/${locale}/auth/signup`}
            className="text-brand-green hover:text-brand-dark font-semibold"
          >
            {t('auth.signupLink') || 'Jetzt registrieren'}
          </Link>
        </p>
        <Link
          href={`/${locale}/auth/forgot-password`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {t('auth.forgotPassword')}
        </Link>
      </div>
    </div>
  );
}

