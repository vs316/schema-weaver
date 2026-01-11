import { useMemo } from 'react';
import type { Json } from '../integrations/supabase/types';

interface Table {
  id: string;
  name: string;
  x: number;
  y: number;
  color?: string;
  columns?: { id: string; name: string }[];
}

interface Relation {
  id: string;
  sourceTableId: string;
  targetTableId: string;
}

interface DiagramPreviewProps {
  tables: Json;
  relations: Json;
  isDarkMode?: boolean;
}

const PREVIEW_SIZE = 120;
const TABLE_W = 224;
const TABLE_H = 60;

export function DiagramPreview({ tables: tablesJson, relations: relationsJson, isDarkMode = true }: DiagramPreviewProps) {
  const tables = (tablesJson as unknown as Table[]) || [];
  const relations = (relationsJson as unknown as Relation[]) || [];

  const { scale, offsetX, offsetY } = useMemo(() => {
    if (tables.length === 0) {
      return { scale: 0.1, offsetX: 0, offsetY: 0 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const t of tables) {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + TABLE_W);
      maxY = Math.max(maxY, t.y + TABLE_H);
    }

    const contentWidth = maxX - minX || 1;
    const contentHeight = maxY - minY || 1;
    const padding = 10;
    
    const scaleX = (PREVIEW_SIZE - padding * 2) / contentWidth;
    const scaleY = (PREVIEW_SIZE - padding * 2) / contentHeight;
    const scale = Math.min(scaleX, scaleY, 0.2);
    
    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;
    const offsetX = (PREVIEW_SIZE - scaledWidth) / 2 - minX * scale;
    const offsetY = (PREVIEW_SIZE - scaledHeight) / 2 - minY * scale;

    return { scale, offsetX, offsetY };
  }, [tables]);

  if (tables.length === 0) {
    return (
      <div 
        className={`flex items-center justify-center text-xs ${
          isDarkMode ? 'text-slate-600' : 'text-slate-400'
        }`}
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
      >
        Empty diagram
      </div>
    );
  }

  return (
    <svg 
      width={PREVIEW_SIZE} 
      height={PREVIEW_SIZE} 
      className={`rounded-lg ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}`}
    >
      {/* Relations */}
      {relations.map((rel) => {
        const source = tables.find((t) => t.id === rel.sourceTableId);
        const target = tables.find((t) => t.id === rel.targetTableId);
        if (!source || !target) return null;

        const sx = source.x * scale + offsetX + (TABLE_W * scale) / 2;
        const sy = source.y * scale + offsetY + (TABLE_H * scale) / 2;
        const tx = target.x * scale + offsetX + (TABLE_W * scale) / 2;
        const ty = target.y * scale + offsetY + (TABLE_H * scale) / 2;

        return (
          <line
            key={rel.id}
            x1={sx}
            y1={sy}
            x2={tx}
            y2={ty}
            stroke={isDarkMode ? '#475569' : '#94a3b8'}
            strokeWidth={1}
          />
        );
      })}

      {/* Tables */}
      {tables.map((table) => (
        <g key={table.id}>
          <rect
            x={table.x * scale + offsetX}
            y={table.y * scale + offsetY}
            width={TABLE_W * scale}
            height={TABLE_H * scale}
            fill={table.color || (isDarkMode ? '#475569' : '#94a3b8')}
            rx={2}
            stroke={isDarkMode ? '#64748b' : '#cbd5e1'}
            strokeWidth={0.5}
          />
        </g>
      ))}
    </svg>
  );
}