import { Handle, Position, NodeProps } from '@xyflow/react';

export default function ConditionNode({ data }: NodeProps) {
  const config = data.config as any;
  const conditionText = config?.condition_value || 'Bedingung';
  
  return (
    <div className="px-4 py-3 bg-yellow-500 text-white rounded-lg shadow-md min-w-[180px]">
      <Handle type="target" position={Position.Left} className="w-4 h-4 rounded-full bg-white border-2 border-yellow-500 shadow-sm" />
      <div className="flex items-center gap-2">
        <span className="text-xl">🔀</span>
        <div className="flex-1">
          <div className="font-semibold">{(data.label as string) || 'Bedingung'}</div>
          <div className="text-xs opacity-80 truncate">{conditionText}</div>
        </div>
      </div>
      <div className="flex gap-2 mt-2">
        <Handle
          type="source"
          position={Position.Bottom}
          id="true"
          className="w-4 h-4 rounded-full bg-green-400 border-2 border-white shadow-sm"
        />
        <div className="text-xs flex-1 text-center">TRUE</div>
        <Handle
          type="source"
          position={Position.Bottom}
          id="false"
          className="w-4 h-4 rounded-full bg-red-400 border-2 border-white shadow-sm"
        />
        <div className="text-xs flex-1 text-center">FALSE</div>
      </div>
    </div>
  );
}

