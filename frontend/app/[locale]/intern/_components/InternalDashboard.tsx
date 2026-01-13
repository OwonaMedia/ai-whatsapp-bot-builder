"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  InternalPortalData,
  InternalPortalTicket,
  KnowledgeSuggestion,
  ServiceStatus,
} from "../data";
import {
  logoutInternalAction,
  postInternalReplyAction,
  registerKnowledgeSuggestionAction,
  updateTicketStatusAction,
} from "../actions";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { TabNavigation, TabId } from "./TabNavigation";
import { OverviewTab } from "./OverviewTab";
import { TicketsTab } from "./TicketsTab";
import { ExternalChangesTab } from "./ExternalChangesTab";
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
} from "recharts";

type InternalDashboardProps = {
  locale: string;
  data: InternalPortalData;
  sessionEmail: string;
};

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function TicketStatusBadge({ status, label }: { status: string; label: string }) {
  const mapping: Record<
    string,
    { label: string; className: string }
  > = {
    new: { label, className: "bg-blue-100 text-blue-800" },
    investigating: {
      label,
      className: "bg-orange-100 text-orange-800",
    },
    waiting_customer: {
      label,
      className: "bg-yellow-100 text-yellow-800",
    },
    resolved: {
      label,
      className: "bg-emerald-100 text-emerald-800",
    },
    closed: { label, className: "bg-gray-200 text-gray-700" },
  };

  const variant = mapping[status] ?? {
    label,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        variant.className
      )}
    >
      {variant.label}
    </span>
  );
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
  const intervalMs = typeof intervalMsRaw === "number" && Number.isFinite(intervalMsRaw) ? intervalMsRaw : 30_000;
  const deltaMs = Number.isFinite(heartbeatTime) ? now - heartbeatTime : Number.POSITIVE_INFINITY;

  let computedStatus: "up" | "degraded" | "down" = "up";
  const statusLower = (service.status ?? "").toLowerCase();
  if (statusLower === "down") {
    computedStatus = "down";
  } else if (deltaMs > intervalMs * 4) {
    computedStatus = "down";
  } else if (deltaMs > intervalMs * 2) {
    computedStatus = "degraded";
  }

  const badgeStyles: Record<typeof computedStatus, string> = {
    up: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    degraded: "bg-amber-100 text-amber-700 border border-amber-200",
    down: "bg-rose-100 text-rose-700 border border-rose-200",
  };

  const officerLabel = serviceLabel(service.serviceName);
  const badgeLabel = statusLabel(computedStatus);

  const metaCandidates: Array<{ key: string; type: "number" | "date" }> = [
    { key: "processedTickets", type: "number" },
    { key: "processingTickets", type: "number" },
    { key: "lastDispatchAt", type: "date" },
    { key: "lastTier2RunAt", type: "date" },
    { key: "lastCustomerReplyAt", type: "date" },
    { key: "lastPollingAt", type: "date" },
    { key: "lastCycleAt", type: "date" },
    { key: "lastRealtimeAt", type: "date" },
  ];

  const metaEntries = metaCandidates
    .map(({ key, type }) => {
      const raw = service.meta[key as keyof typeof service.meta];
      if (raw === null || raw === undefined) {
        return null;
      }
      if (type === "number") {
        if (typeof raw === "number") {
          return { key, value: raw.toString() };
        }
        if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) {
          return { key, value: Number(raw).toString() };
        }
        return null;
      }

      if (type === "date") {
        if (typeof raw === "string" && raw) {
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
          <span className={clsx("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold", badgeStyles[computedStatus])}>
            <span className="h-2 w-2 rounded-full bg-current" />
            {badgeLabel}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {translate("lastHeartbeat", "Letzter Heartbeat: {timestamp}").replace(
            "{timestamp}",
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

function KnowledgeBadge({ entry }: { entry: InternalPortalTicket["knowledge"][number] }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-brand-green/10 text-brand-green px-3 py-1 text-xs font-medium">
      <span>{entry.title}</span>
      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-brand-green/70">
        {entry.occurrences}
      </span>
    </span>
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

type ReplyFormState = {
  message: string;
  internalMessage: string;
};

export function InternalDashboard({
  locale,
  data,
  sessionEmail,
}: InternalDashboardProps) {
  const { addToast } = useToast();
  const t = useTranslations("internalPortal");
  const tSystem = useTranslations("internalPortal.systemStatus");
  const tStatus = useTranslations("support.inbox.status");
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
        day: "2-digit",
        month: "2-digit",
      }),
    [locale]
  );
  const relativeFormatter = useMemo(() => {
    try {
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
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
          return relativeFormatter.format(-seconds, "second");
        }
        const minutes = Math.round(diffMs / 60000);
        if (Math.abs(minutes) < 60) {
          return relativeFormatter.format(-minutes, "minute");
        }
        const hours = Math.round(minutes / 60);
        if (Math.abs(hours) < 24) {
          return relativeFormatter.format(-hours, "hour");
        }
        const days = Math.round(hours / 24);
        return relativeFormatter.format(-days, "day");
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
          entry.agent === "unassigned"
            ? translate("insights.agentLoad.unassigned", "Unassigned")
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
                  style={{ backgroundColor: entry.color ?? "#1f2937" }}
                />
                <span className="flex-1">
                  <span className="font-medium text-gray-700">{entry.name}</span>:{" "}
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
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    data.tickets[0]?.id ?? null
  );
  const [formState, setFormState] = useState<ReplyFormState>({
    message: "",
    internalMessage: "",
  });
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState("");
  const [ticketFilter, setTicketFilter] = useState<
    "all" | "active" | "waiting" | "resolved" | "escalated"
  >("active");

  const filterOptions = useMemo(
    () => [
      { value: "all" as const, label: t("filters.all") },
      { value: "active" as const, label: t("filters.active") },
      { value: "waiting" as const, label: t("filters.waiting") },
      { value: "resolved" as const, label: t("filters.resolved") },
      { value: "escalated" as const, label: t("filters.escalated") },
    ],
    [t]
  );

  const filteredTickets = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return data.tickets.filter((ticket) => {
      const matchesSearch =
        !normalizedSearch ||
        ticket.title.toLowerCase().includes(normalizedSearch) ||
        ticket.description.toLowerCase().includes(normalizedSearch) ||
        (ticket.category ?? "").toLowerCase().includes(normalizedSearch) ||
        (ticket.customer.fullName ?? "").toLowerCase().includes(normalizedSearch) ||
        (ticket.customer.email ?? "").toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      switch (ticketFilter) {
        case "active":
          return ["new", "investigating"].includes(ticket.status);
        case "waiting":
          return ticket.status === "waiting_customer";
        case "resolved":
          return ["resolved", "closed"].includes(ticket.status);
        case "escalated":
          return (ticket.escalationPath?.length ?? 0) > 0;
        default:
          return true;
      }
    });
  }, [data.tickets, searchTerm, ticketFilter]);

  useEffect(() => {
    if (filteredTickets.length === 0) {
      if (selectedTicketId !== null) {
        setSelectedTicketId(null);
      }
      return;
    }

    if (
      !selectedTicketId ||
      !filteredTickets.some((ticket) => ticket.id === selectedTicketId)
    ) {
      const firstTicket = filteredTickets[0];
      if (firstTicket) {
        setSelectedTicketId(firstTicket.id);
      }
    }
  }, [filteredTickets, selectedTicketId]);

  const selectedTicket = useMemo<InternalPortalTicket | null>(() => {
    if (!selectedTicketId) {
      return null;
    }
    return filteredTickets.find((ticket) => ticket.id === selectedTicketId) ?? null;
  }, [filteredTickets, selectedTicketId]);

  const handlePublicReply = () => {
    if (!selectedTicket) return;
    startTransition(async () => {
      const result = await postInternalReplyAction({
        locale,
        ticketId: selectedTicket.id,
        message: formState.message,
        internalOnly: false,
      });

      if (!result.success) {
        addToast({
          type: "error",
          title: "Antwort fehlgeschlagen",
          message: result.error ?? "Unbekannter Fehler",
        });
        return;
      }

      addToast({
        type: "success",
        title: "Antwort gesendet",
        message: "Der Kunde wurde benachrichtigt.",
      });
      setFormState((prev) => ({ ...prev, message: "" }));
    });
  };

  const handleInternalNote = () => {
    if (!selectedTicket) return;
    startTransition(async () => {
      const result = await postInternalReplyAction({
        locale,
        ticketId: selectedTicket.id,
        message: formState.internalMessage,
        internalOnly: true,
      });

      if (!result.success) {
        addToast({
          type: "error",
          title: "Interne Notiz fehlgeschlagen",
          message: result.error ?? "Unbekannter Fehler",
        });
        return;
      }

      addToast({
        type: "success",
        title: "Interne Notiz erfasst",
        message: "Tier‑2 erhält die Notiz ohne Kundeneinblick.",
      });
      setFormState((prev) => ({ ...prev, internalMessage: "" }));
    });
  };

  const handleStatusChange = (status: string) => {
    if (!selectedTicket) return;
    startTransition(async () => {
      const result = await updateTicketStatusAction({
        locale,
        ticketId: selectedTicket.id,
        status,
        assignedAgent: sessionEmail,
      });
      if (!result.success) {
        addToast({
          type: "error",
          title: "Status-Update fehlgeschlagen",
          message: result.error ?? "Unbekannter Fehler",
        });
        return;
      }
      addToast({
        type: "info",
        title: "Status aktualisiert",
        message: `Ticket wurde auf „${status}” gesetzt.`,
      });
    });
  };

const handleSuggestion = (suggestion: KnowledgeSuggestion, summary: string) => {
    startTransition(async () => {
      const result = await registerKnowledgeSuggestionAction({
        locale,
        ticketId: suggestion.ticketId,
        suggestionId: suggestion.id,
        summary,
        relatedAgent: suggestion.relatedAgent,
      });
      if (!result.success) {
        addToast({
          type: "error",
          title: "Wissensanfrage fehlgeschlagen",
          message: result.error ?? "Bitte später erneut versuchen.",
        });
        return;
      }
      addToast({
        type: "success",
        title: "Wissensanfrage erfasst",
        message: "Der MCP startet eine Expertensession.",
      });
    });
  };

  const handleLogout = () => {
    startTransition(async () => {
      await logoutInternalAction(locale);
    });
  };

  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Persist tab selection in URL or localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab') as TabId;
    if (tabParam && ['overview', 'tickets', 'external-changes'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-widest text-brand-green">
            {t("hero.pill")}
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t("hero.title")}
          </h1>
          <p className="text-sm text-gray-600">
            {t.rich("hero.subtitle", {
              strong: (chunks) => <strong>{chunks}</strong>,
              email: sessionEmail,
            })}
          </p>
        </div>
        <Button variant="secondary" onClick={handleLogout} isLoading={isPending}>
          {t("actions.logout")}
        </Button>
      </div>

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        locale={locale}
      />

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab locale={locale} data={data} />
      )}

      {activeTab === 'tickets' && (
        <TicketsTab locale={locale} data={data} sessionEmail={sessionEmail} />
      )}

      {activeTab === 'external-changes' && (
        <ExternalChangesTab />
      )}
    </div>
  );
}
