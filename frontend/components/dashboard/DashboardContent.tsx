'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import HelpIcon, { HelpIconInline } from '@/components/ui/HelpIcon';
import OnboardingTour from '@/components/onboarding/OnboardingTour';
import { useSupportTicket } from '@/components/support/SupportTicketContext';
import { WhatsAppConnector } from '@/components/whatsapp/WhatsAppConnector';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Bot {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface DashboardContentProps {
  initialBots: Bot[];
  userEmail: string;
}

export default function DashboardContent({ initialBots, userEmail }: DashboardContentProps) {
  const { addToast } = useToast();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations();
  const tCommon = useTranslations('common');
  const tSupport = useTranslations('support');
  const [bots] = useState<Bot[]>(initialBots);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'paused' | 'archived'>('all');
  const { openTicket } = useSupportTicket();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [whatsappConnection, setWhatsappConnection] = useState<any>(null);

  // ✅ Prüfe ob Onboarding bereits abgeschlossen wurde
  useEffect(() => {
    const onboardingCompleted = localStorage.getItem('onboarding-completed');
    const isFirstVisit = initialBots.length === 0 && !onboardingCompleted;
    
    if (isFirstVisit) {
      // Warte kurz, damit die Seite geladen ist
      const timeoutId = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
    return undefined; // Explicit return for all code paths
  }, [initialBots.length]);

  // ✅ Onboarding-Schritte für Dashboard
  const onboardingSteps = [
    {
      target: 'h1',
      title: 'Willkommen im Dashboard!',
      content: 'Hier sehen Sie eine Übersicht aller Ihrer WhatsApp-Bots. Sie können neue Bots erstellen, bestehende verwalten und Statistiken einsehen.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-onboarding="create-bot"]',
      title: 'Ersten Bot erstellen',
      content: 'Klicken Sie hier, um Ihren ersten WhatsApp Bot zu erstellen. Sie können aus verschiedenen Vorlagen wählen oder von Grund auf beginnen.',
      placement: 'bottom' as const,
    },
    {
      target: '[data-onboarding="quick-stats"]',
      title: 'Quick Stats',
      content: 'Diese Karten zeigen Ihnen auf einen Blick wichtige Statistiken: Gesamtanzahl der Bots, aktive Bots, pausierte Bots und Entwürfe.',
      placement: 'top' as const,
    },
    {
      target: '[data-onboarding="bot-list"]',
      title: 'Ihre Bots',
      content: 'Hier sehen Sie alle Ihre Bots. Klicken Sie auf einen Bot, um ihn zu bearbeiten, Analytics anzuzeigen oder Einstellungen zu ändern.',
      placement: 'top' as const,
    },
  ];

  const statusOptions = useMemo(
    () => [
      { value: 'all', label: t('dashboard.filters.all') || 'All' },
      { value: 'active', label: t('bots.status.active') || 'Active' },
      { value: 'paused', label: t('bots.status.paused') || 'Paused' },
      { value: 'draft', label: t('bots.status.draft') || 'Draft' },
      { value: 'archived', label: t('bots.status.archived') || 'Archived' },
    ],
    [t]
  );

  const filteredBots = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return bots.filter((bot) => {
      const matchesStatus = statusFilter === 'all' || bot.status === statusFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        bot.name.toLowerCase().includes(normalizedSearch) ||
        (bot.description ?? '').toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [bots, searchTerm, statusFilter]);

  const recentBots = useMemo(() => {
    return [...bots]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [bots]);

  const handleSelectBotForWhatsApp = useCallback(
    (botId: string) => {
      setShowConnectModal(false);
      const target = `/${locale}/bots/${botId}?connect=whatsapp`;
      if (typeof window !== 'undefined') {
        window.location.href = target;
      } else {
        router.push(target);
      }
    },
    [router, locale],
  );

  const handleConnectWhatsApp = useCallback(() => {
    if (bots.length === 0) {
      addToast({
        type: 'info',
        title: t('dashboard.quickActions.items.connect.title'),
        message: t('dashboard.quickActions.connectModal.noBots'),
      });
      const target = `/${locale}/bots/new?source=dashboard-whatsapp`;
      if (typeof window !== 'undefined') {
        window.location.href = target;
      } else {
        router.push(target);
      }
      return;
    }

    if (bots.length === 1 && bots[0]) {
      const target = `/${locale}/bots/${bots[0].id}?connect=whatsapp`;
      if (typeof window !== 'undefined') {
        window.location.href = target;
      } else {
        router.push(target);
      }
      return;
    }

    setShowConnectModal(true);
  }, [bots, addToast, router, locale, t]);

  const quickActions = useMemo(
    () => [
      {
        id: 'create',
        title: t('dashboard.quickActions.items.create.title'),
        description: t('dashboard.quickActions.items.create.description'),
        href: `/${locale}/bots/new`,
        icon: '🚀',
      },
      {
        id: 'connect',
        title: t('dashboard.quickActions.items.connect.title'),
        description: t('dashboard.quickActions.items.connect.description'),
        onClick: handleConnectWhatsApp,
        icon: '🔗',
      },
      {
        id: 'templates',
        title: t('dashboard.quickActions.items.templates.title'),
        description: t('dashboard.quickActions.items.templates.description'),
        href: `/${locale}/templates`,
        icon: '📚',
      },
    ],
    [locale, t, handleConnectWhatsApp]
  );

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-red-100 text-red-800',
    };

    const labels = {
      draft: t('bots.status.draft'),
      active: t('bots.status.active'),
      paused: t('bots.status.paused'),
      archived: t('bots.status.archived'),
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${
          variants[status as keyof typeof variants] || variants.draft
        }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const hasBots = bots.length > 0;
  const hasFiltersApplied = statusFilter !== 'all' || searchTerm.trim().length > 0;
  const visibleBots = filteredBots;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* ✅ Onboarding Tour */}
        <OnboardingTour
          run={showOnboarding}
          onComplete={() => {
            setShowOnboarding(false);
            localStorage.setItem('onboarding-completed', 'true');
          }}
          steps={onboardingSteps}
        />

        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-4xl font-bold">
                  {t('dashboard.title') || 'Dashboard'}
                </h1>
                <HelpIcon
                  title="Dashboard Übersicht"
                  content="Ihr Dashboard zeigt eine Übersicht aller Ihrer WhatsApp-Bots. Hier können Sie neue Bots erstellen, bestehende verwalten und Statistiken einsehen."
                  size="md"
                  position="bottom"
                  docLink={`/${locale}/docs#dashboard`}
                />
              </div>
              <p className="text-white/95 mb-1">
                {t('dashboard.welcome') || 'Willkommen'}, <span className="font-semibold">{userEmail}</span>
              </p>
              <p className="text-white/80 text-sm">
                {t('dashboard.yourBots') || 'Verwalten Sie Ihre WhatsApp Bots'}
              </p>
              </div>
            <div className="hidden md:block">
              <div className="text-7xl">🤖</div>
            </div>
          </div>
        </div>

        {/* WhatsApp Connection */}
        {!whatsappConnection && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className="text-2xl">📱</span>
                WhatsApp Business verbinden
              </h2>
              <p className="text-green-50 mt-1 text-sm">
                Verbinden Sie Ihre WhatsApp Business Nummer, um Bots zu erstellen
              </p>
            </div>
            <div className="p-6">
              <WhatsAppConnector
                onConnected={(connection) => {
                  setWhatsappConnection(connection);
                  addToast({
                    type: 'success',
                    title: 'WhatsApp verbunden!',
                    message: 'Ihre WhatsApp Business Nummer wurde erfolgreich verbunden.',
                  });
                }}
              />
            </div>
          </div>
        )}

        {/* Quick Actions */}
        {hasBots && (
          <div className="grid gap-4 md:grid-cols-3" data-onboarding="quick-actions">
            {quickActions.map((action) => {
              const card = (
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-200 h-full">
                  <div className="text-4xl mb-3">{action.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-2">{action.description}</p>
                </div>
              );

            if ('href' in action && action.href) {
              return (
                <Link key={action.id} href={action.href} className="group block focus:outline-none">
                  {card}
                </Link>
              );
            }

            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-lg"
              >
                {card}
              </button>
            );
          })}
        </div>
      )}

        {/* Quick Stats */}
        {hasBots && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-onboarding="quick-stats">
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-600 relative hover:shadow-md transition-shadow">
              <div className="absolute top-3 right-3">
                <HelpIcon
                  title="Gesamt Bots"
                  content="Die Gesamtanzahl aller Bots, die Sie erstellt haben, unabhängig vom Status."
                  size="sm"
                  position="bottom"
                  docLink={`/${locale}/docs#dashboard`}
                />
              </div>
              <div className="text-3xl font-bold text-gray-900">{bots.length}</div>
              <div className="text-sm text-gray-600 mt-1">Gesamt Bots</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500 relative hover:shadow-md transition-shadow">
              <div className="absolute top-3 right-3">
                <HelpIcon
                  title="Aktive Bots"
                  content="Bots, die aktuell aktiv sind und WhatsApp-Nachrichten empfangen und senden können."
                  size="sm"
                  position="bottom"
                  docLink={`/${locale}/docs#dashboard`}
                />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {bots.filter((b) => b.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Aktive Bots</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-yellow-500 relative hover:shadow-md transition-shadow">
              <div className="absolute top-3 right-3">
                <HelpIcon
                  title="Pausierte Bots"
                  content="Bots, die temporär pausiert wurden. Sie können jederzeit wieder aktiviert werden."
                  size="sm"
                  position="bottom"
                  docLink={`/${locale}/docs#dashboard`}
                />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {bots.filter((b) => b.status === 'paused').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Pausierte Bots</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-gray-400 relative hover:shadow-md transition-shadow">
              <div className="absolute top-3 right-3">
                <HelpIcon
                  title="Entwürfe"
                  content="Bots, die noch nicht veröffentlicht wurden und sich im Aufbau befinden."
                  size="sm"
                  position="bottom"
                  docLink={`/${locale}/docs#dashboard`}
                />
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {bots.filter((b) => b.status === 'draft').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Entwürfe</div>
            </div>
          </div>
        )}

      {/* Actions Bar */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900" data-onboarding="bot-list">
              {t('dashboard.yourBots') || 'Ihre Bots'}
            </h2>
            <p className="text-sm text-gray-600">
              {t('dashboard.botCount', { count: visibleBots.length })}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <label htmlFor="dashboard-bot-search" className="sr-only">
                {tCommon('search')}
              </label>
              <input
                id="dashboard-bot-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t('dashboard.searchPlaceholder') || `${tCommon('search')}...`}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-brand-green"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={statusFilter === option.value ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setStatusFilter(option.value as typeof statusFilter)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => openTicket({ context: 'dashboard', extra: { searchTerm, statusFilter } })}
            >
              {tSupport('cta')}
            </Button>
            <Link href={`/${locale}/bots/new`} className="md:ml-2">
              <Button variant="primary" data-onboarding="create-bot">
                <span className="mr-2">+</span>
                {t('bots.create.title') || 'Neuen Bot erstellen'}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Bots List */}
      {bots.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="text-7xl mb-6">🤖</div>
          <h3 className="text-2xl font-semibold mb-3 text-gray-900">
            {t('dashboard.noBots') || 'Noch keine Bots'}
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {t('dashboard.noBotsDescription') || 'Erstellen Sie Ihren ersten WhatsApp Bot mit unserem intuitiven Drag-and-Drop Builder.'}
          </p>
          
          {/* ✅ Empty State CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href={`/${locale}/bots/new`}>
              <Button variant="primary" size="lg">
                <span className="mr-2">+</span>
                {t('bots.create.title') || 'Neuen Bot erstellen'}
              </Button>
            </Link>
            <Link href={`/${locale}/demo/dashboard`}>
              <Button variant="outline" size="lg">
                <span className="mr-2">👀</span>
                Demo ansehen
              </Button>
            </Link>
            <Button
              variant="outline"
              size="lg"
              onClick={() => openTicket({ context: 'dashboard_empty_state' })}
            >
              {tSupport('cta')}
            </Button>
          </div>
          
          {/* ✅ Template-Vorschau */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-700">
                Oder starten Sie mit einer Vorlage:
              </p>
              <Link href={`/${locale}/templates`}>
                <Button variant="outline" size="sm">
                  Alle Vorlagen ansehen →
                </Button>
              </Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <Link href={`/${locale}/bots/new?template=customer-service`}>
                <div className="p-4 border border-gray-200 rounded-lg hover:border-brand-green transition-colors cursor-pointer">
                  <div className="text-3xl mb-2">💬</div>
                  <div className="text-sm font-semibold text-gray-900">Kundenservice</div>
                  <div className="text-xs text-gray-500 mt-1">Support-Bot</div>
                </div>
              </Link>
              <Link href={`/${locale}/bots/new?template=e-commerce`}>
                <div className="p-4 border border-gray-200 rounded-lg hover:border-brand-green transition-colors cursor-pointer">
                  <div className="text-3xl mb-2">🛒</div>
                  <div className="text-sm font-semibold text-gray-900">E-Commerce</div>
                  <div className="text-xs text-gray-500 mt-1">Bestellungen</div>
                </div>
              </Link>
              <Link href={`/${locale}/bots/new?template=booking`}>
                <div className="p-4 border border-gray-200 rounded-lg hover:border-brand-green transition-colors cursor-pointer">
                  <div className="text-3xl mb-2">📅</div>
                  <div className="text-sm font-semibold text-gray-900">Buchungen</div>
                  <div className="text-xs text-gray-500 mt-1">Termine</div>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Quick Start Guide */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              So starten Sie:
            </h4>
            <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto text-left">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">1️⃣</div>
                <h5 className="font-semibold mb-1">Bot erstellen</h5>
                <p className="text-sm text-gray-600">
                  Erstellen Sie einen neuen Bot und geben Sie ihm einen Namen
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">2️⃣</div>
                <h5 className="font-semibold mb-1">Flow bauen</h5>
                <p className="text-sm text-gray-600">
                  Nutzen Sie den visuellen Builder um Ihren Bot-Flow zu erstellen
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl mb-2">3️⃣</div>
                <h5 className="font-semibold mb-1">WhatsApp verbinden</h5>
                <p className="text-sm text-gray-600">
                  Verbinden Sie Ihren Bot mit WhatsApp Business API
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : hasFiltersApplied && visibleBots.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-10 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('dashboard.noFilteredBots')}
          </h3>
          <p className="text-gray-600 mb-6">{t('dashboard.noBotsDescription')}</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
          >
            {t('dashboard.resetFilters')}
          </Button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleBots.map((bot) => (
            <div
              key={bot.id}
              className="bg-white rounded-lg shadow hover:shadow-xl transition-all duration-200 border border-gray-100 overflow-hidden group"
            >
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-brand-green transition-colors">
                    {bot.name}
                  </h3>
                  {getStatusBadge(bot.status)}
                </div>
                
                {bot.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {bot.description}
                  </p>
                )}

                {/* Created Date */}
                <div className="text-xs text-gray-500">
                  Erstellt: {new Date(bot.created_at).toLocaleDateString('de-DE')}
                </div>
              </div>

              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                <Link href={`/${locale}/bots/${bot.id}`} className="flex-1">
                  <Button variant="primary" size="sm" className="w-full">
                    Öffnen
                  </Button>
                </Link>
                <Link href={`/${locale}/bots/${bot.id}`}>
                  <Button variant="outline" size="sm">
                    ⚙️
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      {hasBots && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {t('dashboard.recentActivity.title')}
            </h3>
            <span className="text-sm text-gray-500">{t('dashboard.botCount', { count: bots.length })}</span>
          </div>
          {recentBots.length === 0 ? (
            <p className="text-sm text-gray-600">{t('dashboard.recentActivity.empty')}</p>
          ) : (
            <ul className="space-y-3">
              {recentBots.map((bot) => (
                <li key={`recent-${bot.id}`} className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-brand-green transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🗓️</span>
                      <Link
                        href={`/${locale}/bots/${bot.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-brand-green transition-colors"
                      >
                        {bot.name}
                      </Link>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('dashboard.recentActivity.createdOn', {
                        date: new Date(bot.created_at).toLocaleDateString(locale),
                      })}
                    </p>
                  </div>
                  {getStatusBadge(bot.status)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-xl font-semibold text-gray-900">
                {t('dashboard.quickActions.connectModal.title')}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {t('dashboard.quickActions.connectModal.description')}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {t('dashboard.quickActions.connectModal.helper')}
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto px-6 py-4 space-y-3">
              {bots.map((bot) => (
                <div
                  key={`connect-${bot.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-4 hover:border-green-500 transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">{bot.name}</h4>
                    <p className="text-xs text-gray-500">
                      {bot.description || t('bots.status.' + bot.status) || 'Keine Beschreibung'}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(bot.created_at).toLocaleDateString(locale, {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSelectBotForWhatsApp(bot.id)}
                  >
                    {t('dashboard.quickActions.connectModal.connect')}
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button variant="outline" onClick={() => setShowConnectModal(false)}>
                {t('dashboard.quickActions.connectModal.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}

