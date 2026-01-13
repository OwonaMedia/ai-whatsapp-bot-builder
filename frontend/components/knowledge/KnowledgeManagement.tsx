'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Bot } from '@/types/bot';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase';
import WidgetCodeGenerator from '@/components/widget/WidgetCodeGenerator';
import { normalizeURL } from '@/lib/utils/urlNormalizer';
import HelpIcon, { HelpIconInline } from '@/components/ui/HelpIcon';

interface KnowledgeSource {
  id: string;
  user_id: string;
  bot_id?: string;
  name: string;
  type: 'pdf' | 'url' | 'text';
  source_url?: string;
  file_path?: string;
  content?: string; // For text sources
  status: 'processing' | 'ready' | 'error';
  created_at: string;
  updated_at: string;
}

interface KnowledgeManagementProps {
  bot: Bot;
  initialSources: KnowledgeSource[];
}

export default function KnowledgeManagement({ bot, initialSources }: KnowledgeManagementProps) {
  const t = useTranslations();
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const { addToast } = useToast();
  const [sources, setSources] = useState<KnowledgeSource[]>(initialSources);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [isAddingText, setIsAddingText] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'sources' | 'integrations'>('sources');

  useEffect(() => {
    // Poll for status updates
    const interval = setInterval(loadSources, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSources = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('knowledge_sources')
      .select('*')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setSources(data);
    }
  };

  const handleUploadPDF = async (file: File) => {
    setIsUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('botId', bot.id);

      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSources((prev) => [data.source, ...prev]);
        addToast({
          type: 'success',
          title: tCommon('success'),
          message: 'PDF wird hochgeladen und verarbeitet...',
        });
        setTimeout(loadSources, 2000);
      } else {
        const errorData = await response.json();
        addToast({
          type: 'error',
          title: tCommon('error'),
          message: errorData.error || 'Fehler beim Hochladen der PDF.',
        });
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: 'Ein unerwarteter Fehler ist aufgetreten.',
      });
    } finally {
      setIsUploadingPdf(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddURL = async () => {
    if (!urlInput.trim()) {
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: 'Bitte geben Sie eine gültige URL ein.',
      });
      return;
    }

    // ✅ Normalisiere URL (akzeptiert verschiedene Formate)
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeURL(urlInput.trim());
    } catch (error: any) {
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: error.message || 'Bitte geben Sie eine gültige URL ein (z.B. example.com, www.example.com, https://example.com)',
      });
      return;
    }

    setIsAddingUrl(true);
    try {
      const response = await fetch('/api/knowledge/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl, botId: bot.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setSources((prev) => [data.source, ...prev]);
        setUrlInput('');
        addToast({
          type: 'success',
          title: tCommon('success'),
          message: 'URL wird verarbeitet...',
        });
        setTimeout(loadSources, 2000);
      } else {
        const errorData = await response.json();
        addToast({
          type: 'error',
          title: tCommon('error'),
          message: errorData.error || 'Fehler beim Hinzufügen der URL.',
        });
      }
    } catch (error) {
      console.error('Error adding URL:', error);
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: 'Ein unerwarteter Fehler ist aufgetreten.',
      });
    } finally {
      setIsAddingUrl(false);
    }
  };

  const handleAddText = async () => {
    if (!textTitle.trim() || !textInput.trim()) {
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: 'Bitte geben Sie Titel und Text ein.',
      });
      return;
    }

    setIsAddingText(true);
    try {
      const response = await fetch('/api/knowledge/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: textTitle,
          content: textInput,
          botId: bot.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSources((prev) => [data.source, ...prev]);
        setTextTitle('');
        setTextInput('');
        addToast({
          type: 'success',
          title: tCommon('success'),
          message: 'Text wird verarbeitet...',
        });
        setTimeout(loadSources, 2000);
      } else {
        const errorData = await response.json();
        addToast({
          type: 'error',
          title: tCommon('error'),
          message: errorData.error || 'Fehler beim Hinzufügen des Textes.',
        });
      }
    } catch (error) {
      console.error('Error adding text:', error);
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: 'Ein unerwarteter Fehler ist aufgetreten.',
      });
    } finally {
      setIsAddingText(false);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    try {
      // ✅ DELETE-Route funktioniert jetzt auch ohne Body für authentifizierte Benutzer
      const response = await fetch(`/api/knowledge/sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSources((prev) => prev.filter((s) => s.id !== sourceId));
        addToast({
          type: 'success',
          title: tCommon('success'),
          message: 'Quelle erfolgreich gelöscht.',
        });
      } else {
        const errorData = await response.json();
        addToast({
          type: 'error',
          title: tCommon('error'),
          message: errorData.error || 'Fehler beim Löschen der Quelle.',
        });
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      addToast({
        type: 'error',
        title: tCommon('error'),
        message: 'Ein unerwarteter Fehler ist aufgetreten.',
      });
    }
  };

  const readySourcesCount = sources.filter((s) => s.status === 'ready').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              {bot.name} - {t('knowledge.title') || 'Wissensquellen'}
            </h1>
            <HelpIcon
              title="Wissensquellen"
              content="Wissensquellen ermöglichen es Ihrem Bot, auf spezifische Informationen zuzugreifen. Sie können PDFs hochladen, URLs hinzufügen oder Texte direkt eingeben. Der Bot nutzt diese Informationen, um präzisere Antworten zu geben. Die Quellen werden automatisch verarbeitet und für die Bot-Antworten verwendet."
              size="md"
              position="bottom"
              docLink={`/${locale}/docs#knowledge`}
            />
          </div>
          <p className="text-gray-600">
            {t('knowledge.description') ||
              'Fügen Sie Wissensquellen hinzu, die Ihr Bot nutzen kann.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-4 py-2 font-medium border-b-2 ${
                activeTab === 'sources'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('knowledge.sources') || 'Wissensquellen'}
            </button>
            <button
              onClick={() => setActiveTab('integrations')}
              className={`px-4 py-2 font-medium border-b-2 ${
                activeTab === 'integrations'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('knowledge.integrations') || 'Integrationen'}
            </button>
          </div>
        </div>

        {activeTab === 'sources' ? (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-gray-900">{sources.length}</div>
                <div className="text-sm text-gray-600">
                  {t('knowledge.totalSources') || 'Gesamt'}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-green-600">{readySourcesCount}</div>
                <div className="text-sm text-gray-600">
                  {t('knowledge.ready') || 'Bereit'}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {sources.filter((s) => s.status === 'processing').length}
                </div>
                <div className="text-sm text-gray-600">
                  {t('knowledge.processing') || 'In Verarbeitung'}
                </div>
              </div>
            </div>

            {/* Add Sources */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold">
                  {t('knowledge.addSource') || 'Wissensquelle hinzufügen'}
                </h2>
                <HelpIcon
                  title="Wissensquelle hinzufügen"
                  content="Fügen Sie verschiedene Wissensquellen hinzu, damit Ihr Bot präzise Antworten geben kann. Sie können PDFs hochladen, URLs hinzufügen oder Texte direkt eingeben. Alle Quellen werden automatisch verarbeitet und für die Bot-Antworten verwendet."
                  size="sm"
                  position="bottom"
                  docLink={`/${locale}/docs#knowledge`}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {/* PDF Upload */}
                <div className="border border-gray-200 rounded-lg p-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">📄 PDF hochladen</h3>
                    <HelpIcon
                      title="PDF hochladen"
                      content="Laden Sie PDF-Dokumente hoch, die Ihr Bot als Wissensquelle nutzen kann. Unterstützte Formate: PDF. Die Datei wird automatisch verarbeitet und in durchsuchbare Textabschnitte aufgeteilt. Maximale Dateigröße: 10 MB."
                      size="sm"
                      position="bottom"
                      docLink={`/${locale}/docs#knowledge`}
                    />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadPDF(file);
                    }}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={isUploadingPdf}
                    className="w-full"
                  >
                    PDF auswählen
                  </Button>
                </div>

                {/* URL */}
                <div className="border border-gray-200 rounded-lg p-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">🔗 URL hinzufügen</h3>
                    <HelpIcon
                      title="URL hinzufügen"
                      content="Fügen Sie eine Website-URL hinzu. Der Bot wird den Inhalt der Seite extrahieren und als Wissensquelle nutzen. Sie können verschiedene URL-Formate eingeben (z.B. example.com, www.example.com, https://example.com). Die URL wird automatisch normalisiert."
                      size="sm"
                      position="bottom"
                      docLink={`/${locale}/docs#knowledge`}
                    />
                  </div>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddURL()}
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddURL}
                    isLoading={isAddingUrl}
                    className="w-full"
                  >
                    Hinzufügen
                  </Button>
                </div>

                {/* Text */}
                <div className="border border-gray-200 rounded-lg p-4 relative">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">📝 Text eingeben</h3>
                    <HelpIcon
                      title="Text eingeben"
                      content="Geben Sie Text direkt ein, der als Wissensquelle verwendet werden soll. Geben Sie einen Titel und den Textinhalt ein. Der Text wird automatisch verarbeitet und für die Bot-Antworten verfügbar gemacht."
                      size="sm"
                      position="bottom"
                      docLink={`/${locale}/docs#knowledge`}
                    />
                  </div>
                  <input
                    type="text"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    placeholder="Titel..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm"
                  />
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Text..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm"
                  />
                  <Button
                    variant="outline"
                    onClick={handleAddText}
                    isLoading={isAddingText}
                    className="w-full"
                  >
                    Hinzufügen
                  </Button>
                </div>
              </div>
            </div>

            {/* Sources List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t('knowledge.yourSources') || 'Ihre Wissensquellen'}
              </h2>

              {sources.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>{t('knowledge.noSources') || 'Noch keine Quellen hinzugefügt.'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">
                            {source.type === 'pdf' && '📄'}
                            {source.type === 'url' && '🔗'}
                            {source.type === 'text' && '📝'}
                          </span>
                          <span className="font-medium truncate">{source.name}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {source.status === 'processing' && '⏳ Verarbeitung...'}
                          {source.status === 'ready' && '✅ Bereit'}
                          {source.status === 'error' && '❌ Fehler'}
                          {source.type === 'url' && source.source_url && (
                            <span className="ml-2 text-xs">({source.source_url})</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="ml-4 text-red-500 hover:text-red-700 px-2"
                      >
                        {tCommon('delete') || 'Löschen'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              {t('knowledge.integrationTitle') || 'Bot-Integrationen'}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('knowledge.integrationDescription') ||
                'Integrieren Sie Ihren Bot auf verschiedenen Plattformen.'}
            </p>

            {/* Integration Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Webhook Integration */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">🔗 Webhook Integration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Senden Sie Messages an Ihren Bot via Webhook
                </p>
                <div className="bg-gray-50 rounded p-3 mb-4 font-mono text-xs break-all">
                  POST {typeof window !== 'undefined' ? window.location.origin : ''}
                  /api/bots/{bot.id}/webhook
                </div>
                <Button variant="outline" size="sm">
                  API Dokumentation
                </Button>
              </div>

              {/* JavaScript Widget */}
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">💬 Web Chat Widget</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Embed Ihren Bot auf Ihrer Website
                </p>
                <WidgetCodeGenerator botId={bot.id} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

