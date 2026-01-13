'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';

interface ExternalChange {
  id: string;
  provider: string;
  changeType: 'api_update' | 'breaking_change' | 'deprecation' | 'version_update' | 'webhook_change';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  updatedAt?: string;
  status: 'detected' | 'in_progress' | 'updated' | 'failed';
  autoUpdated: boolean;
  affectedServices?: string[];
}

interface ProviderStatus {
  provider: string;
  status: 'ok' | 'warning' | 'error';
  lastChange?: string;
  lastChecked: string;
  changesCount: number;
}

export function ExternalChangesTab() {
  const t = useTranslations('internalPortal.externalChanges');
  const { addToast } = useToast();
  const [changes, setChanges] = useState<ExternalChange[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterImpact, setFilterImpact] = useState<string>('all');

  useEffect(() => {
    loadExternalChanges();
    // Real-time updates every 30 seconds
    const interval = setInterval(loadExternalChanges, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadExternalChanges = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/intern/external-changes');
      if (!response.ok) {
        throw new Error('Failed to load external changes');
      }
      const data = await response.json();
      setChanges(data.changes || []);
      setProviderStatuses(data.providerStatuses || []);
    } catch (error) {
      addToast({
        type: 'error',
        title: t('error'),
        message: error instanceof Error ? error.message : t('errorLoading'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredChanges = changes.filter((change) => {
    if (filterProvider !== 'all' && change.provider !== filterProvider) return false;
    if (filterStatus !== 'all' && change.status !== filterStatus) return false;
    if (filterImpact !== 'all' && change.impact !== filterImpact) return false;
    return true;
  });

  const providers = Array.from(new Set(changes.map((c) => c.provider)));

  const getChangeTypeLabel = (type: string) => {
    try {
      return t(`changeTypes.${type}`);
    } catch {
      return type;
    }
  };

  const getImpactBadge = (impact: string) => {
    const styles: Record<string, string> = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return styles[impact] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      detected: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      updated: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  const getProviderStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ok: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDateTime = (value: string) => {
    try {
      return new Intl.DateTimeFormat('de-DE', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const formatRelativeTime = (value: string) => {
    try {
      const timestamp = new Date(value).getTime();
      const diffMs = Date.now() - timestamp;
      const minutes = Math.round(diffMs / 60000);
      if (minutes < 60) return `${minutes} min`;
      const hours = Math.round(minutes / 60);
      if (hours < 24) return `${hours} Std`;
      const days = Math.round(hours / 24);
      return `${days} Tag${days !== 1 ? 'e' : ''}`;
    } catch {
      return value;
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Status Overview */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700 mb-4">
          {t('providerStatus')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {providerStatuses.map((provider) => (
            <div
              key={provider.provider}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{provider.provider}</h3>
                <span
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border',
                    getProviderStatusBadge(provider.status)
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-current" />
                  {t(`statusLabels.${provider.status}`)}
                </span>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <p>
                  {t('changes')}: <span className="font-medium">{provider.changesCount}</span>
                </p>
                {provider.lastChange && (
                  <p>
                    {t('lastChange')}: {formatRelativeTime(provider.lastChange)}
                  </p>
                )}
                <p>
                  {t('lastChecked')}: {formatRelativeTime(provider.lastChecked)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              {t('provider')}
            </label>
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:ring-2 focus:ring-brand-green/40"
            >
              <option value="all">{t('allProviders')}</option>
              {providers.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              {t('status')}
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:ring-2 focus:ring-brand-green/40"
            >
              <option value="all">{t('allStatus')}</option>
              <option value="detected">{t('statusDetected')}</option>
              <option value="in_progress">{t('statusInProgress')}</option>
              <option value="updated">{t('statusUpdated')}</option>
              <option value="failed">{t('statusFailed')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              {t('impact')}
            </label>
            <select
              value={filterImpact}
              onChange={(e) => setFilterImpact(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:ring-2 focus:ring-brand-green/40"
            >
              <option value="all">{t('allImpacts')}</option>
              <option value="low">{t('impactLow')}</option>
              <option value="medium">{t('impactMedium')}</option>
              <option value="high">{t('impactHigh')}</option>
              <option value="critical">{t('impactCritical')}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Change Log */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
            {t('changeLog')}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = [
                [t('provider'), t('type'), 'Titel', t('impact'), t('status'), t('detected'), t('updated')].join(','),
                ...filteredChanges.map((c) =>
                  [
                    c.provider,
                    getChangeTypeLabel(c.changeType),
                    `"${c.title}"`,
                    c.impact,
                    c.status,
                    c.detectedAt,
                    c.updatedAt || '',
                  ].join(',')
                ),
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `external-changes-${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            {t('exportCsv')}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">{t('loading')}</div>
        ) : filteredChanges.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {t('noChanges')}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredChanges.map((change) => (
              <div
                key={change.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-semibold text-gray-900">{change.title}</h3>
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                          getImpactBadge(change.impact)
                        )}
                      >
                        {change.impact.toUpperCase()}
                      </span>
                      <span
                        className={clsx(
                          'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                          getStatusBadge(change.status)
                        )}
                      >
                        {change.status === 'detected'
                          ? t('statusDetected')
                          : change.status === 'in_progress'
                          ? t('statusInProgress')
                          : change.status === 'updated'
                          ? t('statusUpdated')
                          : t('statusFailed')}
                      </span>
                      {change.autoUpdated && (
                        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-green-100 text-green-800">
                          ✓ {t('autoUpdated')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <span>
                        <strong>{t('provider')}:</strong> {change.provider}
                      </span>
                      <span>
                        <strong>{t('type')}:</strong> {getChangeTypeLabel(change.changeType)}
                      </span>
                      <span>
                        <strong>{t('detected')}:</strong> {formatDateTime(change.detectedAt)} (
                        {formatRelativeTime(change.detectedAt)})
                      </span>
                      {change.updatedAt && (
                        <span>
                          <strong>{t('updated')}:</strong> {formatDateTime(change.updatedAt)} (
                          {formatRelativeTime(change.updatedAt)})
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{change.description}</p>
                    {change.affectedServices && change.affectedServices.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500">{t('affectedServices')}:</span>
                        {change.affectedServices.map((service) => (
                          <span
                            key={service}
                            className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

