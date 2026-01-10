import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

interface MinimapProps {
  tables: Array<{ x: number; y: number; id: string }>;
  viewport: { x: number; y: number; zoom: number };
  isDarkMode: boolean;
  onViewportChange: (x: number, y: number, zoom: number) => void;
}

const TABLE_W = 224;
const HEADER_H = 40;
const PADDING = 40;

export function Minimap({
  tables,
  viewport,
  isDarkMode,
  onViewportChange,
}: MinimapProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  const { bounds, scale } = useMemo(() => {
    if (tables.length === 0) {
      return {
        bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600, padding: PADDING },
        scale: 1
      };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const t of tables) {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + TABLE_W);
      maxY = Math.max(maxY, t.y + HEADER_H + 60);
    }

    const contentWidth = (maxX - minX) + PADDING * 2;
    const contentHeight = (maxY - minY) + PADDING * 2;
    const minimapWidth = 160;
    const minimapHeight = 120;

    const scaleX = minimapWidth / contentWidth;
    const scaleY = minimapHeight / contentHeight;
    const finalScale = Math.min(scaleX, scaleY, 1);

    return {
      bounds: { minX, minY, maxX, maxY, padding: PADDING },
      scale: finalScale
    };
  }, [tables]);

  const getVisibleRect = () => {
    const viewportWidth = window.innerWidth / viewport.zoom;
    const viewportHeight = window.innerHeight / viewport.zoom;

    return {
      x: ((viewport.x / viewport.zoom) - bounds.minX + bounds.padding) * scale,
      y: ((viewport.y / viewport.zoom) - bounds.minY + bounds.padding) * scale,
      width: viewportWidth * scale,
      height: viewportHeight * scale,
    };
  };

  const handleMinimapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale + bounds.minX - bounds.padding;
    const y = (e.clientY - rect.top) / scale + bounds.minY - bounds.padding;

    onViewportChange(
      x - window.innerWidth / (2 * viewport.zoom),
      y - window.innerHeight / (2 * viewport.zoom),
      viewport.zoom
    );
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={`absolute top-6 right-6 p-2 rounded-lg backdrop-blur-md border transition-all hover:scale-110 z-20
          ${isDarkMode 
            ? "bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800/60"
            : "bg-white/70 border-slate-300 text-slate-700 hover:bg-white/80"
          }
        `}
        title="Show minimap"
      >
        <ChevronDown size={16} className="rotate-180" />
      </button>
    );
  }

  const minimapWidth = 160;
  const minimapHeight = 120;
  const visibleRect = getVisibleRect();

  return (
    <div
      className={`absolute top-6 right-6 rounded-lg backdrop-blur-md border p-3 shadow-lg transition-all duration-300 z-20
        ${isDarkMode
          ? "bg-slate-900/80 border-slate-700"
          : "bg-white/90 border-slate-300"
        }
      `}
    >
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/50">
        <span className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
          Minimap
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className={`p-1 rounded hover:bg-slate-700/20 transition-colors ${isDarkMode ? "text-slate-500 hover:text-slate-300" : "text-slate-600 hover:text-slate-800"}`}
          title="Hide minimap"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <svg
        width={minimapWidth}
        height={minimapHeight}
        viewBox={`0 0 ${minimapWidth} ${minimapHeight}`}
        className="bg-slate-950/20 rounded border cursor-pointer hover-glow"
        onClick={handleMinimapClick}
        style={{
          borderColor: isDarkMode ? "rgba(71, 85, 105, 0.3)" : "rgba(203, 213, 225, 0.5)"
        }}
      >
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path 
              d="M 10 0 L 0 0 0 10" 
              fill="none" 
              stroke={isDarkMode ? "rgba(71, 85, 105, 0.1)" : "rgba(203, 213, 225, 0.2)"} 
              strokeWidth="0.5"
            />
          </pattern>
        </defs>

        <rect width={minimapWidth} height={minimapHeight} fill="url(#grid)" />

        {tables.map((table) => {
          const px = (table.x - bounds.minX + bounds.padding) * scale;
          const py = (table.y - bounds.minY + bounds.padding) * scale;
          const pw = TABLE_W * scale;
          const ph = (HEADER_H + 60) * scale;

          return (
            <rect
              key={table.id}
              x={px}
              y={py}
              width={pw}
              height={ph}
              fill={isDarkMode ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.2)"}
              stroke={isDarkMode ? "rgba(99, 102, 241, 0.6)" : "rgba(99, 102, 241, 0.5)"}
              strokeWidth="1"
              rx="2"
            />
          );
        })}

        <rect
          x={visibleRect.x}
          y={visibleRect.y}
          width={visibleRect.width}
          height={visibleRect.height}
          fill="rgba(99, 102, 241, 0.15)"
          stroke="rgba(99, 102, 241, 0.8)"
          strokeWidth="1.5"
          rx="1"
          style={{
            filter: "drop-shadow(0 0 3px rgba(99, 102, 241, 0.4))"
          }}
        />
      </svg>

      <div className={`text-xs mt-2 pt-2 border-t border-slate-700/50 ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>
        Zoom: {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}