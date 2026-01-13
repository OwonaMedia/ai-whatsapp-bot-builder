import { Handle, Position, NodeProps } from '@xyflow/react';

export default function QuestionNode({ data }: NodeProps) {
  const config = data.config as any;
  const questionPreview = config?.question_text?.substring(0, 30) || 'Frage eingeben...';
  const optionsCount = config?.options?.length || 0;
  
  return (
    <div className="px-4 py-3 bg-purple-500 text-white rounded-lg shadow-md min-w-[200px]">
      <Handle type="target" position={Position.Left} className="w-4 h-4 rounded-full bg-white border-2 border-purple-500 shadow-sm" />
      <div className="flex items-center gap-2">
        <span className="text-xl">❓</span>
        <div className="flex-1">
          <div className="font-semibold">{(data.label as string) || 'Frage'}</div>
          <div className="text-xs opacity-80 truncate">{questionPreview}</div>
          {optionsCount > 0 && (
            <div className="text-xs opacity-60 mt-1">{optionsCount} Optionen</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="w-4 h-4 rounded-full bg-white border-2 border-purple-500 shadow-sm" />
    </div>
  );
}

