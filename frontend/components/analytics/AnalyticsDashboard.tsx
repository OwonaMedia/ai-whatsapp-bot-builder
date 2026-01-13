'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Bot } from '@/types/bot';
import { format, subDays } from 'date-fns';
import HelpIcon, { HelpIconInline } from '@/components/ui/HelpIcon';

interface AnalyticsData {
  date: string;
  metric_type: string;
  metric_value: number;
}

interface AnalyticsDashboardProps {
  bot: Bot;
  analytics: AnalyticsData[];
  conversations: Array<{ id: string; status: string; created_at: string }>;
  messages: Array<{ id: string; direction: string; message_type: string; created_at: string }>;
}

export default function AnalyticsDashboard({
  bot,
  analytics,
  conversations,
  messages,
}: AnalyticsDashboardProps) {
  const t = useTranslations();
  const locale = useLocale();
  
  // Calculate stats (moved before handleExportCSV to fix undefined variable issue)
  const totalConversations = conversations.length;
  const activeConversations = conversations.filter((c) => c.status === 'active').length;
  const totalMessages = messages.length;
  const inboundMessages = messages.filter((m) => m.direction === 'inbound').length;
  const outboundMessages = messages.filter((m) => m.direction === 'outbound').length;
  
  // ✅ CSV Export Funktion
  const handleExportCSV = () => {
    // Erstelle CSV-Daten
    const csvRows: string[] = [];
    
    // Header
    csvRows.push('Datum,Gespräche,Nachrichten (Eingehend),Nachrichten (Ausgehend),Conversion Rate');
    
    // Tägliche Daten
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return format(date, 'yyyy-MM-dd');
    });
    
    last7Days.forEach((dateStr) => {
      const dayMessages = messages.filter(
        (m) => format(new Date(m.created_at), 'yyyy-MM-dd') === dateStr
      );
      const dayConversations = conversations.filter(
        (c) => format(new Date(c.created_at), 'yyyy-MM-dd') === dateStr
      );
      const inbound = dayMessages.filter((m) => m.direction === 'inbound').length;
      const outbound = dayMessages.filter((m) => m.direction === 'outbound').length;
      const conversion = dayConversations.length > 0
        ? Math.round((dayConversations.filter((c) => c.status === 'completed').length / dayConversations.length) * 100)
        : 0;
      
      csvRows.push(`${dateStr},${dayConversations.length},${inbound},${outbound},${conversion}%`);
    });
    
    // Gesamt-Statistiken
    csvRows.push('');
    csvRows.push('Metrik,Wert');
    csvRows.push(`Gesamt Gespräche,${totalConversations}`);
    csvRows.push(`Aktive Gespräche,${activeConversations}`);
    csvRows.push(`Gesamt Nachrichten,${totalMessages}`);
    csvRows.push(`Eingehend,${inboundMessages}`);
    csvRows.push(`Ausgehend,${outboundMessages}`);
    csvRows.push(`Conversion Rate,${totalConversations > 0 ? Math.round((activeConversations / totalConversations) * 100) : 0}%`);
    
    // Erstelle Blob und Download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics-${bot.name}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Daily stats (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), i)).reverse();
  const dailyStats = last7Days.map((date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayMessages = messages.filter(
      (m) => format(new Date(m.created_at), 'yyyy-MM-dd') === dateStr
    );
    const dayConversations = conversations.filter(
      (c) => format(new Date(c.created_at), 'yyyy-MM-dd') === dateStr
    );

    return {
      date: dateStr,
      messages: dayMessages.length,
      conversations: dayConversations.length,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">
                {bot.name} - Analytics
              </h1>
              <HelpIcon
                title="Analytics Dashboard"
                content="Das Analytics Dashboard zeigt Ihnen detaillierte Statistiken über die Performance Ihres Bots. Sie sehen Gespräche, Nachrichten, Conversion-Raten und tägliche Trends. Nutzen Sie diese Daten, um Ihren Bot zu optimieren und die Kundenzufriedenheit zu verbessern."
                size="md"
                position="bottom"
                docLink={`/${locale}/docs#analytics`}
              />
            </div>
            {/* ✅ Analytics Export Button */}
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-brand-green text-white rounded-lg hover:bg-brand-dark transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV Export
            </button>
          </div>
          <p className="text-gray-600">
            {t('analytics.overview') || 'Übersicht der Bot-Performance'}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 relative">
            <div className="absolute top-2 right-2">
              <HelpIcon
                title="Gespräche"
                content="Die Gesamtanzahl der Konversationen, die mit Ihrem Bot geführt wurden. Aktive Gespräche sind solche, die aktuell noch laufen."
                size="sm"
                position="bottom"
                docLink={`/${locale}/docs#analytics`}
              />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalConversations}</div>
            <div className="text-sm text-gray-600 mt-1">
              {t('bots.stats.conversations') || 'Gespräche'}
            </div>
            <div className="text-xs text-green-600 mt-2">
              {activeConversations} aktiv
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 relative">
            <div className="absolute top-2 right-2">
              <HelpIcon
                title="Nachrichten"
                content="Die Gesamtanzahl aller Nachrichten. Eingehende Nachrichten kommen von Kunden, ausgehende werden vom Bot gesendet."
                size="sm"
                position="bottom"
                docLink={`/${locale}/docs#analytics`}
              />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalMessages}</div>
            <div className="text-sm text-gray-600 mt-1">
              {t('bots.stats.messages') || 'Nachrichten'}
            </div>
            <div className="text-xs text-blue-600 mt-2">
              {inboundMessages} eingehend, {outboundMessages} ausgehend
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 relative">
            <div className="absolute top-2 right-2">
              <HelpIcon
                title="Conversion Rate"
                content="Der Prozentsatz der aktiven Gespräche im Verhältnis zur Gesamtzahl. Eine höhere Conversion Rate bedeutet, dass mehr Gespräche erfolgreich abgeschlossen werden."
                size="sm"
                position="bottom"
                docLink={`/${locale}/docs#analytics`}
              />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {totalConversations > 0
                ? Math.round((activeConversations / totalConversations) * 100)
                : 0}
              %
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {t('bots.stats.conversion') || 'Conversion'}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">
              {conversations.length > 0
                ? Math.round(
                    (conversations.filter((c) => c.status === 'completed').length /
                      conversations.length) *
                      100
                  )
                : 0}
              %
            </div>
            <div className="text-sm text-gray-600 mt-1">
              Completion Rate
            </div>
          </div>
        </div>

        {/* Daily Stats Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {t('analytics.dailyStats') || 'Aktivität der letzten 7 Tage'}
          </h2>
          <div className="space-y-4">
            {dailyStats.map((stat) => (
              <div key={stat.date} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-600">
                  {format(new Date(stat.date), 'dd.MM')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="bg-blue-500 h-4 rounded"
                      style={{
                        width: `${Math.max((stat.messages / Math.max(...dailyStats.map((s) => s.messages), 1)) * 100, 5)}%`,
                      }}
                    />
                    <span className="text-sm text-gray-700">
                      {stat.messages} {t('bots.stats.messages') || 'Nachrichten'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="bg-green-500 h-4 rounded"
                      style={{
                        width: `${Math.max((stat.conversations / Math.max(...dailyStats.map((s) => s.conversations), 1)) * 100, 5)}%`,
                      }}
                    />
                    <span className="text-sm text-gray-700">
                      {stat.conversations} {t('bots.stats.conversations') || 'Gespräche'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Types */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {t('analytics.messageTypes') || 'Nachrichtentypen'}
            </h2>
            <div className="space-y-2">
              {['text', 'image', 'video', 'document', 'template'].map((type) => {
                const count = messages.filter((m) => m.message_type === type).length;
                return (
                  <div key={type} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{type}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {t('analytics.conversationStatus') || 'Gesprächsstatus'}
            </h2>
            <div className="space-y-2">
              {['active', 'completed', 'blocked'].map((status) => {
                const count = conversations.filter((c) => c.status === status).length;
                return (
                  <div key={status} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{status}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

