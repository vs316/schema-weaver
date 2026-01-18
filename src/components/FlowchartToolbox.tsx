import React from 'react';
import { motion } from 'framer-motion';
import { 
  Circle, 
  Square, 
  Diamond, 
  ArrowRight,
  FileText,
  Database,
  Maximize2,
} from 'lucide-react';
import type { FlowchartNodeType } from '../types/uml';
import { FLOWCHART_NODE_LABELS } from '../types/uml';

interface FlowchartToolboxProps {
  onAddNode: (type: FlowchartNodeType) => void;
  isDarkMode: boolean;
  isLocked: boolean;
}

const NODE_ICONS: Record<FlowchartNodeType, React.ReactNode> = {
  'start-end': <Circle size={16} />,
  'process': <Square size={16} />,
  'decision': <Diamond size={16} />,
  'input-output': <ArrowRight size={16} />,
  'document': <FileText size={16} />,
  'data': <Database size={16} />,
  'connector': <Maximize2 size={16} />,
};

const NODE_COLORS: Record<FlowchartNodeType, string> = {
  'start-end': 'hsl(142 76% 36%)',
  'process': 'hsl(239 84% 67%)',
  'decision': 'hsl(38 92% 50%)',
  'input-output': 'hsl(199 89% 48%)',
  'document': 'hsl(262 83% 58%)',
  'data': 'hsl(339 90% 51%)',
  'connector': 'hsl(215 20% 65%)',
};

export function FlowchartToolbox({
  onAddNode,
  isDarkMode,
  isLocked,
}: FlowchartToolboxProps) {
  if (isLocked) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl border shadow-lg backdrop-blur-sm"
        style={{
          background: isDarkMode ? 'hsl(222 47% 11% / 0.9)' : 'hsl(0 0% 100% / 0.9)',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <span className="text-[10px] font-medium px-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Add Node:
        </span>
        
        {(Object.keys(FLOWCHART_NODE_LABELS) as FlowchartNodeType[]).map((type) => (
          <motion.button
            key={type}
            onClick={() => onAddNode(type)}
            className="flex items-center justify-center w-9 h-9 rounded-lg transition-all hover:scale-110"
            style={{
              background: `${NODE_COLORS[type]}20`,
              color: NODE_COLORS[type],
            }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            title={FLOWCHART_NODE_LABELS[type]}
          >
            {NODE_ICONS[type]}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// Flowchart Editor Sidebar
interface FlowchartNodeEditorProps {
  node: {
    id: string;
    type: FlowchartNodeType;
    label: string;
    color?: string;
  };
  isLocked: boolean;
  onUpdate: (updates: Partial<{ label: string; color: string }>) => void;
  onDelete: () => void;
}

export function FlowchartNodeEditor({
  node,
  isLocked,
  onUpdate,
  onDelete,
}: FlowchartNodeEditorProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Node Type
        </label>
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border"
          style={{
            background: 'hsl(var(--muted))',
            borderColor: 'hsl(var(--border))',
          }}
        >
          <span style={{ color: NODE_COLORS[node.type] }}>{NODE_ICONS[node.type]}</span>
          <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
            {FLOWCHART_NODE_LABELS[node.type]}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Label
        </label>
        <input
          type="text"
          value={node.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          disabled={isLocked}
          className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
          style={{
            background: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
          placeholder="Enter label..."
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(NODE_COLORS).map(([key, color]) => (
            <button
              key={key}
              onClick={() => onUpdate({ color })}
              disabled={isLocked}
              className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                node.color === color ? 'ring-2 ring-offset-2 ring-primary' : ''
              }`}
              style={{
                background: color,
                borderColor: 'transparent',
              }}
            />
          ))}
        </div>
      </div>

      {!isLocked && (
        <button
          onClick={onDelete}
          className="w-full py-2 rounded-lg text-xs font-medium transition-colors bg-destructive/10 text-destructive hover:bg-destructive/20"
        >
          Delete Node
        </button>
      )}
    </div>
  );
}
