import { Handle, Position, NodeProps } from '@xyflow/react';

export default function MessageNode({ data }: NodeProps) {
  const config = data.config as any;
  const messagePreview = config?.message_text?.substring(0, 30) || 'Nachricht eingeben...';
  
  return (
    <div className="px-4 py-3 bg-blue-500 text-white rounded-lg shadow-md min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-sm" />
      <div className="flex items-center gap-2">
        <span className="text-xl">💬</span>
        <div className="flex-1">
          <div className="font-semibold">{(data.label as string) || 'Nachricht'}</div>
          <div className="text-xs opacity-80 truncate">{messagePreview}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-4 h-4 rounded-full bg-white border-2 border-blue-500 shadow-sm" />
    </div>
  );
}

