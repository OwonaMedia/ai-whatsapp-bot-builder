'use client';

import useSWR from 'swr';
import { useMemo, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import type { MonitoringSnapshot } from '@/lib/monitoring/snapshot';

interface MonitoringDashboardProps {
  locale: string;
  initialSnapshot: MonitoringSnapshot;
}

const fetcher = (url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error('Failed to load monitoring snapshot');
    }
    return response.json();
  });

function formatCurrency(locale: string, amount?: number, currency?: string) {
  if (typeof amount !== 'number' || !currency) {
    return '—';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(locale: string, isoString?: string | null) {
  if (!isoString) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(isoString));
  } catch (error) {
    return isoString;
  }
}

const statusColors: Record<string, string> = {
  succeeded: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-yellow-100 text-yellow-800',
  canceled: 'bg-gray-100 text-gray-700',
  pending: 'bg-sky-100 text-sky-800',
  processed: 'bg-green-100 text-green-800',
  received: 'bg-sky-100 text-sky-800',
};

export default function MonitoringDashboard({ locale, initialSnapshot }: MonitoringDashboardProps) {
  const t = useTranslations('monitoring');

  const { data, isValidating, error, mutate } = useSWR<MonitoringSnapshot>(
    '/api/monitoring/snapshot?days=30',
    fetcher,
    {
      fallbackData: initialSnapshot,
      revalidateOnFocus: false,
    }
  );

  const snapshot = data ?? initialSnapshot;

  const paymentStatusLabel = (status: string) => {
    const key = status.toLowerCase();
    try {
      return t(`status.${key}`);
    } catch {
      return status;
    }
  };

  const stats = snapshot.stats;

  const revenueCurrency = useMemo(() => {
    const firstSuccessful = snapshot.payments.find((payment) => payment.status === 'succeeded' && payment.currency);
    return firstSuccessful?.currency ?? 'EUR';
  }, [snapshot.payments]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-600">
            {t('subtitle', {
              from: formatDate(locale, snapshot.range.from),
              to: formatDate(locale, snapshot.range.to),
              days: snapshot.range.days,
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-sm text-red-600">{t('errors.loadFailed')}</span>}
          <Button
            variant="outline"
            onClick={() => mutate()}
            disabled={isValidating}
          >
            {isValidating ? t('actions.refreshing') : t('actions.refresh')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label={t('stats.totalRevenue')}
          value={formatCurrency(locale, stats.totalRevenue, revenueCurrency)}
        />
        <StatCard
          label={t('stats.successRate')}
          value={`${stats.successRate}%`}
        />
        <StatCard
          label={t('stats.failedPayments')}
          value={stats.failedPayments.toString()}
        />
        <StatCard
          label={t('stats.webhookFailures')}
          value={stats.webhookFailures.toString()}
        />
      </div>

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('payments.title')}</h2>
            <p className="text-sm text-gray-500">{t('payments.subtitle')}</p>
          </div>
          <span className="text-xs uppercase tracking-wide text-gray-400">
            {t('payments.total', { count: snapshot.payments.length })}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('payments.headers.date')}</th>
                <th className="px-4 py-3">{t('payments.headers.status')}</th>
                <th className="px-4 py-3">{t('payments.headers.amount')}</th>
                <th className="px-4 py-3">{t('payments.headers.provider')}</th>
                <th className="px-4 py-3">{t('payments.headers.subscription')}</th>
                <th className="px-4 py-3">{t('payments.headers.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {snapshot.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {formatDate(locale, payment.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        statusColors[payment.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${statusColors[payment.status] ? 'bg-current' : 'bg-gray-400'}`} />
                      {paymentStatusLabel(payment.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {formatCurrency(locale, payment.amount ?? undefined, payment.currency ?? undefined)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 capitalize">
                    {payment.payment_provider}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {payment.subscription_id || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    <pre className="max-w-xs whitespace-pre-wrap break-words text-xs text-gray-500">
                      {JSON.stringify(payment.metadata || {}, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
              {snapshot.payments.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={6}>
                    {t('payments.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('webhooks.title')}</h2>
            <p className="text-sm text-gray-500">{t('webhooks.subtitle')}</p>
          </div>
          <span className="text-xs uppercase tracking-wide text-gray-400">
            {t('webhooks.total', { count: snapshot.webhooks.length })}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('webhooks.headers.date')}</th>
                <th className="px-4 py-3">{t('webhooks.headers.provider')}</th>
                <th className="px-4 py-3">{t('webhooks.headers.event')}</th>
                <th className="px-4 py-3">{t('webhooks.headers.status')}</th>
                <th className="px-4 py-3">{t('webhooks.headers.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {snapshot.webhooks.map((webhook) => (
                <tr key={webhook.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {formatDate(locale, webhook.created_at)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700 capitalize">
                    {webhook.provider}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                    {webhook.event_type || '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        statusColors[webhook.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${statusColors[webhook.status] ? 'bg-current' : 'bg-gray-400'}`} />
                      {(() => {
                        try {
                          return t(`status.${webhook.status}`);
                        } catch {
                          return webhook.status;
                        }
                      })()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {webhook.error_message ? (
                      <div className="text-xs text-red-600">{webhook.error_message}</div>
                    ) : (
                      <pre className="max-w-xs whitespace-pre-wrap break-words text-xs text-gray-500">
                        {JSON.stringify(webhook.metadata || {}, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
              {snapshot.webhooks.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-sm text-gray-500" colSpan={5}>
                    {t('webhooks.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white border border-gray-100 shadow-sm p-6">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}


