'use client';

import { NodeType } from '@/types/bot';
import { Button } from '@/components/ui/Button';

interface NodePaletteProps {
  onAddNode: (type: NodeType) => void;
}

const nodeTypes: Array<{
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

export default function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h3 className="font-semibold text-gray-900 mb-4">Node-Palette</h3>
      <p className="text-xs text-gray-500 mb-4">
        Ziehen Sie Nodes auf den Canvas oder klicken Sie zum Hinzufügen
      </p>
      
      <div className="space-y-2">
        {nodeTypes.map((nodeType) => (
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

