'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { Bot } from '@/types/bot';
import BotBuilder from '@/components/bot-builder/BotBuilder';
import { createClient } from '@/lib/supabase';
import CompliancePanel from '@/components/compliance/CompliancePanel';
import ComplianceBadge from '@/components/compliance/ComplianceBadge';
import { ComplianceCheck } from '@/lib/compliance/checker';
import TemplateSelector from '@/components/templates/TemplateSelector';
import WhatsAppSetupWizard from '@/components/bots/WhatsAppSetupWizard';
import EmbedCodeGenerator from '@/components/widget/EmbedCodeGenerator';

interface BotDetailProps {
  bot: Bot;
  initialFlow?: any;
}

export default function BotDetail({ bot, initialFlow }: BotDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const t = useTranslations();
  const locale = useLocale();
  // ✅ Fix Hydration: Warte bis Client-seitig gerendert
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'overview' | 'builder' | 'settings' | 'embed'>('overview');
  const [isDeleting, setIsDeleting] = useState(false);
  const [compliance, setCompliance] = useState<ComplianceCheck | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showWhatsAppSetup, setShowWhatsAppSetup] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<any>(null);

  // ✅ Fix Hydration: Initialisiere nur client-seitig
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
      if (initialFlow) {
        setCurrentFlow(initialFlow);
      }
      loadCompliance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot.id]);

  useEffect(() => {
    if (!mounted) return;
    const connectParam = searchParams?.get('connect');
    if (connectParam === 'whatsapp' && !showWhatsAppSetup) {
      setShowWhatsAppSetup(true);
      router.replace(`/${locale}/bots/${bot.id}`, { scroll: false });
    }
  }, [mounted, searchParams, router, locale, bot.id, showWhatsAppSetup]);

  const loadCompliance = async () => {
    try {
      const response = await fetch(`/api/bots/${bot.id}/compliance`, {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        setCompliance(data);
      } else if (response.status === 401) {
        // ✅ 401 ist OK - Benutzer ist möglicherweise nicht eingeloggt (z.B. in Demo)
        console.log('Compliance check skipped: User not authenticated');
        setCompliance(null);
      }
    } catch (error) {
      // ✅ Fehler stillschweigend behandeln (nicht kritisch)
      console.error('Error loading compliance:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Möchten Sie diesen Bot wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    setIsDeleting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', bot.id);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Bot gelöscht',
        message: 'Der Bot wurde erfolgreich gelöscht.',
      });

      router.push('/dashboard');
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message || 'Bot konnte nicht gelöscht werden.',
      });
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = bot.status === 'active' ? 'paused' : 'active';

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('bots')
        .update({ status: newStatus })
        .eq('id', bot.id);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Status geändert',
        message: `Bot ist jetzt ${newStatus === 'active' ? 'aktiv' : 'pausiert'}.`,
      });

      router.refresh();
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message || 'Status konnte nicht geändert werden.',
      });
    }
  };

  // ✅ Fix Hydration: Rendere nichts bis mounted (verhindert SSR/Client Mismatch)
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Lade...</div>
        </div>
      </div>
    );
  }

  if (view === 'builder') {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{bot.name}</h1>
            <p className="text-gray-600">Bot-Builder</p>
          </div>
          <Button variant="outline" onClick={() => setView('overview')}>
            Zur Übersicht
          </Button>
        </div>
        <BotBuilder 
          mode="edit" 
          botId={bot.id}
          bot={bot}
          initialFlow={currentFlow?.flow_data || initialFlow?.flow_data}
          onFlowChange={(flow) => {
            setCurrentFlow({ ...currentFlow, flow_data: flow });
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{bot.name}</h1>
          <p className="text-gray-600">{bot.description || 'Keine Beschreibung'}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={bot.status === 'active' ? 'danger' : 'primary'}
            onClick={handleToggleStatus}
          >
            {bot.status === 'active' ? 'Pausieren' : 'Aktivieren'}
          </Button>
          <Button variant="outline" onClick={() => setView('builder')}>
            Bot bearbeiten
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-4 flex-wrap">
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            bot.status === 'active'
              ? 'bg-green-100 text-green-800'
              : bot.status === 'paused'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {bot.status === 'active' ? 'Aktiv' : bot.status === 'paused' ? 'Pausiert' : 'Entwurf'}
        </span>
        {compliance && <ComplianceBadge compliance={compliance} size="sm" />}
      </div>

      {/* Compliance Panel */}
      {view === 'overview' && (
        <CompliancePanel botId={bot.id} currentUseCase={bot.use_case} />
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-gray-900">0</div>
          <div className="text-sm text-gray-600">Gespräche</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-gray-900">0</div>
          <div className="text-sm text-gray-600">Nachrichten</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-2xl font-bold text-gray-900">0%</div>
          <div className="text-sm text-gray-600">Conversion</div>
        </div>
      </div>

      {/* Embed Code Generator */}
      {view === 'embed' && (
        <div className="bg-white rounded-lg shadow p-6">
          <EmbedCodeGenerator botId={bot.id} botName={bot.name} />
        </div>
      )}

      {/* WhatsApp Setup */}
      {view === 'settings' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">
            WhatsApp Business API Setup
          </h2>
          <div className="space-y-4">
            {((bot.bot_config?.whatsapp as { phone_number_id?: string })?.phone_number_id) ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-green-900">✅ WhatsApp ist konfiguriert</p>
                    <p className="text-sm text-green-700 mt-1">
                      Phone Number ID: {(bot.bot_config?.whatsapp as { phone_number_id?: string })?.phone_number_id}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWhatsAppSetup(true)}
                  >
                    Bearbeiten
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="font-semibold text-amber-900 mb-2">
                  ⚠️ WhatsApp Business API nicht konfiguriert
                </p>
                <p className="text-sm text-amber-800 mb-4">
                  Verbinden Sie Ihren Bot mit WhatsApp Business API, um Nachrichten zu senden und zu empfangen.
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowWhatsAppSetup(true)}
                >
                  WhatsApp Setup starten
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          {t('common.actions') || 'Aktionen'}
        </h2>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setView('builder')}>
            {t('bots.edit')}
          </Button>
          <Link href={`/${locale}/bots/${bot.id}/analytics`}>
            <Button variant="outline">
              {t('analytics.overview') || 'Analytics'}
            </Button>
          </Link>
          <Link href={`/${locale}/bots/${bot.id}/knowledge`}>
            <Button variant="outline">
              {t('knowledge.title') || 'Wissensquellen'}
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setView('embed')}>
            {t('embed.title') || 'Bot einbinden'}
          </Button>
          <Button variant="outline" onClick={() => setView('settings')}>
            {t('bots.settings') || 'Einstellungen'}
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            {t('bots.delete')}
          </Button>
        </div>
      </div>

      {/* WhatsApp Setup Wizard Modal */}
      {showWhatsAppSetup && (
        <WhatsAppSetupWizard
          bot={bot}
          onComplete={() => {
            setShowWhatsAppSetup(false);
            router.refresh();
          }}
          onClose={() => setShowWhatsAppSetup(false)}
        />
      )}
    </div>
  );
}

