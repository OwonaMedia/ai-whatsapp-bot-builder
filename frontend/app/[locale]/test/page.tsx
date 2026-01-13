'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import RAGDemo from '@/components/demo/RAGDemo';
import BotBuilder from '@/components/bot-builder/BotBuilder';
import { BotFlow } from '@/types/bot';

export default function TestPage() {
  const t = useTranslations();
  const { addToast } = useToast();
  
  // ✅ Fix Hydration: Warte bis Client-seitig gerendert
  const [mounted, setMounted] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const testSuites = [
    {
      id: 'rag-demo',
      title: 'RAG Chat Demo',
      description: 'Teste das RAG-System mit PDF-Upload, URL-Integration und Text-Input',
      badge: 'RAG',
      badgeClass: 'bg-gradient-to-br from-brand-green to-emerald-600 text-white',
      component: 'RAGDemo',
    },
    {
      id: 'bot-builder',
      title: 'Bot Builder',
      description: 'Teste den visuellen Flow-Builder für Bot-Erstellung',
      badge: 'BB',
      badgeClass: 'bg-gradient-to-br from-sky-500 to-brand-green text-white',
      component: 'BotBuilder',
    },
    {
      id: 'knowledge-upload',
      title: 'Knowledge Upload',
      description: 'Teste PDF-Upload, URL-Verarbeitung und Text-Input',
      badge: 'KU',
      badgeClass: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white',
      component: 'KnowledgeUpload',
    },
    {
      id: 'whatsapp-integration',
      title: 'WhatsApp Integration',
      description: 'Teste die WhatsApp Business API Integration',
      badge: 'WA',
      badgeClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
      component: 'WhatsAppTest',
    },
    {
      id: 'api-endpoints',
      title: 'API Endpoints',
      description: 'Teste alle API-Endpoints und deren Funktionalität',
      badge: 'API',
      badgeClass: 'bg-gradient-to-br from-brand-dark to-slate-700 text-white',
      component: 'APITest',
    },
  ] as const;

  const handleTestClick = (testId: string) => {
    setActiveTest(activeTest === testId ? null : testId);
  };

  const runAPITest = async (endpoint: string, method: string = 'GET', body?: any) => {
    try {
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);
      const data = await response.json();
      
      return {
        success: response.ok,
        status: response.status,
        data,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  };

  // ✅ Verhindere Hydration-Mismatch durch client-only Rendering
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-screen">
            <div className="text-gray-500">Lade Test Center...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Test Center – WhatsApp Bot Builder
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Teste alle Features des WhatsApp Bot Builders an einem Ort
          </p>
          <div className="flex gap-4">
            <Link href="/dashboard">
              <Button variant="outline">Zurück zum Dashboard</Button>
            </Link>
            <Button
              variant="primary"
              onClick={() => {
                addToast({
                  type: 'success',
                  title: 'Test Center',
                  message: 'Alle Tests sind bereit für die Ausführung',
                });
              }}
            >
              Alle Tests ausführen
            </Button>
          </div>
        </div>

        {/* Test Suites Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {testSuites.map((suite) => (
            <div
              key={suite.id}
              className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl ${
                activeTest === suite.id ? 'ring-2 ring-brand-green' : ''
              }`}
              onClick={() => handleTestClick(suite.id)}
            >
              <div className="mb-4">
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold ${suite.badgeClass}`}>
                  {suite.badge}
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">{suite.title}</h3>
              <p className="text-gray-600 text-sm mb-4">{suite.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-brand-green">
                  {activeTest === suite.id ? 'Aktiv' : 'Details anzeigen'}
                </span>
                <span className="text-sm text-gray-500 uppercase tracking-wide">
                  {activeTest === suite.id ? 'Schließen' : 'Öffnen'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Active Test Component */}
        {activeTest === 'rag-demo' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">RAG Chat Demo</h2>
            <p className="text-gray-600 mb-6">
              Teste das RAG-System: Lade PDFs hoch, füge URLs hinzu oder gib Text ein, 
              und chatte mit der KI basierend auf deinen Wissensquellen.
            </p>
            <div className="border-t pt-6">
              <RAGDemo />
            </div>
          </div>
        )}

        {activeTest === 'bot-builder' && mounted && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Bot Builder</h2>
            <p className="text-gray-600 mb-6">
              Teste den visuellen Flow-Builder: Erstelle Nodes, verbinde sie und teste 
              den Bot-Flow in Echtzeit.
            </p>
            <div className="border-t pt-6">
              <BotBuilder
                mode="create"
                initialFlow={{
                  name: 'Test Bot',
                  nodes: [],
                  edges: [],
                }}
                onFlowChange={(flow) => {
                  console.log('Flow changed:', flow);
                }}
              />
            </div>
          </div>
        )}

        {activeTest === 'api-endpoints' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">API Endpoints Test</h2>
            <p className="text-gray-600 mb-6">
              Teste alle API-Endpoints und deren Funktionalität
            </p>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">GET /api/knowledge/sources</h3>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const result = await runAPITest('/api/knowledge/sources?sessionId=test');
                    setTestResults((prev) => ({ ...prev, sources: result }));
                    addToast({
                      type: result.success ? 'success' : 'error',
                      title: result.success ? 'Erfolg' : 'Fehler',
                      message: result.success 
                        ? 'Sources erfolgreich geladen' 
                        : `Fehler: ${result.error || result.status}`,
                    });
                  }}
                >
                  Test ausführen
                </Button>
                {testResults.sources && (
                  <pre className="mt-4 p-4 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(testResults.sources, null, 2)}
                  </pre>
                )}
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">POST /api/knowledge/embeddings</h3>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const result = await runAPITest('/api/knowledge/embeddings', 'POST', {
                      text: 'Test text for embedding generation',
                    });
                    setTestResults((prev) => ({ ...prev, embeddings: result }));
                    addToast({
                      type: result.success ? 'success' : 'error',
                      title: result.success ? 'Erfolg' : 'Fehler',
                      message: result.success 
                        ? 'Embedding erfolgreich generiert' 
                        : `Fehler: ${result.error || result.status}`,
                    });
                  }}
                >
                  Test ausführen
                </Button>
                {testResults.embeddings && (
                  <pre className="mt-4 p-4 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(testResults.embeddings, null, 2)}
                  </pre>
                )}
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">GET /api/bots</h3>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const result = await runAPITest('/api/bots');
                    setTestResults((prev) => ({ ...prev, bots: result }));
                    addToast({
                      type: result.success ? 'success' : 'error',
                      title: result.success ? 'Erfolg' : 'Fehler',
                      message: result.success 
                        ? 'Bots erfolgreich geladen' 
                        : `Fehler: ${result.error || result.status}`,
                    });
                  }}
                >
                  Test ausführen
                </Button>
                {testResults.bots && (
                  <pre className="mt-4 p-4 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(testResults.bots, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTest === 'whatsapp-integration' && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">WhatsApp Integration Test</h2>
            <p className="text-gray-600 mb-6">
              Teste die WhatsApp Business API Integration. Stelle sicher, dass die 
              Webhook-URL korrekt konfiguriert ist.
            </p>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Webhook URL</h3>
                <div className="bg-gray-100 p-3 rounded font-mono text-sm mb-4">
                  {typeof window !== 'undefined' 
                    ? `${window.location.origin}/api/webhooks/whatsapp`
                    : '/api/webhooks/whatsapp'}
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Verwende diese URL in deiner WhatsApp Business API Konfiguration
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      typeof window !== 'undefined' 
                        ? `${window.location.origin}/api/webhooks/whatsapp`
                        : '/api/webhooks/whatsapp'
                    );
                    addToast({
                      type: 'success',
                      title: 'Kopiert',
                      message: 'Webhook URL wurde in die Zwischenablage kopiert',
                    });
                  }}
                >
                  URL kopieren
                </Button>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Test Webhook</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Simuliere einen WhatsApp-Webhook-Request
                </p>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const result = await runAPITest('/api/webhooks/whatsapp', 'POST', {
                      object: 'whatsapp_business_account',
                      entry: [{
                        id: 'test_entry',
                        changes: [{
                          value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                              display_phone_number: 'test',
                              phone_number_id: 'test',
                            },
                            messages: [{
                              from: 'test_number',
                              id: 'test_message_id',
                              timestamp: Math.floor(Date.now() / 1000),
                              type: 'text',
                              text: {
                                body: 'Test message from test center',
                              },
                            }],
                          },
                          field: 'messages',
                        }],
                      }],
                    });
                    setTestResults((prev) => ({ ...prev, webhook: result }));
                    addToast({
                      type: result.success ? 'success' : 'error',
                      title: result.success ? 'Erfolg' : 'Fehler',
                      message: result.success 
                        ? 'Webhook-Test erfolgreich' 
                        : `Fehler: ${result.error || result.status}`,
                    });
                  }}
                >
                  Test Webhook ausführen
                </Button>
                {testResults.webhook && (
                  <pre className="mt-4 p-4 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(testResults.webhook, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Test Results Summary */}
        {Object.keys(testResults).length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Test Ergebnisse</h2>
            <div className="space-y-2">
              {Object.entries(testResults).map(([key, result]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="font-medium">{key}</span>
                  <span className={`px-3 py-1 rounded ${
                    result.success 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {result.success ? 'Erfolg' : 'Fehler'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

