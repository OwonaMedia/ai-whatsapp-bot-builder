import { Handle, Position, NodeProps } from '@xyflow/react';

export default function EndNode({ data }: NodeProps) {
  return (
    <div className="px-4 py-3 bg-red-500 text-white rounded-lg shadow-md min-w-[150px]">
      <Handle type="target" position={Position.Left} className="w-4 h-4 rounded-full bg-white border-2 border-red-500 shadow-sm" />
      <div className="flex items-center gap-2">
        <span className="text-xl">🏁</span>
        <div>
          <div className="font-semibold">{(data.label as string) || 'Ende'}</div>
          <div className="text-xs opacity-80">Gespräch beenden</div>
        </div>
      </div>
    </div>
  );
}

