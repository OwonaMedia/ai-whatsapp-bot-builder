'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useSupportTicket } from './SupportTicketContext';

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

export default function SupportTicketSheet() {
  const { isOpen, closeTicket, metadata } = useSupportTicket();
  const locale = useLocale();
  const t = useTranslations('support');
  const tCategories = useTranslations('support.categories');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'bug' | 'billing' | 'integration' | 'ux' | 'other'>('bug');
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceMetadata, setSourceMetadata] = useState<Record<string, unknown>>({});

  const categoryOptions = useMemo(
    () => [
      { value: 'bug', label: tCategories('bug') },
      { value: 'billing', label: tCategories('billing') },
      { value: 'integration', label: tCategories('integration') },
      { value: 'ux', label: tCategories('ux') },
      { value: 'other', label: tCategories('other') },
    ],
    [tCategories],
  );

  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setCategory('bug');
      setSubmissionState('idle');
      setErrorMessage(null);
      setSourceMetadata({});
      return;
    }

    try {
      // Alles in typeof window Check, um Hydration-Mismatch zu vermeiden
      if (typeof window === 'undefined') {
        // Fallback für SSR
        setSourceMetadata({
          locale,
          timezone: 'UTC',
          openedAt: '',
          context: metadata?.context ?? null,
          referenceId: metadata?.referenceId ?? null,
          extra: metadata?.extra ?? null,
        });
        return;
      }

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const initialMetadata: Record<string, unknown> = {
        locale,
        timezone,
        openedAt: new Date().toISOString(),
        context: metadata?.context ?? null,
        referenceId: metadata?.referenceId ?? null,
        extra: metadata?.extra ?? null,
        currentUrl: window.location.href,
        pathname: window.location.pathname,
        referrer: document.referrer || null,
      };

      if (typeof navigator !== 'undefined') {
        initialMetadata.userAgent = navigator.userAgent;
        initialMetadata.language = navigator.language;
        initialMetadata.platform = navigator.platform;
      }

      setSourceMetadata(initialMetadata);
    } catch (metadataError) {
      console.warn('[SupportTicketSheet] Failed to collect environment metadata', metadataError);
    }
  }, [isOpen, metadata, locale]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMessage(t('errors.requiredMessage'));
      return;
    }

    try {
      setSubmissionState('submitting');
      setErrorMessage(null);

      const response = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          title: title.trim(),
          description: description.trim(),
          locale,
          sourceMetadata: {
            ...sourceMetadata,
            category,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      setSubmissionState('success');
    } catch (error) {
      console.error('[SupportTicketSheet] Failed to submit ticket', error);
      setSubmissionState('error');
      setErrorMessage(t('errors.submitMessage'));
    }
  };

  if (!isOpen) {
    return null;
  }

  const hasError = errorMessage !== null;
  const isSubmitting = submissionState === 'submitting';
  const isSuccess = submissionState === 'success';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-t-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between px-6 pt-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-brand-green font-semibold">
              {t('title')}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">
              {t('subtitle')}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeTicket}
            className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
            aria-label={t('close')}
          >
            ✕
          </button>
        </header>

        {metadata?.context && (
          <div className="mx-6 mt-4 rounded-lg border border-dashed border-brand-green/40 bg-brand-green/5 px-4 py-2 text-xs text-brand-green">
            <span className="font-semibold">{metadata.context}</span>
            {metadata.referenceId ? (
              <span className="ml-2 text-brand-green/80">#{metadata.referenceId}</span>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 px-6 pb-8">
          <div className="rounded-xl border border-brand-green/30 bg-brand-green/5 px-4 py-3 text-xs text-brand-green/90">
            <p className="font-semibold mb-1">{t('statusOverview.heading')}</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>{t('statusOverview.personal')}</li>
              <li>{t('statusOverview.escalation')}</li>
              <li>{t('statusOverview.updates')}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <label htmlFor="support-ticket-category" className="block text-sm font-medium text-gray-700">
              {t('form.category')}
            </label>
            <select
              id="support-ticket-category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as typeof category)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
              disabled={submissionState === 'submitting' || submissionState === 'success'}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="support-ticket-title" className="block text-sm font-medium text-gray-700">
              {t('form.title')}
            </label>
            <input
              id="support-ticket-title"
              type="text"
              required
              value={title}
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('form.titlePlaceholder')}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="support-ticket-description" className="block text-sm font-medium text-gray-700">
              {t('form.description')}
            </label>
            <textarea
              id="support-ticket-description"
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('form.descriptionPlaceholder')}
              className="min-h-[140px] w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 shadow-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
              disabled={isSubmitting || isSuccess}
            />
          </div>

          <p className="text-xs text-gray-500">
            {t('form.metadataNotice')}
          </p>

          {hasError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">{t('errors.submitTitle')}</p>
              <p className="mt-1">{errorMessage}</p>
            </div>
          ) : null}

          {isSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <p className="font-semibold">{t('success.title')}</p>
              <p className="mt-1">{t('success.message')}</p>
              <p className="mt-2 text-emerald-800">{t('success.nextSteps')}</p>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeTicket}
              disabled={isSubmitting}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isSuccess}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  {t('submit')}
                </span>
              ) : isSuccess ? (
                t('success.title')
              ) : (
                t('submit')
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}



