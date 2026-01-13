'use client';

/**
 * ✅ NEUE IMPLEMENTIERUNG: Knowledge Node Upload Komponente
 * 
 * Komplett neue, einfachere Methode für Wissensquellen-Uploads:
 * - Verwendet safeFetch für alle Requests
 * - Einfache State-Verwaltung
 * - Robuste Fehlerbehandlung
 * - Kein komplexes Polling - nutzt Server-Sent Events oder einfache Status-Checks
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { normalizeURL } from '@/lib/utils/urlNormalizer';
import { safeFetch } from '@/lib/safe-fetch-wrapper';

interface KnowledgeNodeUploadProps {
  botId?: string;
  currentSourceId?: string;
  currentSourceType?: 'url' | 'pdf' | 'text';
  currentSourceTitle?: string;
  onSourceAdded: (source: {
    id: string;
    type: 'url' | 'pdf' | 'text';
    title: string;
    url?: string;
  }) => void;
  onSourceRemoved: () => void;
}

export default function KnowledgeNodeUpload({
  botId,
  currentSourceId,
  currentSourceType,
  currentSourceTitle,
  onSourceAdded,
  onSourceRemoved,
}: KnowledgeNodeUploadProps) {
  const { addToast } = useToast();
  const [sourceType, setSourceType] = useState<'url' | 'pdf' | 'text'>(currentSourceType || 'url');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // URL Input
  const [urlInput, setUrlInput] = useState('');
  
  // PDF Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Text Input
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  // ✅ Status-Check für vorhandene Source
  useEffect(() => {
    if (!currentSourceId) {
      setStatus('idle');
      return;
    }

    const checkStatus = async () => {
      try {
        const response = await safeFetch(`/api/knowledge/sources/${currentSourceId}`, {
          method: 'GET',
        });

        if (response.ok) {
          const source = await response.json();
          if (source.status === 'ready') {
            setStatus('ready');
            setErrorMessage(null);
              } else if (source.status === 'processing') {
                setStatus('processing');
                // ✅ Starte einfaches Polling (alle 3 Sekunden, max 120x = 6 Minuten)
                startSimplePolling(currentSourceId, 120);
          } else if (source.status === 'error') {
            setStatus('error');
            setErrorMessage(source.metadata?.error || 'Unbekannter Fehler');
          }
        }
      } catch (error) {
        console.error('Error checking source status:', error);
      }
    };

    checkStatus();
  }, [currentSourceId]);

  // ✅ Einfaches Polling (ohne komplexe State-Verwaltung)
  const startSimplePolling = (sourceId: string, maxAttempts: number) => {
    let attempts = 0;
    let pollInterval: NodeJS.Timeout | null = null;
    
    const poll = async () => {
      attempts++;
      
      try {
        const response = await safeFetch(`/api/knowledge/sources/${sourceId}`, {
          method: 'GET',
        });

        if (response.ok) {
          const source = await response.json();
          console.log(`[Polling] Source ${sourceId} status: ${source.status} (attempt ${attempts}/${maxAttempts})`);
          
          if (source.status === 'ready') {
            if (pollInterval) clearInterval(pollInterval);
            setStatus('ready');
            setErrorMessage(null);
            addToast({
              type: 'success',
              title: 'Fertig',
              message: 'Wissensquelle wurde erfolgreich verarbeitet',
            });
            return;
          } else if (source.status === 'error') {
            if (pollInterval) clearInterval(pollInterval);
            setStatus('error');
            const errorMsg = source.metadata?.error || 'Unbekannter Fehler';
            setErrorMessage(errorMsg);
            addToast({
              type: 'error',
              title: 'Verarbeitungsfehler',
              message: errorMsg,
            });
            return;
          } else if (source.status === 'processing') {
            // ✅ Status wird weiter verarbeitet, zeige Fortschritt an
            if (attempts % 10 === 0) { // Alle 30 Sekunden (10 * 3s)
              console.log(`[Polling] Source ${sourceId} still processing... (${attempts * 3}s elapsed)`);
            }
          }
        } else {
          console.error(`[Polling] Failed to fetch source status: ${response.status}`);
        }
      } catch (error) {
        console.error('Error polling source status:', error);
      }

      // ✅ Timeout nach maxAttempts (standardmäßig 60 * 3s = 180s = 3 Minuten)
      if (attempts >= maxAttempts) {
        if (pollInterval) clearInterval(pollInterval);
        setStatus('error');
        setErrorMessage('Verarbeitung dauerte zu lange. Bitte versuchen Sie es erneut.');
        addToast({
          type: 'error',
          title: 'Timeout',
          message: 'Die Verarbeitung hat zu lange gedauert. Bitte versuchen Sie es erneut.',
        });
      }
    };

    // ✅ Sofortiger erster Check (nach 0.5 Sekunden)
    setTimeout(poll, 500);
    
    // ✅ Dann alle 2 Sekunden für schnelle Error-Erkennung
    pollInterval = setInterval(poll, 2000);

    // ✅ Cleanup beim Unmount
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  };

  // ✅ URL hinzufügen
  const handleAddURL = async () => {
    if (!urlInput.trim()) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bitte geben Sie eine URL ein',
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
        message: error.message || 'Bitte geben Sie eine gültige URL ein',
      });
      return;
    }

    setIsLoading(true);
    setStatus('processing');
    setErrorMessage(null);

    try {
      const response = await safeFetch('/api/knowledge/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: normalizedUrl,
          botId: botId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'URL konnte nicht hinzugefügt werden');
      }

      const data = await response.json();
      
      setUrlInput('');
      setStatus('processing');
      
      onSourceAdded({
        id: data.id,
        type: 'url',
        title: data.name,
        url: normalizedUrl,
      });

      addToast({
        type: 'success',
        title: 'URL hinzugefügt',
        message: 'Die URL wird jetzt verarbeitet...',
      });

      // ✅ Starte Polling
      startSimplePolling(data.id, 120);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'URL konnte nicht hinzugefügt werden');
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message || 'URL konnte nicht hinzugefügt werden',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ PDF hochladen
  const handleUploadPDF = async (file: File) => {
    setIsLoading(true);
    setStatus('processing');
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (botId) {
        formData.append('botId', botId);
      }

      const response = await safeFetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
        throw new Error(error.error || 'PDF konnte nicht hochgeladen werden');
      }

      const data = await response.json();
      
      setStatus('processing');
      
      onSourceAdded({
        id: data.id,
        type: 'pdf',
        title: data.name,
      });

      addToast({
        type: 'success',
        title: 'PDF hochgeladen',
        message: 'Das PDF wird jetzt verarbeitet...',
      });

      // ✅ Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // ✅ Starte Polling
      startSimplePolling(data.id, 120);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'PDF konnte nicht hochgeladen werden');
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message || 'PDF konnte nicht hochgeladen werden',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Text hinzufügen
  const handleAddText = async () => {
    if (!textTitle.trim() || !textContent.trim()) {
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Bitte geben Sie Titel und Text ein',
      });
      return;
    }

    setIsLoading(true);
    setStatus('processing');
    setErrorMessage(null);

    try {
      const response = await safeFetch('/api/knowledge/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: textTitle,
          content: textContent,
          botId: botId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Text konnte nicht hinzugefügt werden');
      }

      const data = await response.json();
      
      setTextTitle('');
      setTextContent('');
      setStatus('processing');
      
      onSourceAdded({
        id: data.id,
        type: 'text',
        title: data.name,
      });

      addToast({
        type: 'success',
        title: 'Text hinzugefügt',
        message: 'Der Text wird jetzt verarbeitet...',
      });

      // ✅ Starte Polling
      startSimplePolling(data.id, 120);
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Text konnte nicht hinzugefügt werden');
      addToast({
        type: 'error',
        title: 'Fehler',
        message: error.message || 'Text konnte nicht hinzugefügt werden',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Wissensquelle entfernen
  const handleRemoveSource = async () => {
    if (!currentSourceId) return;

    try {
      const response = await safeFetch(`/api/knowledge/sources/${currentSourceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        onSourceRemoved();
        setStatus('idle');
        setErrorMessage(null);
        addToast({
          type: 'success',
          title: 'Entfernt',
          message: 'Wissensquelle wurde entfernt',
        });
      }
    } catch (error) {
      console.error('Error removing source:', error);
      addToast({
        type: 'error',
        title: 'Fehler',
        message: 'Wissensquelle konnte nicht entfernt werden',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* ✅ Typ-Auswahl */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wissensquellen-Typ
        </label>
        <select
          value={sourceType}
          onChange={(e) => {
            setSourceType(e.target.value as 'url' | 'pdf' | 'text');
            setStatus('idle');
            setErrorMessage(null);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          disabled={!!currentSourceId}
        >
          <option value="url">🔗 URL</option>
          <option value="pdf">📄 PDF</option>
          <option value="text">📝 Text</option>
        </select>
      </div>

      {/* ✅ URL Input */}
      {sourceType === 'url' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleAddURL()}
              placeholder="https://example.com oder example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isLoading || !!currentSourceId}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddURL}
              isLoading={isLoading}
              disabled={!!currentSourceId}
            >
              Hinzufügen
            </Button>
          </div>
        </div>
      )}

      {/* ✅ PDF Upload */}
      {sourceType === 'pdf' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PDF-Datei
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUploadPDF(file);
            }}
            className="hidden"
            disabled={isLoading || !!currentSourceId}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            isLoading={isLoading}
            disabled={!!currentSourceId}
            className="w-full"
          >
            {isLoading ? 'Wird hochgeladen...' : '📄 PDF auswählen'}
          </Button>
        </div>
      )}

      {/* ✅ Text Input */}
      {sourceType === 'text' && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel
            </label>
            <input
              type="text"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              placeholder="z.B. FAQ, Produktinfo"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isLoading || !!currentSourceId}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Text-Inhalt
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={8}
              placeholder="Text-Inhalt eingeben..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              disabled={isLoading || !!currentSourceId}
            />
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAddText}
            isLoading={isLoading}
            disabled={!!currentSourceId}
            className="w-full"
          >
            Text hinzufügen
          </Button>
        </>
      )}

      {/* ✅ Status-Anzeige */}
      {status === 'processing' && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          ⏳ Verarbeitung läuft... Bitte warten Sie.
        </div>
      )}

      {status === 'ready' && currentSourceTitle && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          ✅ Fertig: {currentSourceTitle}
        </div>
      )}

      {status === 'error' && errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          ❌ Fehler: {errorMessage}
        </div>
      )}

      {/* ✅ Entfernen-Button */}
      {currentSourceId && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRemoveSource}
          className="w-full text-red-600 border-red-300 hover:bg-red-50"
        >
          Wissensquelle entfernen
        </Button>
      )}

      {/* ✅ Info */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
        💡 Diese Wissensquelle wird automatisch für AI Nodes mit "Wissensquellen verwenden" genutzt
      </div>
    </div>
  );
}

