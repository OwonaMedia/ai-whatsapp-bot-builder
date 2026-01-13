import { Handle, Position, NodeProps } from '@xyflow/react';

export default function AINode({ data }: NodeProps) {
  const model = (data.config as any)?.ai_model || 'groq';
  
  return (
    <div className="px-4 py-3 bg-indigo-500 text-white rounded-lg shadow-md min-w-[180px]">
      <Handle type="target" position={Position.Left} className="w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-sm" />
      <div className="flex items-center gap-2">
        <span className="text-xl">🤖</span>
        <div className="flex-1">
              <div className="font-semibold">{(data.label as string) || 'AI Antwort'}</div>
          <div className="text-xs opacity-80 uppercase">{model}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-sm" />
    </div>
  );
}

