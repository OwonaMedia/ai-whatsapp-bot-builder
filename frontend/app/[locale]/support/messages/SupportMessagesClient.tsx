'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useSupportTicket } from '@/components/support/SupportTicketContext';

type QuickReplyOption = {
  id?: string;
  label: string;
};

type TicketMessage = {
  id: string;
  author_type: 'customer' | 'support' | 'system';
  author_user_id: string | null;
  author_name: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  internal_only?: boolean;
  quick_reply_options?: QuickReplyOption[];
};

function normalizeQuickReplies(
  input: TicketMessage['quick_reply_options'] | string | null | undefined,
  fallbackId: string,
): QuickReplyOption[] {
  if (!input) {
    return [];
  }

  const normalize = (value: unknown, index: number): QuickReplyOption | null => {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return { id: `${fallbackId}-qr-${index}`, label: value };
    }

    if (typeof value === 'object' && 'label' in (value as any)) {
      const option = value as QuickReplyOption;
      if (!option.label) {
        return null;
      }
      return {
        id: option.id ?? `${fallbackId}-qr-${index}`,
        label: option.label,
      };
    }

    return null;
  };

  let parsed: unknown;

  if (Array.isArray(input)) {
    parsed = input;
  } else if (typeof input === 'string') {
    try {
      const json = JSON.parse(input);
      parsed = Array.isArray(json) ? json : [];
    } catch (error) {
      console.warn('[SupportInbox] Failed to parse quick_reply_options JSON string', error);
      parsed = [];
    }
  } else {
    parsed = [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const result: QuickReplyOption[] = [];
  parsed.forEach((value, index) => {
    const normalized = normalize(value, index);
    if (normalized) {
      result.push(normalized);
    }
  });

  return result;
}

type Ticket = {
  id: string;
  status: 'new' | 'investigating' | 'waiting_customer' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category: string | null;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  assigned_agent?: string | null;
  escalation_path?: Array<{
    agent: string;
    status: string;
    timestamp: string;
  }> | null;
  support_ticket_messages: TicketMessage[];
};

const STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  investigating: 'bg-amber-100 text-amber-800',
  waiting_customer: 'bg-purple-100 text-purple-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-200 text-gray-700',
};

const PRIORITY_STYLES: Record<string, string> = {
  low: 'text-gray-500',
  normal: 'text-gray-700',
  high: 'text-orange-600 font-semibold',
  urgent: 'text-red-600 font-semibold',
};

export default function SupportMessagesClient() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations();
  const tSupport = useTranslations('support.inbox');
  const tSupportRoot = useTranslations('support');
  const { addToast } = useToast();
  const { openTicket } = useSupportTicket();

  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReplyLoading, setIsReplyLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isLoadingSilentCheck, setIsLoadingSilentCheck] = useState(false);
  const [silentCheckMessage, setSilentCheckMessage] = useState<string | null>(null);
  const [useRealtime, setUseRealtime] = useState(false);
  const loadTicketsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadTickets = useCallback(async () => {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[SupportInbox] Session error', sessionError);
      router.push(`/${locale}/auth/login?redirect=/${locale}/support/messages`);
      return;
    }

    if (!sessionData.session?.user) {
      router.push(`/${locale}/auth/login?redirect=/${locale}/support/messages`);
      return;
    }

    const currentUser = sessionData.session.user;
    setUser(currentUser);

    const { data, error } = await supabase
      .from('support_tickets')
      .select(
        `
          id,
          status,
          priority,
          category,
          title,
          description,
          created_at,
          updated_at,
          support_ticket_messages (
            id,
            author_type,
            author_user_id,
            author_name,
            message,
            metadata,
            created_at,
            internal_only,
            quick_reply_options
          )
        `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SupportInbox] Tickets konnten nicht geladen werden:', error);
      addToast({
        type: 'error',
        title: tSupportRoot('errors.submitTitle'),
        message: tSupportRoot('errors.submitMessage'),
      });
      return;
    }

    const normalizedTickets =
      data?.map((ticket: { id: string; support_ticket_messages?: unknown[]; [key: string]: unknown }) => ({
        ...ticket,
          support_ticket_messages: ((ticket.support_ticket_messages ?? []) as TicketMessage[])
            .sort(
              (a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            .map((message) => ({
              ...message,
              quick_reply_options: normalizeQuickReplies(message.quick_reply_options, message.id),
            })),
      })) ?? [];

    setTickets(normalizedTickets as Ticket[]);
    if (normalizedTickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(normalizedTickets[0].id);
    }
    setIsLoading(false);
  }, [supabase, locale, router, addToast, tSupportRoot, selectedTicketId]);

  // Debounce für loadTickets - verhindert zu viele API-Calls
  const loadTicketsDebounced = useCallback(() => {
    if (loadTicketsTimeoutRef.current) {
      clearTimeout(loadTicketsTimeoutRef.current);
    }
    loadTicketsTimeoutRef.current = setTimeout(() => {
      loadTickets();
    }, 500); // 500ms Debounce
  }, [loadTickets]);

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // REALTIME KOMPLETT DEAKTIVIERT - Nur Polling verwenden
  // Grund: Realtime Message Count Quota überschritten
  // TODO: Realtime wieder aktivieren, sobald Quota-Problem behoben ist
  useEffect(() => {
    // Polling alle 8 Sekunden - Realtime komplett deaktiviert
    const pollingInterval = setInterval(() => {
      loadTickets();
    }, 8000); // Alle 8 Sekunden pollen

    return () => {
      clearInterval(pollingInterval);
    };
  }, [loadTickets]);

  // Realtime-Subscription DEAKTIVIERT
  // useEffect(() => {
  //   // Realtime komplett deaktiviert bis Quota-Problem behoben ist
  //   return;
  // }, [supabase, selectedTicketId]);

  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) || null;

  const visibleMessages = selectedTicket
    ? selectedTicket.support_ticket_messages.filter(
        (message) => !message.internal_only || message.author_type === 'customer'
      )
    : [];

  const formatDateTime = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(dateString));
    } catch (error) {
      return new Date(dateString).toLocaleString();
    }
  };

  const silentCheck = async (action: 'reloadPaymentStatus' | 'checkDeployment' | 'traceUiError') => {
    if (!selectedTicket) return;
    setIsLoadingSilentCheck(true);
    setSilentCheckMessage(tSupport('silentCheck.running'));
    try {
      // TODO: Replace with real endpoint when available
      await new Promise((resolve) => setTimeout(resolve, 1500));
      switch (action) {
        case 'reloadPaymentStatus':
          setSilentCheckMessage(tSupport('silentCheck.paymentStatusOk'));
          break;
        case 'checkDeployment':
          setSilentCheckMessage(tSupport('silentCheck.deploymentHealthy'));
          break;
        case 'traceUiError':
          setSilentCheckMessage(tSupport('silentCheck.uiTraceCaptured'));
          break;
        default:
          setSilentCheckMessage(tSupport('silentCheck.completed'));
      }
    } catch (error: any) {
      setSilentCheckMessage(error.message ?? tSupport('silentCheck.error'));
    } finally {
      setTimeout(() => setIsLoadingSilentCheck(false), 600);
    }
  };

  const handleQuickReply = async (option: QuickReplyOption) => {
    await handleReplySubmit(option.label, option);
  };

  const handleReplySubmit = async (prefill?: string, quickReplyOption?: QuickReplyOption) => {
    if (!selectedTicket || !(prefill ?? replyText).trim()) {
      addToast({
        type: 'error',
        title: tSupportRoot('errors.requiredTitle'),
        message: tSupportRoot('errors.requiredMessage'),
      });
      return;
    }

    if (!user) {
      addToast({
        type: 'error',
        title: t('common.error'),
        message: tSupportRoot('errors.submitMessage'),
      });
      router.push(`/${locale}/auth/login?redirect=/${locale}/support/messages`);
      return;
    }

    try {
      setIsReplyLoading(true);

      const messageText = (prefill ?? replyText).trim();

      const response = await fetch(`/api/support-tickets/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          quickReplyId: quickReplyOption?.id ?? null,
          quickReplyLabel: quickReplyOption?.label ?? null,
          metadata: {
            context: 'support_inbox_reply',
            locale,
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error ?? `Reply failed with status ${response.status}`);
      }

      const result = await response.json();

      setReplyText('');
      await loadTickets();

      addToast({
        type: 'success',
        title: t('common.success'),
        message: result?.escalated
          ? tSupport('autoEscalated')
          : tSupport('replySubmit'),
      });
    } catch (error: any) {
      console.error('[SupportInbox] Reply error:', error);
      addToast({
        type: 'error',
        title: t('common.error'),
        message: error.message ?? 'Reply failed',
      });
    } finally {
      setIsReplyLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading') || 'Lädt...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{tSupport('title')}</h1>
            <p className="text-gray-600">{tSupport('subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={() => loadTickets()}>
              {tSupport('refresh')}
            </Button>
            <Button variant="primary" onClick={() => openTicket({ context: 'support_inbox' })}>
              {tSupport('openTicket')}
            </Button>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center max-w-3xl mx-auto">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{tSupport('emptyTitle')}</h2>
            <p className="text-gray-600 mb-6">{tSupport('emptyDescription')}</p>
            <Button variant="primary" size="lg" onClick={() => openTicket({ context: 'support_inbox_empty_state' })}>
              {tSupport('openTicket')}
            </Button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <div className="bg-white rounded-xl shadow">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{tSupport('lastUpdated')}</span>
                <span className="text-xs text-gray-500">{formatDateTime(new Date().toISOString())}</span>
              </div>
              <ul className="divide-y divide-gray-200">
                {tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      className={clsx(
                        'w-full px-4 py-3 text-left transition-colors',
                        selectedTicketId === ticket.id ? 'bg-brand-green/10 border-l-4 border-brand-green' : 'hover:bg-gray-50'
                      )}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{ticket.title}</h3>
                        <span
                          className={clsx(
                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold',
                            STATUS_STYLES[ticket.status] ?? 'bg-gray-200 text-gray-700'
                          )}
                        >
                          {tSupport(`status.${ticket.status}`)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>{ticket.category ?? t('common.actions')}</span>
                        <span>{formatDateTime(ticket.updated_at)}</span>
                      </div>
                      <div className="mt-1 text-xs">
                        <span className={PRIORITY_STYLES[ticket.priority] ?? 'text-gray-600'}>
                          {tSupport(`priority.${ticket.priority}`)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow flex flex-col">
              {selectedTicket ? (
                <>
                  <header className="px-6 py-5 border-b border-gray-200">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">{selectedTicket.title}</h2>
                        <p className="text-sm text-gray-600 mt-1">{selectedTicket.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span>
                            {tSupport('lastUpdated')}: {formatDateTime(selectedTicket.updated_at)}
                          </span>
                          <span>•</span>
                          <span>{tSupport(`priority.${selectedTicket.priority}`)}</span>
                          {selectedTicket.category && (
                            <>
                              <span>•</span>
                              <span>{selectedTicket.category}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={clsx(
                          'inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold',
                          STATUS_STYLES[selectedTicket.status] ?? 'bg-gray-200 text-gray-700'
                        )}
                      >
                        {tSupport(`status.${selectedTicket.status}`)}
                      </span>
                    </div>
                  </header>

                  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                    {visibleMessages.map((message) => (
                      <div key={message.id} className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-medium">
                            {message.author_type === 'customer'
                              ? message.author_name || tSupport('customerReply')
                              : message.author_name || tSupport('systemMessage')}
                          </span>
                          <span>•</span>
                          <span>{formatDateTime(message.created_at)}</span>
                          {message.internal_only && (
                            <>
                              <span>•</span>
                              <span className="uppercase tracking-wide text-amber-600 font-semibold">
                                {tSupport('internalOnly')}
                              </span>
                            </>
                          )}
                        </div>
                        <div
                          className={clsx(
                            'support-message-bubble rounded-lg px-4 py-3 border',
                            message.author_type === 'customer'
                              ? 'support-message-bubble--customer bg-brand-green/5 border-brand-green/40'
                              : message.author_type === 'support'
                              ? 'support-message-bubble--agent bg-blue-50 border-blue-200'
                              : 'support-message-bubble--system bg-gray-100 border-gray-200'
                          )}
                        >
                          <p className="support-message-text text-sm text-gray-800 whitespace-pre-wrap">
                            {message.message}
                          </p>

                          {message.quick_reply_options && message.quick_reply_options.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {message.quick_reply_options.map((option, index) => {
                                return (
                                  <Button
                                    key={option.id ?? `${message.id}-qr-${index}`}
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => handleQuickReply(option)}
                                  >
                                    {option.label}
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <footer className="border-t border-gray-200 px-6 py-5 space-y-6">
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        onClick={() => silentCheck('reloadPaymentStatus')}
                        isLoading={isLoadingSilentCheck}
                      >
                        {tSupport('actions.checkPayment')}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => silentCheck('checkDeployment')}
                        isLoading={isLoadingSilentCheck}
                      >
                        {tSupport('actions.checkDeployment')}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => silentCheck('traceUiError')}
                        isLoading={isLoadingSilentCheck}
                      >
                        {tSupport('actions.traceUi')}
                      </Button>
                    </div>

                    {isLoadingSilentCheck && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="inline-flex h-2 w-2 rounded-full bg-brand-green animate-pulse" />
                        {tSupport('silentCheck.running')}
                      </div>
                    )}

                    {silentCheckMessage && !isLoadingSilentCheck && (
                      <div className="text-sm text-gray-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        {silentCheckMessage}
                      </div>
                    )}

                    <div className="space-y-3">
                      <label htmlFor="support-reply" className="text-sm font-medium text-gray-700">
                        {tSupport('replyLabel')}
                      </label>
                      <textarea
                        id="support-reply"
                        value={replyText}
                        onChange={(event) => setReplyText(event.target.value)}
                        placeholder={tSupport('replyPlaceholder')}
                        className="w-full min-h-[120px] rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-green/40 focus:border-brand-green"
                      />
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/${locale}/resources`} className="text-sm text-gray-500 hover:text-brand-green">
                          {t('support.cta')}
                        </Link>
                        <Button variant="primary" onClick={() => handleReplySubmit()} isLoading={isReplyLoading}>
                          {tSupport('replySubmit')}
                        </Button>
                      </div>
                    </div>
                  </footer>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12">
                  <div className="text-5xl mb-4">📬</div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{tSupport('emptyTitle')}</h2>
                  <p className="text-gray-600 mb-6 max-w-md">{tSupport('emptyDescription')}</p>
                  <Button variant="primary" onClick={() => openTicket({ context: 'support_inbox_no_selection' })}>
                    {tSupport('openTicket')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

