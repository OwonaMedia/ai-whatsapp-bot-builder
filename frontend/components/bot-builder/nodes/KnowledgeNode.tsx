import { Handle, Position, NodeProps } from '@xyflow/react';

export default function KnowledgeNode({ data }: NodeProps) {
  const config = data.config as any;
  const sourceType = config?.knowledge_source_type || 'url';
  const sourceName = config?.knowledge_source_url || config?.knowledge_source_title || config?.knowledge_source_id || 'Wissensquelle hinzufügen...';
  
  const typeIcons = {
    pdf: '📄',
    url: '🔗',
    text: '📝',
  };

  const typeLabels = {
    pdf: 'PDF',
    url: 'URL',
    text: 'Text',
  };
  
  return (
    <div className="px-4 py-3 bg-amber-500 text-white rounded-lg shadow-md min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-4 h-4 rounded-full bg-white border-2 border-amber-500 shadow-sm" />
      <div className="flex items-center gap-2">
        <span className="text-xl">{typeIcons[sourceType as keyof typeof typeIcons] || '📚'}</span>
        <div className="flex-1">
          <div className="font-semibold">{(data.label as string) || 'Wissensquelle'}</div>
          <div className="text-xs opacity-80 truncate">{typeLabels[sourceType as keyof typeof typeLabels]} • {sourceName}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-4 h-4 rounded-full bg-white border-2 border-amber-500 shadow-sm" />
    </div>
  );
}

