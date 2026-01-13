'use client';

import { useCallback, useMemo } from 'react';
import {
  InternalPortalData,
  ServiceStatus,
} from '../data';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

interface OverviewTabProps {
  locale: string;
  data: InternalPortalData;
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ServiceStatusCard({
  service,
  translate,
  statusLabel,
  serviceLabel,
  metaLabel,
  formatDate,
  formatRelative,
}: {
  service: ServiceStatus;
  translate: (key: string, fallback?: string) => string;
  statusLabel: (status: string) => string;
  serviceLabel: (serviceName: string) => string;
  metaLabel: (key: string) => string;
  formatDate: (value: string) => string;
  formatRelative: (value: string) => string;
}) {
  const heartbeatTime = new Date(service.lastHeartbeat).getTime();
  const now = Date.now();
  const intervalMsRaw = service.meta.intervalMs ?? service.meta.monitorIntervalMs ?? 30_000;
  const intervalMs = typeof intervalMsRaw === 'number' && Number.isFinite(intervalMsRaw) ? intervalMsRaw : 30_000;
  const deltaMs = Number.isFinite(heartbeatTime) ? now - heartbeatTime : Number.POSITIVE_INFINITY;

  let computedStatus: 'up' | 'degraded' | 'down' = 'up';
  const statusLower = (service.status ?? '').toLowerCase();
  if (statusLower === 'down') {
    computedStatus = 'down';
  } else if (deltaMs > intervalMs * 4) {
    computedStatus = 'down';
  } else if (deltaMs > intervalMs * 2) {
    computedStatus = 'degraded';
  }

  const badgeStyles: Record<typeof computedStatus, string> = {
    up: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    degraded: 'bg-amber-100 text-amber-700 border border-amber-200',
    down: 'bg-rose-100 text-rose-700 border border-rose-200',
  };

  const officerLabel = serviceLabel(service.serviceName);
  const badgeLabel = statusLabel(computedStatus);

  const metaCandidates: Array<{ key: string; type: 'number' | 'date' }> = [
    { key: 'processedTickets', type: 'number' },
    { key: 'processingTickets', type: 'number' },
    { key: 'lastDispatchAt', type: 'date' },
    { key: 'lastTier2RunAt', type: 'date' },
    { key: 'lastCustomerReplyAt', type: 'date' },
    { key: 'lastPollingAt', type: 'date' },
    { key: 'lastCycleAt', type: 'date' },
    { key: 'lastRealtimeAt', type: 'date' },
  ];

  const metaEntries = metaCandidates
    .map(({ key, type }) => {
      const raw = service.meta[key as keyof typeof service.meta];
      if (raw === null || raw === undefined) {
        return null;
      }
      if (type === 'number') {
        if (typeof raw === 'number') {
          return { key, value: raw.toString() };
        }
        if (typeof raw === 'string' && raw.trim() !== '' && Number.isFinite(Number(raw))) {
          return { key, value: Number(raw).toString() };
        }
        return null;
      }

      if (type === 'date') {
        if (typeof raw === 'string' && raw) {
          return { key, value: `${formatDate(raw)} (${formatRelative(raw)})` };
        }
        if (raw instanceof Date) {
          const iso = raw.toISOString();
          return { key, value: `${formatDate(iso)} (${formatRelative(iso)})` };
        }
        return null;
      }

      return null;
    })
    .filter((entry): entry is { key: string; value: string } => Boolean(entry))
    .slice(0, 3);

  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">{officerLabel}</p>
          <span className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold', badgeStyles[computedStatus])}>
            <span className="h-2 w-2 rounded-full bg-current" />
            {badgeLabel}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {translate('lastHeartbeat', 'Letzter Heartbeat: {timestamp}').replace(
            '{timestamp}',
            `${formatDate(service.lastHeartbeat)} (${formatRelative(service.lastHeartbeat)})`
          )}
        </p>
      </div>
      {metaEntries.length > 0 && (
        <ul className="space-y-1 text-xs text-gray-600">
          {metaEntries.map((entry) => (
            <li key={entry.key} className="flex items-center justify-between gap-2">
              <span className="text-gray-500">{metaLabel(entry.key)}</span>
              <span className="font-medium text-gray-800">{entry.value}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-500 leading-snug">{description}</p>
      )}
    </div>
  );
}

function InsightCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 space-y-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
      <div className="min-h-[220px] flex-1">
        {children}
      </div>
    </div>
  );
}

function NoDataState({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
      {label}
    </div>
  );
}

export function OverviewTab({ locale, data }: OverviewTabProps) {
  const t = useTranslations('internalPortal');
  const tSystem = useTranslations('internalPortal.systemStatus');
  const translate = useCallback(
    (key: string, fallback?: string) => {
      try {
        return t(key);
      } catch {
        return fallback ?? key;
      }
    },
    [t]
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: '2-digit',
        month: '2-digit',
      }),
    [locale]
  );
  const relativeFormatter = useMemo(() => {
    try {
      return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    } catch {
      return null;
    }
  }, [locale]);
  const translateSystem = useCallback(
    (key: string, fallback?: string) => {
      try {
        return tSystem(key);
      } catch {
        return fallback ?? key;
      }
    },
    [tSystem]
  );
  const systemStatusLabel = useCallback(
    (status: string) => translateSystem(`status.${status}`, status),
    [translateSystem]
  );
  const systemNameLabel = useCallback(
    (serviceName: string) => translateSystem(`services.${serviceName}`, serviceName),
    [translateSystem]
  );
  const systemMetaLabel = useCallback(
    (key: string) => translateSystem(`metaLabels.${key}`, key),
    [translateSystem]
  );
  const formatRelativeTime = useCallback(
    (value: string) => {
      try {
        const timestamp = new Date(value).getTime();
        if (!Number.isFinite(timestamp)) {
          return value;
        }
        const diffMs = Date.now() - timestamp;
        if (!relativeFormatter) {
          const minutes = Math.round(diffMs / 60000);
          return `${minutes} min`;
        }
        const seconds = Math.round(diffMs / 1000);
        if (Math.abs(seconds) < 60) {
          return relativeFormatter.format(-seconds, 'second');
        }
        const minutes = Math.round(diffMs / 60000);
        if (Math.abs(minutes) < 60) {
          return relativeFormatter.format(-minutes, 'minute');
        }
        const hours = Math.round(minutes / 60);
        if (Math.abs(hours) < 24) {
          return relativeFormatter.format(-hours, 'hour');
        }
        const days = Math.round(hours / 24);
        return relativeFormatter.format(-days, 'day');
      } catch {
        return value;
      }
    },
    [relativeFormatter]
  );
  const backlogSeries = useMemo(
    () =>
      data.insights.backlog.map((entry) => ({
        ...entry,
        label: dateFormatter.format(new Date(entry.date)),
      })),
    [data.insights.backlog, dateFormatter]
  );
  const priorityData = useMemo(
    () =>
      data.insights.priorityRisk.map((entry) => ({
        ...entry,
        label: translate(
          `insights.priority.labels.${entry.priority.toLowerCase()}`,
          entry.priority
        ),
      })),
    [data.insights.priorityRisk, translate]
  );
  const agentLoadData = useMemo(
    () =>
      data.insights.agentLoad.slice(0, 6).map((entry) => ({
        ...entry,
        label:
          entry.agent === 'unassigned'
            ? translate('insights.agentLoad.unassigned', 'Unassigned')
            : entry.agent,
      })),
    [data.insights.agentLoad, translate]
  );
  const renderTooltip = useCallback(
    ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
      if (!active || !payload || payload.length === 0 || !label) {
        return null;
      }
      return (
        <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 shadow-sm">
          <p className="mb-1 font-semibold text-gray-800">{label}</p>
          <ul className="space-y-0.5">
            {payload.map((entry) => (
              <li key={entry.dataKey} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color ?? '#1f2937' }}
                />
                <span className="flex-1">
                  <span className="font-medium text-gray-700">{entry.name}</span>:{' '}
                  {entry.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      );
    },
    []
  );

  return (
    <div className="space-y-8">
      {data.services.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
              {translateSystem('heading', 'Systemstatus')}
            </h2>
            <p className="text-xs text-gray-500">
              {translateSystem(
                'subtitle',
                'Live-Status der MCP-Automationen'
              )}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.services.map((service) => (
              <ServiceStatusCard
                key={service.serviceName}
                service={service}
                translate={translateSystem}
                statusLabel={systemStatusLabel}
                serviceLabel={systemNameLabel}
                metaLabel={systemMetaLabel}
                formatDate={formatDateTime}
                formatRelative={formatRelativeTime}
              />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title={t('metrics.total')} value={data.metrics.totalTickets} />
        <MetricCard
          title={t('metrics.active')}
          value={data.metrics.openTickets}
          description={t('metrics.activeDetails', {
            investigating: data.metrics.investigating,
            waiting: data.metrics.waitingCustomer,
          })}
        />
        <MetricCard
          title={t('metrics.escalated')}
          value={data.metrics.escalated}
          description={t('metrics.escalatedDescription')}
        />
        <MetricCard
          title={t('metrics.resolved')}
          value={data.metrics.resolved}
          description={
            data.metrics.averageResolutionTimeHours
              ? t('metrics.resolutionAvg', {
                  hours: data.metrics.averageResolutionTimeHours,
                })
              : t('metrics.resolutionMissing')
          }
        />
        <MetricCard
          title={t('metrics.knowledge')}
          value={data.knowledgeInventory.length}
          description={t('metrics.knowledgeDescription')}
        />
        <MetricCard
          title={t('metrics.gaps')}
          value={data.suggestions.length}
          description={t('metrics.gapsDescription')}
        />
        <MetricCard
          title={t('metrics.slaBreaches')}
          value={data.insights.slaBreaches}
          description={t('metrics.slaBreachesDescription')}
        />
        <MetricCard
          title={t('metrics.firstResponse')}
          value={
            data.insights.medianFirstResponseMinutes !== null
              ? `${Math.round(data.insights.medianFirstResponseMinutes)} min`
              : t('metrics.firstResponseMissing')
          }
          description={t('metrics.firstResponseDescription')}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
            {t('insights.title')}
          </h2>
          <p className="text-xs text-gray-500">{t('insights.subtitle')}</p>
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <InsightCard
            title={t('insights.backlog.title')}
            subtitle={t('insights.backlog.subtitle')}
          >
            {backlogSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={backlogSeries}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    allowDecimals={false}
                    width={32}
                  />
                  <RechartsTooltip content={renderTooltip} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="open"
                    name={t('insights.backlog.series.open')}
                    stroke="#047857"
                    fill="#bbf7d0"
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="newTickets"
                    name={t('insights.backlog.series.new')}
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="resolvedTickets"
                    name={t('insights.backlog.series.resolved')}
                    stroke="#6366f1"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="slaRisk"
                    name={t('insights.backlog.series.sla')}
                    stroke="#f97316"
                    strokeDasharray="6 3"
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <NoDataState label={t('insights.empty')} />
            )}
          </InsightCard>

          <InsightCard
            title={t('insights.priority.title')}
            subtitle={t('insights.priority.subtitle')}
          >
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    allowDecimals={false}
                    width={32}
                  />
                  <RechartsTooltip content={renderTooltip} />
                  <Legend />
                  <Bar
                    dataKey="open"
                    name={t('insights.priority.series.open')}
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="aged"
                    name={t('insights.priority.series.aged')}
                    fill="#f97316"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoDataState label={t('insights.empty')} />
            )}
          </InsightCard>

          <InsightCard
            title={t('insights.agentLoad.title')}
            subtitle={t('insights.agentLoad.subtitle')}
          >
            {agentLoadData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agentLoadData}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="label" stroke="#9ca3af" fontSize={12} />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={12}
                    allowDecimals={false}
                    width={32}
                  />
                  <RechartsTooltip content={renderTooltip} />
                  <Legend />
                  <Bar
                    dataKey="active"
                    name={t('insights.agentLoad.series.active')}
                    stackId="load"
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="waiting"
                    name={t('insights.agentLoad.series.waiting')}
                    stackId="load"
                    fill="#facc15"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <NoDataState label={t('insights.empty')} />
            )}
          </InsightCard>
        </div>
      </section>
    </div>
  );
}

