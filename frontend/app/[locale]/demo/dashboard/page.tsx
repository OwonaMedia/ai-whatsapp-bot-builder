'use client';
export const dynamic = 'force-dynamic';


/**
 * DEMO-SEITE: Dashboard
 * Voll funktionsfähiger Demo-Modus mit ECHTEN Daten aus Supabase
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase';
import { Bot } from '@/types/bot';

export default function DashboardDemoPage() {
  const t = useTranslations();
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBots: 0,
    totalConversations: 0,
    totalMessages: 0,
    avgConversion: '0%',
  });

  // Demo-User-ID: Gleiche wie im BotBuilder
  const DEMO_USER_ID = 'demo-user-demo-mode-12345';

  useEffect(() => {
    loadDemoBots();
  }, []);

  const loadDemoBots = async () => {
    try {
      const supabase = createClient();
      
      // Lade alle Demo-Bots aus Supabase (user_id = DEMO_USER_ID oder is_demo = true)
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .or(`user_id.eq.${DEMO_USER_ID},is_demo.eq.true`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading demo bots:', error);
        // Fallback: Verwende leeres Array
        setBots([]);
        setLoading(false);
        return;
      }

      if (data) {
        setBots(data as Bot[]);
        
        // Berechne Statistiken
        const totalBots = data.length;
        // Für Demo: Verwende Platzhalter-Werte oder echte Daten wenn verfügbar
        const totalConversations = data.reduce((sum: number, bot: Bot) => sum + (bot.conversation_count || 0), 0);
        const totalMessages = data.reduce((sum: number, bot: Bot) => sum + (bot.message_count || 0), 0);
        const avgConversion = totalBots > 0 
          ? ((totalConversations / Math.max(totalMessages, 1)) * 100).toFixed(1) + '%'
          : '0%';
        
        setStats({
          totalBots,
          totalConversations,
          totalMessages,
          avgConversion,
        });
      }
    } catch (err) {
      console.error('Error loading demo bots:', err);
      setBots([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-3 py-1 text-xs font-semibold rounded-full ${
          variants[status as keyof typeof variants] || variants.draft
        }`}
      >
        {status === 'active' ? 'Aktiv' : 'Entwurf'}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Demo Mode Banner */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🎭</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">
                Demo-Modus: Alle Funktionen sind aktiv, verwenden aber Demo-Daten. 
                <Link href={`/${locale}/auth/signup`} className="ml-2 underline font-semibold">
                  Jetzt kostenlos registrieren für echte Daten →
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-brand-green to-brand-dark rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
              <p className="text-white/90 mb-1">
                Willkommen, <span className="font-semibold">demo@example.com</span>
              </p>
              <p className="text-white/80 text-sm">
                Verwalten Sie Ihre WhatsApp Bots
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-6xl opacity-20">🤖</div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-brand-green">
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loading ? '...' : stats.totalBots}
            </div>
            <div className="text-sm text-gray-600">Aktive Bots</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loading ? '...' : stats.totalConversations.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Gespräche</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loading ? '...' : stats.totalMessages.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Nachrichten</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {loading ? '...' : stats.avgConversion}
            </div>
            <div className="text-sm text-gray-600">Conversion Rate</div>
          </div>
        </div>

        {/* Bots Grid */}
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Ihre Bots</h2>
          <Link href={`/${locale}/demo/bot-builder`}>
            <Button variant="primary" size="md">
              + Neuen Bot erstellen
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto mb-4"></div>
              <p className="text-gray-600">Lade Demo-Bots...</p>
            </div>
          </div>
        ) : bots.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4 opacity-50">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Noch keine Demo-Bots</h3>
            <p className="text-gray-600 mb-6">
              Erstellen Sie Ihren ersten Bot im Demo-Modus
            </p>
            <Link href={`/${locale}/demo/bot-builder`}>
              <Button variant="primary">+ Neuen Bot erstellen</Button>
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{bot.name || 'Unbenannter Bot'}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {bot.description || 'Keine Beschreibung'}
                    </p>
                  </div>
                  {getStatusBadge(bot.status || 'draft')}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-xl font-bold text-gray-900">
                      {(bot.conversation_count || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Gespräche</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900">
                      {(bot.message_count || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Nachrichten</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900">
                      {bot.conversation_count && bot.message_count
                        ? ((bot.conversation_count / bot.message_count) * 100).toFixed(1) + '%'
                        : '0%'}
                    </div>
                    <div className="text-xs text-gray-500">Conversion</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/${locale}/demo/bot-builder?botId=${bot.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Bearbeiten
                    </Button>
                  </Link>
                  <Link href={`/${locale}/demo/analytics?botId=${bot.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Analytics
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


