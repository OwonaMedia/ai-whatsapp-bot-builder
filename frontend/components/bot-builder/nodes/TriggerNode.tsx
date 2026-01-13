import { Handle, Position, NodeProps } from '@xyflow/react';

export default function TriggerNode({ data }: NodeProps) {
  const config = data.config as any;
  const triggerType = config?.trigger_type || 'whatsapp_message';
  
  const typeIcons = {
    whatsapp_message: '📱',
    web_chat: '💬',
    customer_service_chat: '🎧',
    keyword: '🔑',
    always: '⚡',
  };

  const typeLabels = {
    whatsapp_message: 'WhatsApp',
    web_chat: 'Web Chat',
    customer_service_chat: 'Customer Service',
    keyword: 'Keyword',
    always: 'Immer',
  };
  
  return (
    <div className="px-4 py-3 bg-brand-green text-white rounded-lg shadow-md min-w-[150px]">
      <div className="flex items-center gap-2">
        <span className="text-xl">{typeIcons[triggerType as keyof typeof typeIcons] || '🎬'}</span>
        <div>
          <div className="font-semibold">{(data.label as string) || 'Trigger'}</div>
          <div className="text-xs opacity-80">{typeLabels[triggerType as keyof typeof typeLabels] || triggerType}</div>
          {config?.keyword && (
            <div className="text-xs opacity-60 mt-1">"{config.keyword}"</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-4 h-4 rounded-full bg-white border-2 border-brand-green shadow-sm" />
    </div>
  );
}


