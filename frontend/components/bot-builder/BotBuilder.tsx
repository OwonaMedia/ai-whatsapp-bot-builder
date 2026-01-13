'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import dynamic from 'next/dynamic';
// Inline NodePalette component to avoid import issues
import { NodeType } from '@/types/bot';
import HelpIcon, { HelpIconInline } from '@/components/ui/HelpIcon';
import { useSupportTicket } from '@/components/support/SupportTicketContext';

const DEFAULT_EDGE_OPTIONS = {
  style: {
    strokeWidth: 3,
    stroke: '#0f172a',
    transition: 'stroke 150ms ease, stroke-width 150ms ease',
  },
};

const CONNECTION_LINE_STYLE = {
  strokeWidth: 3,
  stroke: '#0f172a',
};

const HOVER_EDGE_STYLE = {
  stroke: '#22c55e',
  strokeWidth: 4,
};

const SNAP_GRID: [number, number] = [20, 20];

const nodePaletteTypes: Array<{
  type: NodeType;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    type: 'trigger',
    label: 'Trigger',
    icon: '🎬',
    description: 'Startpunkt (WhatsApp, Web Chat, Keyword)',
  },
  {
    type: 'knowledge',
    label: 'Wissensquelle',
    icon: '📚',
    description: 'PDF, URL oder Text hinzufügen',
  },
  {
    type: 'message',
    label: 'Nachricht',
    icon: '💬',
    description: 'Nachricht senden',
  },
  {
    type: 'question',
    label: 'Frage',
    icon: '❓',
    description: 'Frage stellen',
  },
  {
    type: 'condition',
    label: 'Bedingung',
    icon: '🔀',
    description: 'IF/ELSE Logik',
  },
  {
    type: 'ai',
    label: 'AI Antwort',
    icon: '🤖',
    description: 'KI-gestützte Antwort',
  },
  {
    type: 'end',
    label: 'Ende',
    icon: '🏁',
    description: 'Gespräch beenden',
  },
];

function NodePalette({ onAddNode, locale = 'de' }: { onAddNode: (type: NodeType) => void; locale?: string }) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Node-Palette</h3>
        <HelpIcon
          title="Node-Palette"
          content="Die Node-Palette enthält alle verfügbaren Node-Typen für Ihren Bot-Flow. Klicken Sie auf einen Node-Typ, um ihn zum Canvas hinzuzufügen. Sie können Nodes per Drag & Drop verschieben und durch Klicken auf die Verbindungspunkte miteinander verbinden."
          size="sm"
          docLink={`/${locale}/docs#bot-builder`}
        />
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Ziehen Sie Nodes auf den Canvas oder klicken Sie zum Hinzufügen
      </p>
      
      <div className="space-y-2">
        {nodePaletteTypes.map((nodeType) => (
          <button
            key={nodeType.type}
            onClick={() => onAddNode(nodeType.type)}
            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-brand-green hover:bg-brand-light/10 transition-colors group"
            title={nodeType.description}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{nodeType.icon}</span>
              <div>
                <div className="font-medium text-gray-900 group-hover:text-brand-green">
                  {nodeType.label}
                </div>
                <div className="text-xs text-gray-500">
                  {nodeType.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Tipps:</p>
        <ul className="text-xs text-gray-500 space-y-1">
          <li>• Jeder Flow braucht einen Trigger</li>
          <li>• Verbinden Sie Nodes per Drag & Drop</li>
          <li>• Klicken Sie auf Nodes zum Konfigurieren</li>
        </ul>
      </div>
    </div>
  );
}

// ✅ Dynamischer Import mit SSR disabled (verhindert Hydration-Errors)
const NodePropertiesPanel = dynamic(() => import('./NodePropertiesPanel'), {
  ssr: false,
  loading: () => (
    <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Lade...</div>
      </div>
    </div>
  ),
});
import { FlowNode, FlowEdge, BotFlow } from '@/types/bot';
import { createClient } from '@/lib/supabase';
import TriggerNode from './nodes/TriggerNode';
import MessageNode from './nodes/MessageNode';
import QuestionNode from './nodes/QuestionNode';
import ConditionNode from './nodes/ConditionNode';
import AINode from './nodes/AINode';
import KnowledgeNode from './nodes/KnowledgeNode';
import EndNode from './nodes/EndNode';
import TemplateSelector from '@/components/templates/TemplateSelector';
import { Bot } from '@/types/bot';

interface BotBuilderProps {
  mode: 'create' | 'edit';
  botId?: string;
  bot?: Bot;
  initialFlow?: BotFlow;
  onFlowChange?: (flow: BotFlow) => void;
  demoMode?: boolean; // Wenn true, überspringt Auth und verwendet Demo-User-ID
  demoUserId?: string; // Demo-User-ID für Demo-Modus
}

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  question: QuestionNode,
  condition: ConditionNode,
  ai: AINode,
  knowledge: KnowledgeNode,
  end: EndNode,
};

export default function BotBuilder({ mode, botId, bot, initialFlow, onFlowChange, demoMode = false, demoUserId }: BotBuilderProps) {
  const router = useRouter();
  const locale = useLocale();
  const tSupport = useTranslations('support');
  const { addToast } = useToast();
  const { openTicket } = useSupportTicket();
  
  // ✅ Fix Hydration: Warte bis Client-seitig gerendert
  const [mounted, setMounted] = useState(false);
  // ✅ Fix Hydration: Initialisiere States mit leeren Arrays, lade Daten nach Mount
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [botName, setBotName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  
  // ✅ Undo/Redo History
  const [history, setHistory] = useState<Array<{ nodes: FlowNode[]; edges: FlowEdge[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const MAX_HISTORY = 50; // Maximale Anzahl von History-Einträgen
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // ✅ Client-seitige Initialisierung - Lade Daten nur nach Mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
      // Initialisiere Nodes/Edges nur client-seitig
      if (initialFlow?.nodes && initialFlow.nodes.length > 0) {
        setNodes(initialFlow.nodes);
      }
      if (initialFlow?.edges && initialFlow.edges.length > 0) {
        setEdges(initialFlow.edges);
      }
      if (initialFlow?.name) {
        setBotName(initialFlow.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Setze botId für alle Nodes beim Laden (wichtig für Knowledge Nodes)
  useEffect(() => {
    if (botId && nodes.length > 0) {
      // Prüfe ob bereits botId gesetzt ist (verhindere Endlosschleife)
      const needsUpdate = nodes.some((node) => !(node.data as any).botId);
      if (needsUpdate) {
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            data: {
              ...node.data,
              botId: botId, // ✅ Setze botId für alle Nodes
            },
          }))
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botId]); // Nur einmal ausführen wenn botId gesetzt wird

  // ✅ History Management - Speichere Zustand bei Änderungen
  const saveToHistory = useCallback((currentNodes: FlowNode[], currentEdges: FlowEdge[]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1); // Entferne Zukunft bei neuer Aktion
      newHistory.push({
        nodes: JSON.parse(JSON.stringify(currentNodes)), // Deep copy
        edges: JSON.parse(JSON.stringify(currentEdges)), // Deep copy
      });
      // Begrenze History auf MAX_HISTORY
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  // ✅ Undo-Funktion
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      if (prevState) {
        setNodes(prevState.nodes as any);
        setEdges(prevState.edges as any);
      }
      setHistoryIndex((prev) => prev - 1);
      addToast({
        type: 'success',
        title: 'Rückgängig',
        message: 'Letzte Aktion wurde rückgängig gemacht.',
      });
    }
  }, [history, historyIndex, setNodes, setEdges, addToast]);

  // ✅ Redo-Funktion
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      if (nextState) {
        setNodes(nextState.nodes as any);
        setEdges(nextState.edges as any);
        setHistoryIndex((prev) => prev + 1);
      }
      addToast({
        type: 'success',
        title: 'Wiederholen',
        message: 'Aktion wurde wiederholt.',
      });
    }
  }, [history, historyIndex, setNodes, setEdges, addToast]);

  // ✅ Keyboard Shortcuts für Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z (Mac) oder Ctrl+Z (Windows/Linux) für Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Cmd+Shift+Z oder Ctrl+Y für Redo
      if ((e.metaKey || e.ctrlKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // ✅ Initialisiere History beim ersten Laden
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      if (history.length === 0) {
        saveToHistory(nodes, edges);
      }
    }
  }, []); // Nur einmal beim Mount

  // ✅ Speichere in History bei wichtigen Änderungen (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToHistory(nodes, edges);
    }, 500); // 500ms Debounce
    return () => clearTimeout(timeoutId);
  }, [nodes.length, edges.length]); // Nur bei Strukturänderungen

  // Notify parent of flow changes
  useEffect(() => {
    if (onFlowChange) {
      const flow: BotFlow = {
        name: botName,
        nodes: nodes as FlowNode[],
        edges: edges as FlowEdge[],
      };
      onFlowChange(flow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, botName]); // onFlowChange is intentionally excluded to avoid infinite loops

  // Auto-save every 30 seconds
  useEffect(() => {
    if (mode === 'edit' && botId) {
      const interval = setInterval(() => {
        handleSave(true); // Silent save
      }, 30000);
      return () => clearInterval(interval);
    }
    return undefined; // Explicit return for all code paths
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, botId, nodes, edges, botName]); // handleSave is intentionally excluded to avoid re-creating interval

  const handleTemplateSelected = (flow: BotFlow) => {
    setNodes(flow.nodes as any);
    setEdges(flow.edges as any);
    setBotName(flow.name);
    addToast({
      type: 'success',
      title: 'Template geladen',
      message: 'Template wurde erfolgreich geladen. Du kannst es jetzt anpassen.',
    });
  };

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const handleEdgeMouseEnter = useCallback((_event: any, edge: Edge) => {
    setHoveredEdgeId(edge.id);
  }, []);

  const handleEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  const handleAddNode = (type: NodeType) => {
    const newNode: FlowNode = {
      id: `${type}-${crypto.randomUUID()}`,
      type,
      position: {
        // ✅ Fix Hydration: Verwende deterministische Positionen statt Math.random()
        // Für bessere UX: Zentriere neue Nodes im sichtbaren Bereich
        x: 300,
        y: 300,
      },
      data: {
        label: type.charAt(0).toUpperCase() + type.slice(1),
        config: {},
        botId: botId || undefined, // ✅ Setze botId für Knowledge Nodes
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      
      // ✅ Handle node deletion
      changes.forEach((change: any) => {
        if (change.type === 'remove') {
          // Clear selected node if it was deleted
          if (selectedNode?.id === change.id) {
            setSelectedNode(null);
          }
        }
      });
      
      // Update selected node if it was moved
      if (selectedNode) {
        const updatedNode = nodes.find((n) => n.id === selectedNode.id);
        if (updatedNode) {
          setSelectedNode(updatedNode);
        }
      }
    },
    [onNodesChange, selectedNode, nodes]
  );

  const handleUpdateNodeConfig = (nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, config } }
          : node
      )
    );

    // Update selected node
    if (selectedNode?.id === nodeId) {
      setSelectedNode({
        ...selectedNode,
        data: { ...selectedNode.data, config },
      });
    }
  };

  const handleSave = async (silent = false) => {
    if (!botName.trim()) {
      if (!silent) {
        addToast({
          type: 'error',
          title: 'Fehler',
          message: 'Bitte geben Sie einen Bot-Namen ein.',
        });
      }
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();
      
      // Demo-Modus: Verwende Demo-User-ID statt Auth
      let userId: string;
      if (demoMode && demoUserId) {
        userId = demoUserId;
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('Nicht angemeldet');
        }
        userId = user.id;
      }

      const flowData: BotFlow = {
        name: botName,
        nodes: nodes as FlowNode[],
        edges: edges as FlowEdge[],
        metadata: {
          version: 1,
          updated_at: new Date().toISOString(),
        },
      };

      if (mode === 'create') {
        // Check subscription limits (skip in demo mode)
        if (!demoMode) {
          const { canCreateBot } = await import('@/lib/subscriptions');
          const canCreate = await canCreateBot(userId);
          
          if (!canCreate.allowed) {
            setIsSaving(false);
            addToast({
              type: 'error',
              title: 'Limit erreicht',
              message: canCreate.reason || 'Sie haben das Bot-Limit Ihres Plans erreicht. Bitte upgraden Sie Ihren Plan.',
            });
            return;
          }
        }

        // Create new bot
        const { data: bot, error: botError } = await supabase
          .from('bots')
          .insert({
            name: botName,
            user_id: userId,
            status: 'draft',
            bot_config: flowData,
            is_demo: demoMode, // Markiere als Demo-Bot
          })
          .select()
          .single();

        if (botError) throw botError;

        // Create flow
        const { error: flowError } = await supabase
          .from('bot_flows')
          .insert({
            bot_id: bot.id,
            name: flowData.name,
            flow_data: flowData,
            is_active: false,
          });

        if (flowError) throw flowError;

        if (!silent) {
          addToast({
            type: 'success',
            title: 'Bot erstellt',
            message: 'Ihr Bot wurde erfolgreich erstellt.',
          });
        }

        // Im Demo-Modus: Redirect zum Demo-Dashboard
        if (demoMode) {
          router.push(`/${locale}/demo/dashboard`);
        } else {
          router.push(`/${locale}/bots/${bot.id}`);
        }
      } else if (mode === 'edit' && botId) {
        // Update existing bot
        const updateData: any = {
          name: botName,
          bot_config: flowData,
          updated_at: new Date().toISOString(),
        };
        
        // Im Demo-Modus: Aktualisiere auch is_demo Flag
        if (demoMode) {
          updateData.is_demo = true;
        }
        
        // Build query condition
        let query = supabase
          .from('bots')
          .update(updateData)
          .eq('id', botId);
        
        // Im Demo-Modus: Auch user_id prüfen
        if (demoMode && demoUserId) {
          query = query.eq('user_id', demoUserId);
        }

        const { error: botError } = await query;

        if (botError) throw botError;

        // Update flow
        const { error: flowError } = await supabase
          .from('bot_flows')
          .update({
            name: flowData.name,
            flow_data: flowData,
            updated_at: new Date().toISOString(),
          })
          .eq('bot_id', botId)
          .eq('is_active', true);

        if (flowError) throw flowError;

        if (!silent) {
          addToast({
            type: 'success',
            title: 'Gespeichert',
            message: 'Ihr Bot wurde erfolgreich gespeichert.',
          });
        }
      }
    } catch (error: any) {
      console.error('Save error:', error);
      if (!silent) {
        addToast({
          type: 'error',
          title: 'Fehler',
          message: error.message || 'Bot konnte nicht gespeichert werden.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const styledEdges = useMemo(() => {
    return edges.map((edge) => ({
      ...edge,
      style: {
        ...DEFAULT_EDGE_OPTIONS.style,
        ...((edge as any).style ?? {}),
        ...(edge.id === hoveredEdgeId ? HOVER_EDGE_STYLE : {}),
      },
    }));
  }, [edges, hoveredEdgeId]);

  // ✅ Verhindere Hydration-Mismatch durch client-only Rendering
  if (!mounted) {
    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-500">Lade Bot Builder...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-4 flex-1">
          {/* ✅ Undo/Redo Buttons */}
          <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className={`p-2 rounded-lg transition-colors ${
                historyIndex <= 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-brand-green'
              }`}
              title="Rückgängig (Cmd+Z / Ctrl+Z)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className={`p-2 rounded-lg transition-colors ${
                historyIndex >= history.length - 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-brand-green'
              }`}
              title="Wiederholen (Cmd+Shift+Z / Ctrl+Y)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m0-6l6-6" />
              </svg>
            </button>
          </div>
          
          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            placeholder="Bot-Name eingeben..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent"
          />
          <span className="text-sm text-gray-500">
            {nodes.length} Nodes, {edges.length} Verbindungen
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => openTicket({
              context: 'bot_builder',
              referenceId: botId,
              extra: {
                selectedNodeId: selectedNode?.id,
                nodeType: selectedNode?.type,
              },
            })}
          >
            {tSupport('cta')}
          </Button>
          {nodes.length === 0 && bot && (
            <Button variant="outline" onClick={() => setShowTemplateSelector(true)}>
              📋 Template auswählen
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.back()}
          >
            Abbrechen
          </Button>
          <Button
            variant="primary"
            onClick={() => handleSave(false)}
            isLoading={isSaving}
          >
            {mode === 'create' ? 'Erstellen' : 'Speichern'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Node Palette */}
        <NodePalette onAddNode={handleAddNode} locale={locale} />

        {/* Flow Canvas */}
        <div className="flex-1 relative">
          {mounted && (
            <ReactFlow
              nodes={nodes}
              edges={styledEdges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
              connectionLineStyle={CONNECTION_LINE_STYLE}
              onEdgeMouseEnter={handleEdgeMouseEnter}
              onEdgeMouseLeave={handleEdgeMouseLeave}
              snapToGrid
              snapGrid={SNAP_GRID}
              fitView
              className="bg-gray-50"
              deleteKeyCode="Delete"
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          )}
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <NodePropertiesPanel
            node={selectedNode}
            onUpdate={handleUpdateNodeConfig}
            onClose={() => setSelectedNode(null)}
            botId={botId} // ✅ botId als Prop übergeben (Fallback falls node.data.botId fehlt)
          />
        )}
      </div>

      {/* Template Selector Modal */}
      {showTemplateSelector && bot && (
        <TemplateSelector
          bot={bot}
          onTemplateSelected={handleTemplateSelected}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </div>
  );
}
