import path from 'node:path';
import { promises as fs } from 'node:fs';
import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';

import type { Logger } from '../utils/logger.js';

const execAsync = promisify(execCallback);

const PATCH_MARKER = '/* rag-scroll-layout-fix */';

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeFileIfChanged(filePath: string, content: string, logger: Logger): Promise<boolean> {
  const current = await fs.readFile(filePath, 'utf8');
  if (current.includes(PATCH_MARKER)) {
    logger.debug({ filePath }, 'RAG playground scroll fix already applied');
    return false;
  }

  await fs.writeFile(filePath, content, 'utf8');
  logger.info({ filePath }, 'RAG playground scroll fix applied');
  return true;
}

export async function applyRagPlaygroundScrollFix(rootDir: string, logger: Logger): Promise<boolean> {
  const repositoryRoot = path.resolve(rootDir, '..');
  const frontendCandidate = path.join(repositoryRoot, 'frontend');
  const frontendExists = await pathExists(path.join(frontendCandidate, 'package.json'));

  const appRoot = frontendExists ? frontendCandidate : repositoryRoot;
  const ragDemoPath = frontendExists
    ? path.join(frontendCandidate, 'components/demo/RAGDemo.tsx')
    : path.join(repositoryRoot, 'components/demo/RAGDemo.tsx');

  const patchedContent = `/* rag-scroll-layout-fix */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { normalizeURL } from '@/lib/utils/urlNormalizer';
import { safeFetch } from '@/lib/safe-fetch-wrapper';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ id: string; content: string; similarity: number }>;
}

interface KnowledgeSource {
  id: string;
  name: string;
  type: 'pdf' | 'url' | 'text';
  status: 'processing' | 'ready' | 'error';
}

export default function RAGDemo() {
  const t = useTranslations('rag');
  const [sessionId, setSessionId] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let id = sessionStorage.getItem('demo_session_id');
      if (!id) {
        id = \`demo_\${crypto.randomUUID()}\`;
        sessionStorage.setItem('demo_session_id', id);
      }
      setSessionId(id);
      setMounted(true);
    }
  }, []);

  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [isAddingText, setIsAddingText] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const pollingRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pollCountRefs = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!mounted || !sessionId) return;

    loadSources();
    const interval = setInterval(() => {
      if (mounted && sessionId) {
        loadSources();
      }
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, sessionId]);

  useEffect(() => {
    return () => {
      pollingRefs.current.forEach((timeoutId) => clearTimeout(timeoutId));
      pollingRefs.current.clear();
      pollCountRefs.current.clear();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSources = async () => {
    if (!sessionId || !mounted) return;

    try {
      const response = await safeFetch(\`/api/knowledge/sources?sessionId=\${sessionId}\`, {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        setSources(data);

        data.forEach((source: KnowledgeSource) => {
          if (source.status === 'processing' && !pollingRefs.current.has(source.id)) {
            startPollingSource(source.id);
          }
        });
      }
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const startPollingSource = (sourceId: string) => {
    const existingTimeout = pollingRefs.current.get(sourceId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      pollingRefs.current.delete(sourceId);
    }

    let pollCount = 0;
    const maxPolls = 60;
    pollCountRefs.current.set(sourceId, 0);

    const poll = async () => {
      try {
        const response = await safeFetch(\`/api/knowledge/sources?sessionId=\${sessionId}\`, {
          method: 'GET',
        });
        if (!response.ok) throw new Error('Failed to fetch sources');

        const data = await response.json();
        const source = data.find((s: KnowledgeSource) => s.id === sourceId);

        if (!source) {
          pollingRefs.current.delete(sourceId);
          pollCountRefs.current.delete(sourceId);
          return;
        }

        setSources((prev) =>
          prev.map((s) => (s.id === sourceId ? { ...s, status: source.status } : s))
        );

        if (source.status !== 'processing') {
          pollingRefs.current.delete(sourceId);
          pollCountRefs.current.delete(sourceId);

          if (source.status === 'error') {
            addToast({
              type: 'error',
              title: 'Verarbeitung fehlgeschlagen',
              message: source.metadata?.error || 'Unbekannter Fehler',
              duration: 10000,
            });
          } else if (source.status === 'ready') {
            addToast({
              type: 'success',
              title: 'PDF verarbeitet',
              message: 'Das PDF ist jetzt bereit für den Chat.',
            });
          }
          return;
        }

        pollCount = (pollCountRefs.current.get(sourceId) || 0) + 1;
        pollCountRefs.current.set(sourceId, pollCount);

        if (pollCount >= maxPolls) {
          pollingRefs.current.delete(sourceId);
          pollCountRefs.current.delete(sourceId);
          setSources((prev) =>
            prev.map((s) => (s.id === sourceId ? { ...s, status: 'error' as const } : s))
          );
          addToast({
            type: 'error',
            title: 'Timeout',
            message: 'Die Verarbeitung hat zu lange gedauert. Bitte versuchen Sie es erneut.',
            duration: 10000,
          });
          return;
        }

        const delay = Math.min(3000 + pollCount * 2000, 10000);
        const timeoutId = setTimeout(poll, delay);
        pollingRefs.current.set(sourceId, timeoutId);
      } catch (error: any) {
        console.error(\`[Polling] Error for source \${sourceId}:\`, error);
        pollingRefs.current.delete(sourceId);
        pollCountRefs.current.delete(sourceId);

        const errorMessage = error?.message || 'Unbekannter Fehler';
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('network')) {
          const timeoutId = setTimeout(poll, 5000);
          pollingRefs.current.set(sourceId, timeoutId);
          return;
        }

        setSources((prev) =>
          prev.map((s) => (s.id === sourceId ? { ...s, status: 'error' as const } : s))
        );
        addToast({
          type: 'error',
          title: 'Fehler',
          message: errorMessage || 'Status konnte nicht abgerufen werden. Bitte Seite neu laden.',
          duration: 10000,
        });
      }
    };

    const timeoutId = setTimeout(poll, 3000);
    pollingRefs.current.set(sourceId, timeoutId);
  };

  const handleAddURL = async () => {
    if (!urlInput.trim()) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bitte geben Sie eine URL ein.',
      });
      return;
    }

    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeURL(urlInput.trim());
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Ungültige URL',
        message:
          error.message ||
          'Bitte geben Sie eine gültige URL ein (z.B. example.com, www.example.com, https://example.com)',
      });
      return;
    }

    setIsAddingUrl(true);

    try {
      const response = await safeFetch('/api/knowledge/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl, sessionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'URL konnte nicht hinzugefügt werden');
      }

      const data = await response.json();

      setSources((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          type: 'url' as const,
          status: 'processing' as const,
        },
      ]);

      setUrlInput('');
      addToast({
        type: 'success',
        title: 'URL hinzugefügt',
        message: 'Die URL wird jetzt verarbeitet...',
      });

      startPollingSource(data.id);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message,
      });
    } finally {
      setIsAddingUrl(false);
    }
  };

  const handleUploadPDF = async (file: File) => {
    setIsUploadingPdf(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sessionId', sessionId);

      const response = await safeFetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'PDF konnte nicht hochgeladen werden');
      }

      const data = await response.json();

      setSources((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          type: 'pdf' as const,
          status: 'processing' as const,
        },
      ]);

      addToast({
        type: 'success',
        title: 'PDF hochgeladen',
        message: 'Das PDF wird jetzt verarbeitet...',
      });

      startPollingSource(data.id);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message,
      });
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleAddText = async () => {
    if (!textTitle.trim() || !textInput.trim()) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bitte geben Sie Titel und Text ein.',
      });
      return;
    }

    setIsAddingText(true);
    try {
      const response = await safeFetch('/api/knowledge/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: textTitle,
          content: textInput,
          sessionId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Text konnte nicht hinzugefügt werden');
      }

      const data = await response.json();

      setSources((prev) => [
        ...prev,
        {
          id: data.id,
          name: data.name,
          type: 'text' as const,
          status: 'processing' as const,
        },
      ]);

      setTextTitle('');
      setTextInput('');
      addToast({
        type: 'success',
        title: 'Text hinzugefügt',
        message: 'Der Text wird jetzt verarbeitet...',
      });

      startPollingSource(data.id);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message,
      });
    } finally {
      setIsAddingText(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      const response = await safeFetch(\`/api/knowledge/sources/\${id}\`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        setSources((prev) => prev.filter((s) => s.id !== id));
        addToast({
          type: 'success',
          title: 'Erfolg',
          message: 'Wissensquelle entfernt',
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Wissensquelle konnte nicht entfernt werden',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const readySources = sources.filter((s) => s.status === 'ready');
    if (readySources.length === 0) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bitte fügen Sie zuerst eine Wissensquelle hinzu.',
      });
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await safeFetch('/api/knowledge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          sourceIds: readySources.map((s) => s.id),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Chat-Fehler');
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.response, sources: data.sources },
      ]);
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const readySourcesCount = sources.filter((s) => s.status === 'ready').length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.9fr),minmax(0,1.4fr)]">
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white shadow-md md:sticky md:top-0 md:h-[640px]">
          <div className="flex h-full flex-col p-4 md:p-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('knowledgeSources')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('knowledgeSourcesHint')}</p>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="url-input" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('addUrl')}
                </label>
                <div className="flex gap-2">
                  <input
                    id="url-input"
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={t('addUrl') + '...'}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    onKeyUp={(e) => e.key === 'Enter' && handleAddURL()}
                    aria-label={t('addUrl')}
                  />
                  <Button variant="outline" size="sm" onClick={handleAddURL} isLoading={isAddingUrl}>
                    {t('addUrl')}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="pdf-input" className="block text-sm font-medium text-gray-700">
                  {t('uploadPdf')}
                </label>
                <input
                  id="pdf-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadPDF(file);
                  }}
                  className="hidden"
                  aria-label={t('uploadPdf')}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  isLoading={isUploadingPdf}
                >
                  {t('uploadPdf')}
                </Button>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                {t('sourcesReady', { count: readySourcesCount })}
              </div>
            </div>

            <div className="mt-6 flex-1 overflow-y-auto pr-1">
              {sources.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">{t('noSources')}</p>
              ) : (
                <div className="space-y-2">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-gray-900">{source.name}</div>
                        <div className="text-xs text-gray-500">
                          {source.status === 'processing' && t('processing')}
                          {source.status === 'ready' && t('ready')}
                          {source.status === 'error' && t('error')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSource(source.id)}
                        className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-xs font-bold text-red-500 transition hover:bg-red-100"
                        aria-label={t('removeSource')}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm shadow-sm">
          <h4 className="font-semibold text-gray-900">{t('addText')}</h4>
          <div className="mt-3 space-y-3">
            <input
              id="text-title-input"
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="Titel..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              aria-label="Text-Titel"
            />
            <textarea
              id="text-content-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Text eingeben..."
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              aria-label="Text-Inhalt"
            />
            <Button variant="outline" size="sm" onClick={handleAddText} isLoading={isAddingText} className="w-full">
              {t('addTextButton')}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex min-h-[480px] flex-col rounded-lg border border-gray-200 bg-white shadow-md md:h-[640px]">
        <div className="border-b border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900">{t('chatTitle')}</h3>
          <p className="text-sm text-gray-500">{t('chatDescription')}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pr-2">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <p className="mb-2">{t('emptyChat')}</p>
              <p className="text-sm">{t('emptyChatHint')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={\`flex \${message.role === 'user' ? 'justify-end' : 'justify-start'}\`}
                >
                  <div
                    className={\`max-w-[80%] rounded-xl px-4 py-3 text-sm shadow-sm \${message.role === 'user' ? 'bg-brand-green text-white' : 'bg-gray-100 text-gray-900'}\`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-xs text-gray-600 shadow-inner">
                        <div className="font-semibold">{t('sources')}</div>
                        <ul className="mt-1 space-y-1">
                          {message.sources.slice(0, 3).map((source) => (
                            <li key={source.id} className="flex items-center justify-between gap-3">
                              <span className="truncate">{source.id}</span>
                              <span className="text-[10px] text-gray-400">
                                {(source.similarity * 100).toFixed(1)}%
                              </span>
                            </li>
                          ))}
                          {message.sources.length > 3 && (
                            <li className="text-[10px] text-gray-400">
                              +{message.sources.length - 3} weitere Quellen
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="mt-4 flex justify-start">
              <div className="rounded-lg bg-gray-100 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500 delay-75" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500 delay-150" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="chat-input" className="sr-only">
              {t('placeholder')}
            </label>
            <input
              id="chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder={t('placeholder')}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green"
              disabled={isLoading || readySourcesCount === 0}
              aria-label={t('placeholder')}
            />
            <Button
              variant="primary"
              onClick={handleSendMessage}
              isLoading={isLoading}
              disabled={readySourcesCount === 0}
            >
              {t('send')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
`;

  const changed = await writeFileIfChanged(ragDemoPath, patchedContent, logger);

  if (!changed) {
    return false;
  }

  await execAsync('npm run build', { cwd: appRoot });
  await execAsync('pm2 restart whatsapp-bot-builder --update-env', { cwd: repositoryRoot });

  return true;
}

