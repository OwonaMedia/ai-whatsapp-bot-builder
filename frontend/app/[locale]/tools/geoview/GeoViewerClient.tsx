'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; html: string; url: string; country: string };

const COUNTRY_OPTIONS = [
  { code: 'DE', label: '🇩🇪 Deutschland' },
  { code: 'US', label: '🇺🇸 Vereinigte Staaten' },
  { code: 'GB', label: '🇬🇧 Vereinigtes Königreich' },
  { code: 'FR', label: '🇫🇷 Frankreich' },
  { code: 'ES', label: '🇪🇸 Spanien' },
  { code: 'IT', label: '🇮🇹 Italien' },
  { code: 'NL', label: '🇳🇱 Niederlande' },
  { code: 'SE', label: '🇸🇪 Schweden' },
  { code: 'NO', label: '🇳🇴 Norwegen' },
  { code: 'CA', label: '🇨🇦 Kanada' },
  { code: 'AU', label: '🇦🇺 Australien' },
  { code: 'BR', label: '🇧🇷 Brasilien' },
  { code: 'MX', label: '🇲🇽 Mexiko' },
  { code: 'JP', label: '🇯🇵 Japan' },
  { code: 'IN', label: '🇮🇳 Indien' },
  { code: 'AE', label: '🇦🇪 Vereinigte Arabische Emirate' },
  { code: 'ZA', label: '🇿🇦 Südafrika' },
  { code: 'KE', label: '🇰🇪 Kenia' },
  { code: 'GH', label: '🇬🇭 Ghana' },
  { code: 'NG', label: '🇳🇬 Nigeria' },
  { code: 'UG', label: '🇺🇬 Uganda' },
  { code: 'RW', label: '🇷🇼 Ruanda' },
];

export default function GeoViewerClient() {
  const t = useTranslations('geoViewer');
  const [url, setUrl] = React.useState('');
  const [country, setCountry] = React.useState<string>('DE');
  const [state, setState] = React.useState<FetchState>({ status: 'idle' });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    if (!url.trim()) {
      setState({ status: 'error', message: t('errors.urlMissing') });
      return;
    }

    setState({ status: 'loading' });

    try {
      const response = await fetch('/api/tools/geoview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          country,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || response.statusText);
      }

      setState({
        status: 'success',
        html: data.data.html,
        url: data.data.url,
        country: data.data.country,
      });
    } catch (error: any) {
      console.error('[GeoViewer] error:', error);
      setState({
        status: 'error',
        message: error?.message || t('errors.generic'),
      });
    }
  };

  const isLoading = state.status === 'loading';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-green">
            {t('badge')}
          </p>
          <h1 className="text-3xl font-semibold text-zinc-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-base text-zinc-600 dark:text-zinc-300">
            {t('description')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <label
                htmlFor="geo-viewer-url"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
              >
                {t('urlLabel')}
              </label>
              <input
                id="geo-viewer-url"
                type="url"
                placeholder={t('urlPlaceholder')}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm shadow-sm transition focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                required
                inputMode="url"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {t('urlHelp')}
              </p>
            </div>

            <div className="md:w-64">
              <label
                htmlFor="geo-viewer-country"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-200"
              >
                {t('countryLabel')}
              </label>
              <select
                id="geo-viewer-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm shadow-sm transition focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {t('countryHelp')}
              </p>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full md:w-auto"
            disabled={isLoading}
          >
            {isLoading ? t('loading') : t('submit')}
          </Button>
        </form>

        {state.status === 'error' && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200">
            {state.message}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
              {t('previewTitle')}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {t('previewSubtitle')}
            </p>
          </div>

          {state.status === 'success' && (
            <div className="rounded-full bg-brand-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-green">
              {t('badgeCountry', { country: state.country })}
            </div>
          )}
        </div>

        {state.status === 'idle' && (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
            {t('emptyState')}
          </div>
        )}

        {state.status === 'loading' && (
          <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-brand-green/40 bg-brand-green/5 text-brand-green">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-green/30 border-t-brand-green"></div>
            <p className="text-sm font-medium">{t('loadingPreview')}</p>
          </div>
        )}

        {state.status === 'success' && (
          <div className="overflow-hidden rounded-lg border border-zinc-200 shadow-inner dark:border-zinc-700">
            <iframe
              className="h-[720px] w-full bg-white"
              srcDoc={state.html}
              sandbox="allow-forms allow-popups allow-scripts allow-pointer-lock"
              title={t('iframeTitle', { url: state.url })}
            />
          </div>
        )}

        {state.status === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200">
            {t('errorPreview')}
          </div>
        )}
      </div>
    </div>
  );
}

