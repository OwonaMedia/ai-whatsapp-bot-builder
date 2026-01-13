'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { sanitizeInput, validateEmail, validateStrongPassword } from '@/lib/security';
import { config } from '@/lib/config';
import HelpIcon, { HelpIconInline } from '@/components/ui/HelpIcon';
import { FacebookLoginButton } from './FacebookLoginButton';

interface SignupFormProps {
  redirectTo?: string;
}

export default function SignupForm({ redirectTo = '/dashboard' }: SignupFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    acceptTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bitte füllen Sie alle Pflichtfelder aus.',
      });
      setIsLoading(false);
      return;
    }

    if (!validateEmail(formData.email)) {
      addToast({
        type: 'error',
        title: 'Ungültige E-Mail',
        message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      });
      setIsLoading(false);
      return;
    }

    if (!validateStrongPassword(formData.password)) {
      addToast({
        type: 'error',
        title: 'Passwort zu kurz',
        message: 'Das Passwort muss mindestens 8 Zeichen lang sein und Groß-/Kleinbuchstaben, eine Zahl sowie ein Sonderzeichen enthalten.',
      });
      setIsLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addToast({
        type: 'error',
        title: 'Passwörter stimmen nicht überein',
        message: 'Bitte überprüfen Sie Ihre Passwort-Eingabe.',
      });
      setIsLoading(false);
      return;
    }

    if (!formData.acceptTerms) {
      addToast({
        type: 'error',
        title: 'Bedingungen nicht akzeptiert',
        message: 'Bitte akzeptieren Sie die Nutzungsbedingungen.',
      });
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(formData.email);
      const sanitizedName = sanitizeInput(formData.fullName);

      // Sign up
      // ✅ FIX: Use locale-aware redirect URL with next parameter for post-confirmation redirect
      const baseUrl = typeof window !== 'undefined'
        ? window.location.origin
        : config.app.url;
      
      // Encode redirectTo to avoid URL parameter conflicts
      const encodedRedirect = encodeURIComponent(redirectTo);
      const redirectUrl = `${baseUrl}/${locale}/auth/callback?next=${encodedRedirect}`;

      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: formData.password,
        options: {
          data: {
            full_name: sanitizedName || null,
            // Privacy Policy acceptance timestamp
            privacy_policy_accepted_at: new Date().toISOString(),
            terms_accepted_at: new Date().toISOString(),
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        addToast({
          type: 'error',
          title: 'Registrierung fehlgeschlagen',
          message: error.message || 'Bitte versuchen Sie es erneut.',
        });
        setIsLoading(false);
        return;
      }

      // Success - check if email confirmation is required
      if (data.user && !data.session) {
        // Email confirmation is enabled - user needs to verify email
        addToast({
          type: 'success',
          title: 'Registrierung erfolgreich',
          message: 'Bitte überprüfen Sie Ihre E-Mails zur Bestätigung.',
          duration: 10000,
        });
        router.push(`/${locale}/auth/verify-email`);
      } else {
        // Email confirmation is disabled - user is automatically logged in
        addToast({
          type: 'success',
          title: 'Registrierung erfolgreich',
          message: 'Willkommen! Ihr Konto wurde erstellt.',
          duration: 5000,
        });
        router.push(`/${locale}${redirectTo}`);
      }
    } catch (error) {
      console.error('Signup error:', error);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
      });
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFacebookSignup = async (facebookResult: any) => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      // Facebook User Info abrufen
      const fbResponse = await fetch(`https://graph.facebook.com/me?fields=name,email&access_token=${facebookResult.accessToken}`);
      const fbUser = await fbResponse.json();

      // Mit Facebook Daten bei Supabase registrieren
      const { data, error } = await supabase.auth.signUp({
        email: fbUser.email,
        password: `fb_${facebookResult.userID}_${Date.now()}`, // Temporäres Passwort
        options: {
          data: {
            full_name: fbUser.name,
            facebook_id: facebookResult.userID,
            facebook_access_token: facebookResult.accessToken,
            privacy_policy_accepted_at: new Date().toISOString(),
            terms_accepted_at: new Date().toISOString(),
          },
        },
      });

      if (error) {
        addToast({
          type: 'error',
          title: 'Facebook Registrierung fehlgeschlagen',
          message: error.message,
        });
        return;
      }

      addToast({
        type: 'success',
        title: 'Registrierung erfolgreich',
        message: 'Willkommen! Ihr Konto wurde mit Facebook erstellt.',
        duration: 5000,
      });

      // Weiterleitung zum Dashboard oder custom redirectTo
      router.push(`/${locale}${redirectTo}`);
    } catch (error) {
      console.error('Facebook signup error:', error);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Facebook Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <FacebookLoginButton
          variant="register"
          onSuccess={handleFacebookSignup}
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
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Vollständiger Name (optional)
            <HelpIconInline
              title="Vollständiger Name"
              content="Ihr vollständiger Name wird für die Personalisierung Ihres Kontos verwendet. Dieses Feld ist optional und kann später geändert werden."
              docLink={`/${locale}/docs#registration`}
            />
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            value={formData.fullName}
            onChange={handleChange}
            autoComplete="name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            placeholder="Max Mustermann"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            E-Mail-Adresse *
            <HelpIconInline
              title="E-Mail-Adresse"
              content="Geben Sie Ihre E-Mail-Adresse ein. Diese wird für die Anmeldung und wichtige Benachrichtigungen verwendet. Sie erhalten eine Bestätigungs-E-Mail zur Verifizierung Ihres Kontos."
              docLink={`/${locale}/docs#registration`}
            />
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
            autoComplete="email"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            placeholder="ihre@email.de"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Passwort * (min. 8 Zeichen, inkl. Anforderungen)
            <HelpIconInline
              title="Passwort"
              content="Ihr Passwort muss mindestens 8 Zeichen lang sein und mindestens einen Großbuchstaben, einen Kleinbuchstaben, eine Zahl und ein Sonderzeichen enthalten.\n\nTipp: Verwenden Sie ein eindeutiges Passwort, das Sie nicht auf anderen Websites nutzen."
              docLink={`/${locale}/docs#registration`}
            />
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            placeholder="••••••••••••"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-gray-500">
            Mindestens 8 Zeichen, plus Groß-/Kleinbuchstaben, Zahl & Sonderzeichen
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Passwort bestätigen *
            <HelpIconInline
              title="Passwort bestätigen"
              content="Geben Sie Ihr Passwort erneut ein, um Tippfehler zu vermeiden. Beide Passwörter müssen exakt übereinstimmen."
              docLink={`/${locale}/docs#registration`}
            />
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            autoComplete="new-password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
            placeholder="••••••••••••"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-start">
          <input
            id="acceptTerms"
            name="acceptTerms"
            type="checkbox"
            checked={formData.acceptTerms}
            onChange={handleChange}
            required
            className="mt-1 h-4 w-4 text-brand-green focus:ring-brand-green border-gray-300 rounded"
            disabled={isLoading}
          />
          <label htmlFor="acceptTerms" className="ml-2 text-sm text-gray-600">
            Ich akzeptiere die{' '}
            <a href={`/${locale}/legal/terms`} className="text-brand-green hover:underline" target="_blank">
              Nutzungsbedingungen
            </a>{' '}
            und die{' '}
            <a href={`/${locale}/legal/privacy`} className="text-brand-green hover:underline" target="_blank">
              Datenschutzerklärung
            </a>
            . *
            <HelpIconInline
              title="Nutzungsbedingungen & Datenschutz"
              content="Bitte lesen Sie unsere Nutzungsbedingungen und Datenschutzerklärung. Diese regeln Ihre Rechte und Pflichten sowie den Umgang mit Ihren personenbezogenen Daten. Die Akzeptanz ist erforderlich, um ein Konto zu erstellen."
            />
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isLoading}
          disabled={isLoading || !formData.acceptTerms}
        >
          Konto erstellen
        </Button>
      </form>
    </div>
  );
}

