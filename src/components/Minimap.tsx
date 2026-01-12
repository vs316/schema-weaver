import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Table {
  id: string;
  name: string;
  x: number;
  y: number;
  color?: string;
}

interface MinimapProps {
  tables: Table[];
  viewport: { x: number; y: number; zoom: number };
  canvasWidth: number;
  canvasHeight: number;
  onViewportChange: (x: number, y: number) => void;
  isDarkMode: boolean;
}

const MINIMAP_WIDTH = 160;
const MINIMAP_HEIGHT = 100;
const TABLE_W = 224;
const TABLE_H = 60;

export function Minimap({
  tables,
  viewport,
  canvasWidth,
  canvasHeight,
  onViewportChange,
  isDarkMode,
}: MinimapProps) {
  const { bounds, scale } = useMemo(() => {
    if (tables.length === 0) {
      return {
        bounds: { minX: 0, minY: 0, maxX: 1000, maxY: 800 },
        scale: 0.1,
      };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const t of tables) {
      minX = Math.min(minX, t.x - 50);
      minY = Math.min(minY, t.y - 50);
      maxX = Math.max(maxX, t.x + TABLE_W + 50);
      maxY = Math.max(maxY, t.y + TABLE_H + 50);
    }

    const width = maxX - minX || 1000;
    const height = maxY - minY || 800;
    const scaleX = MINIMAP_WIDTH / width;
    const scaleY = MINIMAP_HEIGHT / height;
    const scale = Math.min(scaleX, scaleY, 0.15);

    return { bounds: { minX, minY, maxX, maxY }, scale };
  }, [tables]);

  const viewportRect = useMemo(() => {
    const vw = canvasWidth / viewport.zoom;
    const vh = canvasHeight / viewport.zoom;
    const vx = -viewport.x / viewport.zoom;
    const vy = -viewport.y / viewport.zoom;

    return {
      x: (vx - bounds.minX) * scale,
      y: (vy - bounds.minY) * scale,
      width: vw * scale,
      height: vh * scale,
    };
  }, [viewport, canvasWidth, canvasHeight, bounds, scale]);

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const worldX = clickX / scale + bounds.minX;
    const worldY = clickY / scale + bounds.minY;

    const newViewportX = -worldX * viewport.zoom + canvasWidth / 2;
    const newViewportY = -worldY * viewport.zoom + canvasHeight / 2;

    onViewportChange(newViewportX, newViewportY);
  };

  if (tables.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`absolute top-16 right-4 rounded-lg border shadow-lg overflow-hidden cursor-pointer z-30 ${
        isDarkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'
      }`}
      style={{ 
        width: MINIMAP_WIDTH, 
        height: MINIMAP_HEIGHT,
        backdropFilter: 'blur(8px)',
      }}
      onClick={handleClick}
    >
      {/* Table dots */}
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} className="absolute inset-0">
        {tables.map((table) => (
          <rect
            key={table.id}
            x={(table.x - bounds.minX) * scale}
            y={(table.y - bounds.minY) * scale}
            width={TABLE_W * scale}
            height={TABLE_H * scale}
            fill={table.color || (isDarkMode ? '#475569' : '#94a3b8')}
            rx={2}
            opacity={0.8}
          />
        ))}
        
        {/* Viewport indicator */}
        <rect
          x={viewportRect.x}
          y={viewportRect.y}
          width={Math.max(viewportRect.width, 10)}
          height={Math.max(viewportRect.height, 10)}
          fill="transparent"
          stroke="#6366f1"
          strokeWidth={1.5}
          rx={2}
        />
      </svg>

      {/* Label */}
      <div className={`absolute bottom-1 left-1 text-[8px] font-bold uppercase tracking-wider ${
        isDarkMode ? 'text-slate-500' : 'text-slate-400'
      }`}>
        Minimap
      </div>
    </motion.div>
  );
}