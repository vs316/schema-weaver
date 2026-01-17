import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Map } from 'lucide-react';

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
  onCollapse?: (collapsed: boolean) => void;
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
  onCollapse,
}: MinimapProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const handleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapse?.(newCollapsed);
  };

  if (tables.length === 0) return null;

  return (
    <AnimatePresence>
      {isCollapsed ? (
        <motion.button
          key="collapsed"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={handleCollapse}
          className={`absolute top-16 right-4 p-2.5 rounded-lg border shadow-lg z-30 transition-colors ${
            isDarkMode 
              ? 'bg-slate-900/90 border-slate-700 hover:bg-slate-800 text-slate-400' 
              : 'bg-white/90 border-slate-200 hover:bg-slate-100 text-slate-600'
          }`}
          style={{ backdropFilter: 'blur(8px)' }}
          title="Show Minimap"
        >
          <Map size={18} />
        </motion.button>
      ) : (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`absolute top-16 right-4 rounded-lg border shadow-lg overflow-hidden z-30 ${
            isDarkMode ? 'bg-slate-900/90 border-slate-700' : 'bg-white/90 border-slate-200'
          }`}
          style={{ 
            width: MINIMAP_WIDTH, 
            height: MINIMAP_HEIGHT,
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Close button */}
          <button
            onClick={handleCollapse}
            className={`absolute top-1 right-1 p-1 rounded z-10 transition-colors ${
              isDarkMode 
                ? 'hover:bg-slate-700/60 text-slate-400' 
                : 'hover:bg-slate-200/60 text-slate-500'
            }`}
            title="Collapse Minimap"
          >
            <X size={12} />
          </button>

          {/* Clickable minimap area */}
          <div 
            className="w-full h-full cursor-pointer"
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
          </div>

          {/* Label */}
          <div className={`absolute bottom-1 left-1 text-[8px] font-bold uppercase tracking-wider ${
            isDarkMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            Minimap
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
