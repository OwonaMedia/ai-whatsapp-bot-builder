'use client';
export const dynamic = 'force-dynamic';

/**
 * DEMO-SEITE: Wissensquellen
 * Zeigt die Verwaltung von Wissensquellen (PDFs, URLs) für Screenshots
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

export default function KnowledgeDemoPage() {
  const [selectedTab, setSelectedTab] = useState<'sources' | 'integrations'>('sources');

  // Demo Wissensquellen
  const knowledgeSources = [
    {
      id: '1',
      name: 'Produktkatalog 2025.pdf',
      type: 'pdf',
      size: '2.4 MB',
      status: 'ready',
      chunks: 1247,
      added: '2025-01-15',
      icon: '📄',
    },
    {
      id: '2',
      type: 'url',
      name: 'https://example.com/faq',
      status: 'ready',
      chunks: 892,
      added: '2025-01-14',
      icon: '🔗',
    },
    {
      id: '3',
      name: 'Kundenservice-Handbuch.pdf',
      type: 'pdf',
      size: '1.8 MB',
      status: 'ready',
      chunks: 956,
      added: '2025-01-13',
      icon: '📄',
    },
    {
      id: '4',
      type: 'url',
      name: 'https://docs.example.com/api',
      status: 'processing',
      chunks: 0,
      added: '2025-01-16',
      icon: '🔗',
    },
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'ready') {
      return (
        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
          ✅ Fertig
        </span>
      );
    }
    return (
      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
        ⏳ Verarbeitung...
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-700 rounded-lg shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">📚 Wissensquellen</h1>
              <p className="text-white/90 mb-1">
                Verwalten Sie Ihre Wissensbasis für präzise AI-Antworten
              </p>
              <p className="text-white/80 text-sm">
                {knowledgeSources.filter((s) => s.status === 'ready').length} von{' '}
                {knowledgeSources.length} Quellen bereit
              </p>
            </div>
            <div className="hidden md:block">
              <div className="text-6xl opacity-20">📖</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedTab('sources')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                selectedTab === 'sources'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Wissensquellen
            </button>
            <button
              onClick={() => setSelectedTab('integrations')}
              className={`px-6 py-3 font-semibold border-b-2 transition-colors ${
                selectedTab === 'integrations'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Integrationen
            </button>
          </div>
        </div>

        {/* Content */}
        {selectedTab === 'sources' && (
          <>
            {/* Add Source Section */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Neue Wissensquelle hinzufügen</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                  <div className="text-4xl mb-3">📄</div>
                  <h3 className="font-semibold text-gray-900 mb-2">PDF hochladen</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Laden Sie PDF-Dokumente hoch, die als Wissensbasis dienen
                  </p>
                  <Button variant="outline" size="sm">
                    PDF auswählen
                  </Button>
                </div>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                  <div className="text-4xl mb-3">🔗</div>
                  <h3 className="font-semibold text-gray-900 mb-2">URL hinzufügen</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Integrieren Sie Webseiten als Wissensquelle
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <Button variant="primary" size="sm">
                      Hinzufügen
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sources List */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Ihre Wissensquellen</h2>
                <div className="text-sm text-gray-600">
                  {knowledgeSources.filter((s) => s.status === 'ready').length} bereit ·{' '}
                  {knowledgeSources.reduce((sum, s) => sum + s.chunks, 0)} Chunks
                </div>
              </div>

              <div className="space-y-4">
                {knowledgeSources.map((source) => (
                  <div
                    key={source.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="text-4xl">{source.icon}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900">{source.name}</h3>
                            {getStatusBadge(source.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {source.type === 'pdf' && <span>📊 {source.size}</span>}
                            <span>📑 {source.chunks} Chunks</span>
                            <span>📅 {source.added}</span>
                          </div>
                          {source.status === 'ready' && (
                            <div className="mt-2 flex gap-2">
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                                RAG aktiv
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                                Embeddings generiert
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          Bearbeiten
                        </Button>
                        <Button variant="outline" size="sm">
                          Löschen
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {selectedTab === 'integrations' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Bot-Integrationen</h2>
            <p className="text-gray-600 mb-6">
              Verbinden Sie Ihren Bot mit externen Systemen und Datenquellen
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {['API', 'Webhook', 'Database'].map((type) => (
                <div key={type} className="border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">🔌</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{type} Integration</h3>
                  <p className="text-sm text-gray-600 mb-4">Verbinden Sie externe Datenquellen</p>
                  <Button variant="outline" size="sm" className="w-full">
                    Konfigurieren
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}










