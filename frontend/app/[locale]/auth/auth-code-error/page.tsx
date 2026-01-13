'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { config } from '@/lib/config';

export default function AuthCodeErrorPage() {
  const t = useTranslations('auth.emailVerificationFailed');
  const tAuth = useTranslations('auth');
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const { addToast } = useToast();
  const [isResending, setIsResending] = useState(false);
  const [email, setEmail] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');

  // Extract email from URL if present
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
      setEmailInput(emailParam);
    }
  }, [searchParams]);

  const handleResendEmail = async () => {
    const emailToUse = email || emailInput.trim();
    
    if (!emailToUse) {
      addToast({
        type: 'error',
        title: t('enterEmailError'),
        message: t('enterEmailError'),
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToUse)) {
      addToast({
        type: 'error',
        title: t('invalidEmailError'),
        message: t('invalidEmailMessage'),
      });
      return;
    }

    setIsResending(true);
    try {
      const supabase = createClient();
      
      // Resend confirmation email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToUse,
        options: {
          emailRedirectTo: `${config.app.url}/${locale}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        addToast({
          type: 'error',
          title: t('resendError'),
          message: error.message || t('resendError'),
        });
      } else {
        addToast({
          type: 'success',
          title: t('resendSuccess'),
          message: t('resendSuccessMessage'),
          duration: 10000,
        });
        setEmail(emailToUse); // Save for next time
      }
    } catch (error) {
      console.error('Resend email error:', error);
      addToast({
        type: 'error',
        title: t('genericError'),
        message: t('genericError'),
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-100 via-white to-red-200 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4 text-red-500">⚠️</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {t('title')}
        </h1>
        <p className="text-gray-600 mb-4">
          {t('description')}
        </p>
        <ul className="text-sm text-gray-600 mb-6 text-left list-disc list-inside space-y-1">
          <li>{t('reason1')}</li>
          <li>{t('reason2')}</li>
          <li>{t('reason3')}</li>
        </ul>
        
        <div className="mb-6">
          {email ? (
            <>
              <p className="text-sm text-gray-700 mb-3">
                {t('resendPrompt', { email })}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700 mb-3">
                {t('enterEmail')}
              </p>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder={tAuth('emailPlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent mb-3"
                disabled={isResending}
              />
            </>
          )}
          <Button
            onClick={handleResendEmail}
            isLoading={isResending}
            disabled={isResending || (!email && !emailInput.trim())}
            variant="primary"
            className="w-full"
          >
            {isResending ? t('resending') : t('resendButton')}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={`/${locale}/auth/login`}
            className="inline-block px-6 py-3 bg-brand-green text-white rounded-lg font-semibold hover:bg-brand-dark transition-colors"
          >
            {t('backToLogin')}
          </Link>
          <Link
            href={`/${locale}/auth/signup`}
            className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            {t('newSignup')}
          </Link>
        </div>
        
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800 font-semibold mb-1">
            {t('supabaseConfigWarning')}
          </p>
          <p className="text-xs text-yellow-700">
            {t('supabaseConfigMessage')}
          </p>
        </div>
      </div>
    </div>
  );
}
