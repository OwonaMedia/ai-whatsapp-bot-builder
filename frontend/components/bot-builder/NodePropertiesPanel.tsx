'use client';

import { useState, useRef, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { NodeConfig, NodeType } from '@/types/bot';
import KnowledgeNodeUpload from './KnowledgeNodeUpload';

interface NodePropertiesPanelProps {
  node: Node;
  onUpdate: (nodeId: string, config: NodeConfig) => void;
  onClose: () => void;
  botId?: string; // ✅ botId als Prop übergeben (falls node.data.botId fehlt)
}

export default function NodePropertiesPanel({
  node,
  onUpdate,
  onClose,
  botId: propBotId,
}: NodePropertiesPanelProps) {
  const { addToast } = useToast();
  // ✅ Fix Hydration: mounted State für client-side Rendering
  const [mounted, setMounted] = useState(false);
  
  // ✅ Initial State: Nur primitives, keine komplexen Objekte
  const initialConfig = node.data.config || {};
  const initialLabel = typeof node.data.label === 'string' ? node.data.label : '';
  const [config, setConfig] = useState<NodeConfig>(initialConfig);
  const [label, setLabel] = useState(initialLabel);

  // ✅ Fix Hydration: Setze mounted nur client-seitig
  useEffect(() => {
    // ✅ Setze mounted nur nach Client-Mount (verhindert SSR/Client Mismatch)
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Sync config mit node.data nur nach Mount (verhindert Render-Loops durch useEffect-Ref)
  const prevNodeIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!mounted) return;
    
    // ✅ Nur sync wenn sich node.id ändert (nicht bei jedem Render)
    if (prevNodeIdRef.current !== node.id) {
      prevNodeIdRef.current = node.id;
      if (node.data.config) {
        setConfig(node.data.config);
      }
      if (typeof node.data.label === 'string') {
        setLabel(node.data.label);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, node.id]);

  const handleSave = () => {
    onUpdate(node.id, config);
  };

  const renderNodeConfig = () => {
    switch (node.type as NodeType) {
      case 'trigger':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger-Typ
              </label>
              <select
                value={config.trigger_type || 'whatsapp_message'}
                onChange={(e) =>
                  setConfig({ ...config, trigger_type: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="whatsapp_message">📱 WhatsApp Nachricht</option>
                <option value="web_chat">💬 Web Chat</option>
                <option value="customer_service_chat">🎧 Customer Service Chat (Homepage)</option>
                <option value="keyword">🔑 Schlüsselwort</option>
                <option value="always">⚡ Immer aktiv</option>
              </select>
            </div>
            {config.trigger_type === 'keyword' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schlüsselwort
                </label>
                <input
                  type="text"
                  value={config.keyword || ''}
                  onChange={(e) =>
                    setConfig({ ...config, keyword: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="z.B. Hilfe, Support, Start"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Bot reagiert wenn User dieses Wort sendet
                </p>
              </div>
            )}
            {(config.trigger_type === 'whatsapp_message' || config.trigger_type === 'web_chat' || config.trigger_type === 'customer_service_chat') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger-Quelle
                </label>
                <select
                  value={config.trigger_source || 'both'}
                  onChange={(e) =>
                    setConfig({ ...config, trigger_source: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="both">Beide (WhatsApp + Web Chat)</option>
                  <option value="whatsapp">Nur WhatsApp</option>
                  <option value="web_chat">Nur Web Chat</option>
                </select>
              </div>
            )}
          </div>
        );

      case 'message':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nachricht
              </label>
              <textarea
                value={config.message_text || ''}
                onChange={(e) =>
                  setConfig({ ...config, message_text: e.target.value })
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Nachricht eingeben..."
              />
            </div>
          </div>
        );

      case 'question':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frage
              </label>
              <textarea
                value={config.question_text || ''}
                onChange={(e) =>
                  setConfig({ ...config, question_text: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Frage eingeben..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Antwortoptionen
              </label>
              <div className="space-y-2">
                {(config.options || []).map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => {
                        const newOptions = [...(config.options || [])];
                        if (newOptions[index]) {
                          newOptions[index].label = e.target.value;
                          setConfig({ ...config, options: newOptions });
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Option Label"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newOptions = [
                      ...(config.options || []),
                      { id: `option_${crypto.randomUUID()}`, label: '', value: '' },
                    ];
                    setConfig({ ...config, options: newOptions });
                  }}
                >
                  + Option hinzufügen
                </Button>
              </div>
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bedingungstyp
              </label>
              <select
                value={config.condition_type || 'equals'}
                onChange={(e) =>
                  setConfig({ ...config, condition_type: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="equals">Gleich</option>
                <option value="contains">Enthält</option>
                <option value="greater_than">Größer als</option>
                <option value="less_than">Kleiner als</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Wert
              </label>
              <input
                type="text"
                value={config.condition_value || ''}
                onChange={(e) =>
                  setConfig({ ...config, condition_value: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Vergleichswert"
              />
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI-Prompt
              </label>
              <textarea
                value={config.ai_prompt || ''}
                onChange={(e) =>
                  setConfig({ ...config, ai_prompt: e.target.value })
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="System-Prompt für AI..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI-Modell
              </label>
              <select
                value={config.ai_model || 'groq'}
                onChange={(e) =>
                  setConfig({ ...config, ai_model: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="groq">GROQ (Llama 3.3)</option>
                <option value="openai">OpenAI (GPT-4)</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="use_context"
                checked={config.use_context || false}
                onChange={(e) =>
                  setConfig({ ...config, use_context: e.target.checked })
                }
                className="mr-2"
              />
              <label htmlFor="use_context" className="text-sm text-gray-700">
                Gesprächskontext verwenden
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="use_knowledge"
                checked={config.use_knowledge || false}
                onChange={(e) =>
                  setConfig({ ...config, use_knowledge: e.target.checked })
                }
                className="mr-2"
              />
              <label htmlFor="use_knowledge" className="text-sm text-gray-700">
                📚 Wissensquellen verwenden (RAG)
              </label>
            </div>
            {config.use_knowledge && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                💡 AI nutzt alle verknüpften Knowledge Sources für kontextuelle Antworten
              </div>
            )}
          </div>
        );

      case 'knowledge':
        return (
          <KnowledgeNodeUpload
            botId={propBotId || (node.data as any).botId}
            currentSourceId={(config as any).knowledge_source_id}
            currentSourceType={(config as any).knowledge_source_type}
            currentSourceTitle={(config as any).knowledge_source_title}
            onSourceAdded={(source) => {
              setConfig({
                ...config,
                knowledge_source_type: source.type,
                knowledge_source_id: source.id,
                knowledge_source_title: source.title,
                knowledge_source_url: source.url,
              } as NodeConfig);
            }}
            onSourceRemoved={() => {
              setConfig({
                ...config,
                knowledge_source_type: undefined,
                knowledge_source_id: undefined,
                knowledge_source_title: undefined,
                knowledge_source_url: undefined,
              } as NodeConfig);
            }}
          />
        );

      default:
        return (
          <p className="text-gray-500 text-sm">
            Keine Konfiguration verfügbar für diesen Node-Typ.
          </p>
        );
    }
  };

  // ✅ Fix Hydration: Rendere nichts bis mounted (verhindert SSR/Client Mismatch)
  // WICHTIG: Der initiale Render muss identisch sein (Server & Client)
  // Daher verwenden wir einen leeren Platzhalter mit fester Struktur
  if (!mounted) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-center h-full min-h-[200px]">
          <div className="text-gray-400 text-sm">Lade...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Node-Eigenschaften</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={label || ''}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          {renderNodeConfig()}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <Button variant="primary" onClick={handleSave} className="w-full">
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}

