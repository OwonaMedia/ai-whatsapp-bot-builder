'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import {
  InternalPortalData,
  InternalPortalTicket,
  KnowledgeSuggestion,
} from '../data';
import {
  postInternalReplyAction,
  registerKnowledgeSuggestionAction,
  updateTicketStatusAction,
} from '../actions';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';

interface TicketsTabProps {
  locale: string;
  data: InternalPortalData;
  sessionEmail: string;
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

function TicketStatusBadge({ status, label }: { status: string; label: string }) {
  const mapping: Record<
    string,
    { label: string; className: string }
  > = {
    new: { label, className: 'bg-blue-100 text-blue-800' },
    investigating: {
      label,
      className: 'bg-orange-100 text-orange-800',
    },
    waiting_customer: {
      label,
      className: 'bg-yellow-100 text-yellow-800',
    },
    resolved: {
      label,
      className: 'bg-emerald-100 text-emerald-800',
    },
    closed: { label, className: 'bg-gray-200 text-gray-700' },
  };

  const variant = mapping[status] ?? {
    label,
    className: 'bg-gray-100 text-gray-700',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        variant.className
      )}
    >
      {variant.label}
    </span>
  );
}

function KnowledgeBadge({ entry }: { entry: InternalPortalTicket['knowledge'][number] }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-brand-green/10 text-brand-green px-3 py-1 text-xs font-medium">
      <span>{entry.title}</span>
      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-brand-green/70">
        {entry.occurrences}
      </span>
    </span>
  );
}

type ReplyFormState = {
  message: string;
  internalMessage: string;
};

export function TicketsTab({ locale, data, sessionEmail }: TicketsTabProps) {
  const { addToast } = useToast();
  const t = useTranslations('internalPortal');
  const tStatus = useTranslations('support.inbox.status');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    data.tickets[0]?.id ?? null
  );
  const [formState, setFormState] = useState<ReplyFormState>({
    message: '',
    internalMessage: '',
  });
  const [isPending, startTransition] = useTransition();
  const [searchTerm, setSearchTerm] = useState('');
  const [ticketFilter, setTicketFilter] = useState<
    'all' | 'active' | 'waiting' | 'resolved' | 'escalated'
  >('active');

  const filterOptions = useMemo(
    () => [
      { value: 'all' as const, label: t('filters.all') },
      { value: 'active' as const, label: t('filters.active') },
      { value: 'waiting' as const, label: t('filters.waiting') },
      { value: 'resolved' as const, label: t('filters.resolved') },
      { value: 'escalated' as const, label: t('filters.escalated') },
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
        (ticket.category ?? '').toLowerCase().includes(normalizedSearch) ||
        (ticket.customer.fullName ?? '').toLowerCase().includes(normalizedSearch) ||
        (ticket.customer.email ?? '').toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      switch (ticketFilter) {
        case 'active':
          return ['new', 'investigating'].includes(ticket.status);
        case 'waiting':
          return ticket.status === 'waiting_customer';
        case 'resolved':
          return ['resolved', 'closed'].includes(ticket.status);
        case 'escalated':
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
          type: 'error',
          title: 'Antwort fehlgeschlagen',
          message: result.error ?? 'Unbekannter Fehler',
        });
        return;
      }

      addToast({
        type: 'success',
        title: 'Antwort gesendet',
        message: 'Der Kunde wurde benachrichtigt.',
      });
      setFormState((prev) => ({ ...prev, message: '' }));
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
          type: 'error',
          title: 'Interne Notiz fehlgeschlagen',
          message: result.error ?? 'Unbekannter Fehler',
        });
        return;
      }

      addToast({
        type: 'success',
        title: 'Interne Notiz erfasst',
        message: 'Tier‑2 erhält die Notiz ohne Kundeneinblick.',
      });
      setFormState((prev) => ({ ...prev, internalMessage: '' }));
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
          type: 'error',
          title: 'Status-Update fehlgeschlagen',
          message: result.error ?? 'Unbekannter Fehler',
        });
        return;
      }
      addToast({
        type: 'info',
        title: 'Status aktualisiert',
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
          type: 'error',
          title: 'Wissensanfrage fehlgeschlagen',
          message: result.error ?? 'Bitte später erneut versuchen.',
        });
        return;
      }
      addToast({
        type: 'success',
        title: 'Wissensanfrage erfasst',
        message: 'Der MCP startet eine Expertensession.',
      });
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px,1fr] xl:items-start">
      <aside className="space-y-6 xl:sticky xl:top-24">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-4 py-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
                {t('tickets.heading')}
              </h2>
              <span className="text-xs font-medium text-gray-400">
                {filteredTickets.length}/{data.tickets.length}
              </span>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t('filters.label')}
              </label>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('filters.searchPlaceholder')}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-green focus:ring-2 focus:ring-brand-green/40"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTicketFilter(option.value)}
                  className={clsx(
                    'rounded-full px-3 py-1 text-xs font-medium transition',
                    ticketFilter === option.value
                      ? 'bg-brand-green text-white shadow'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100">
            {filteredTickets.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500">{t('filters.empty')}</p>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-100">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={clsx(
                      'w-full px-4 py-3 text-left transition hover:bg-brand-green/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green',
                      selectedTicketId === ticket.id ? 'bg-brand-green/10' : 'bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {ticket.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 truncate">
                          {ticket.customer.fullName ||
                            ticket.customer.email ||
                            t('tickets.unknownCustomer')}
                        </p>
                      </div>
                      <TicketStatusBadge
                        status={ticket.status}
                        label={tStatus(ticket.status as Parameters<typeof tStatus>[0])}
                      />
                    </div>
                    <div className="mt-2 text-xs text-gray-400 flex items-center gap-3">
                      <span>{formatDateTime(ticket.createdAt)}</span>
                      {ticket.assignedAgent && (
                        <>
                          <span>•</span>
                          <span>{t('tickets.assigned', { agent: ticket.assignedAgent })}</span>
                        </>
                      )}
                      {ticket.escalationPath.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 font-semibold">
                            {t('filters.escalated')}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
            {t('knowledgeInventory.heading')}
          </h3>
          {data.knowledgeInventory.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t('knowledgeInventory.empty')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.knowledgeInventory.slice(0, 12).map((entry) => (
                <KnowledgeBadge key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
            {t('suggestions.heading')}
          </h3>
          {data.suggestions.length === 0 ? (
            <p className="text-sm text-gray-500">
              {t('suggestions.empty')}
            </p>
          ) : (
            <div className="space-y-3">
              {data.suggestions.map((suggestion) => {
                const summary = suggestion.tags
                  .map((tag) => t(`suggestions.tags.${tag}` as const))
                  .join(' · ');
                const recommendation = t(
                  `suggestions.recommended.${suggestion.relatedAgent ?? 'default'}` as const
                );
                return (
                  <div
                    key={suggestion.id}
                    className="rounded-lg border border-gray-200 px-3 py-3 bg-white"
                  >
                    <p className="text-sm font-semibold text-gray-900">
                      {t('suggestions.title', { ticket: suggestion.ticketTitle })}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {summary}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {recommendation}
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-3"
                      onClick={() => handleSuggestion(suggestion, summary)}
                      isLoading={isPending}
                    >
                      {t('suggestions.cta')}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <div className="space-y-6">
        {selectedTicket ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedTicket.title}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedTicket.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>
                      {t('tickets.customerLabel')}{' '}
                      {selectedTicket.customer.fullName ||
                        selectedTicket.customer.email ||
                        t('tickets.unknownCustomer')}
                    </span>
                    {selectedTicket.customer.company && (
                      <>
                        <span>•</span>
                        <span>{selectedTicket.customer.company}</span>
                      </>
                    )}
                    {selectedTicket.customer.subscriptionTier && (
                      <>
                        <span>•</span>
                        <span>
                          {t('tickets.planInfo', {
                            plan:
                              selectedTicket.customer.subscriptionTier ??
                              t('tickets.planUnknown'),
                            status:
                              selectedTicket.customer.subscriptionStatus ??
                              t('tickets.statusUnknown'),
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm text-gray-500">
                  <TicketStatusBadge
                    status={selectedTicket.status}
                    label={tStatus(selectedTicket.status as Parameters<typeof tStatus>[0])}
                  />
                  <span>
                    {t('tickets.createdAt', {
                      timestamp: formatDateTime(selectedTicket.createdAt),
                    })}
                  </span>
                  <span>
                    {t('tickets.updatedAt', {
                      timestamp: formatDateTime(selectedTicket.updatedAt),
                    })}
                  </span>
                  {selectedTicket.lastEscalation && (
                    <span>
                      {t('tickets.lastEscalation', {
                        timestamp: formatDateTime(selectedTicket.lastEscalation),
                      })}
                    </span>
                  )}
                </div>
              </div>
              {selectedTicket.plan && (
                <div className="rounded-lg border border-brand-green/30 bg-brand-green/5 px-4 py-3 space-y-2">
                  <p className="text-sm font-semibold text-brand-green">
                    {t('plan.nextSteps', {
                      agent: selectedTicket.plan.agent ?? t('plan.tier1'),
                    })}
                  </p>
                  <ul className="list-disc pl-4 text-sm text-brand-green/80 space-y-1">
                    {selectedTicket.plan.actions.map((action, index) => (
                      <li key={`${action.type}-${index}`}>
                        <span className="font-medium uppercase text-xs text-brand-green/70">
                          {action.type}
                        </span>{' '}
                        {action.description}
                        {action.status && (
                          <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-brand-green/70 border border-brand-green/40">
                            {action.status}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedTicket.knowledge.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTicket.knowledge.map((entry) => (
                    <KnowledgeBadge key={`${selectedTicket.id}-${entry.id}`} entry={entry} />
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
                  {t('timeline.heading')}
                </h3>
              </div>
              <div className="max-h-[50vh] overflow-y-auto space-y-4 px-6 py-4">
                {selectedTicket.messages.map((message) => (
                  <div key={message.id} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium text-gray-700">
                        {message.authorName ?? message.authorType.toUpperCase()}
                      </span>
                      <span>•</span>
                      <span>{formatDateTime(message.createdAt)}</span>
                      <span>•</span>
                      <span className="uppercase tracking-wide text-gray-400">
                        {message.tier === 'tier2'
                          ? t('timeline.tier2')
                          : message.tier === 'tier1'
                          ? t('timeline.tier1')
                          : t('timeline.system')}
                      </span>
                      {message.internalOnly && (
                        <>
                          <span>•</span>
                          <span className="text-amber-600 font-semibold">
                            {t('timeline.internalOnly')}
                          </span>
                        </>
                      )}
                    </div>
                    <div
                      className={clsx(
                        'internal-message-bubble rounded-lg border px-4 py-3 text-sm whitespace-pre-wrap',
                        message.internalOnly
                          ? 'internal-message-bubble--internal bg-gray-50 border-gray-200'
                          : message.authorType === 'customer'
                          ? 'internal-message-bubble--customer bg-brand-green/5 border-brand-green/40'
                          : 'internal-message-bubble--agent bg-blue-50 border-blue-200'
                      )}
                    >
                      <span className="internal-message-text">
                        {message.message}
                      </span>
                    </div>
                    {message.quickReplies.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {message.quickReplies.map((option) => (
                          <span
                            key={option}
                            className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600"
                          >
                            {option}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
                    {t('reply.publicHeading')}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleStatusChange('waiting_customer')}
                    isLoading={isPending}
                  >
                    {t('reply.waitingCustomer')}
                  </Button>
                </div>
                <textarea
                  value={formState.message}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, message: event.target.value }))
                  }
                  placeholder="Antwort für Kundensicht verfassen…"
                  className="w-full min-h-[120px] rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-green focus:ring-2 focus:ring-brand-green/40"
                />
                <Button
                  variant="primary"
                  onClick={handlePublicReply}
                  isLoading={isPending}
                  disabled={!formState.message.trim()}
                >
                  {t('reply.sendPublic')}
                </Button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
                    {t('reply.internalHeading')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange('investigating')}
                      isLoading={isPending}
                    >
                      {t('reply.investigating')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange('resolved')}
                      isLoading={isPending}
                    >
                      {t('reply.resolve')}
                    </Button>
                  </div>
                </div>
                <textarea
                  value={formState.internalMessage}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      internalMessage: event.target.value,
                    }))
                  }
                  placeholder="Interne Analyse, Tier 2 Handover, externe Recherchebedarf…"
                  className="w-full min-h-[120px] rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-green focus:ring-2 focus:ring-brand-green/40 bg-gray-50"
                />
                <Button
                  variant="secondary"
                  onClick={handleInternalNote}
                  isLoading={isPending}
                  disabled={!formState.internalMessage.trim()}
                >
                  {t('reply.saveInternal')}
                </Button>
              </div>
            </div>

            {selectedTicket.automation.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                  <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider">
                    {t('automation.heading')}
                  </h3>
                </div>
                <div className="space-y-3 px-6 py-4">
                  {selectedTicket.automation.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 bg-gray-50"
                    >
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span className="uppercase tracking-wide text-gray-600">
                          {event.actionType}
                        </span>
                        <span>•</span>
                        <span>{formatDateTime(event.createdAt)}</span>
                      </div>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center text-gray-500">
            {t('tickets.noneSelected')}
          </div>
        )}
      </div>
    </div>
  );
}

