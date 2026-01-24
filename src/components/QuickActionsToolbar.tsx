import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2, Redo2, Maximize2, ChevronUp, ChevronDown, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface QuickActionsToolbarProps {
  isDarkMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFitToContent: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetViewport?: () => void;
}

export function QuickActionsToolbar({
  isDarkMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFitToContent,
  onZoomIn,
  onZoomOut,
  onResetViewport,
}: QuickActionsToolbarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed left-4 top-1/2 -translate-y-1/2 z-40"
    >
      <div
        className="flex flex-col items-center gap-1 p-2 rounded-2xl border shadow-xl backdrop-blur-md"
        style={{
          background: isDarkMode ? 'hsl(222 47% 8% / 0.95)' : 'hsl(0 0% 100% / 0.95)',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg transition-all hover:scale-105"
          style={{
            background: 'hsl(var(--muted) / 0.5)',
            color: 'hsl(var(--muted-foreground))',
          }}
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col items-center gap-1 overflow-hidden"
            >
              <div className="w-6 h-px my-1" style={{ background: 'hsl(var(--border))' }} />
              
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-2.5 rounded-lg transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: canUndo ? 'hsl(var(--primary) / 0.15)' : 'transparent',
                  color: canUndo ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                }}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={18} />
              </button>

              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="p-2.5 rounded-lg transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: canRedo ? 'hsl(var(--primary) / 0.15)' : 'transparent',
                  color: canRedo ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                }}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 size={18} />
              </button>

              <div className="w-6 h-px my-1" style={{ background: 'hsl(var(--border))' }} />

              {onZoomIn && (
                <button
                  onClick={onZoomIn}
                  className="p-2.5 rounded-lg transition-all hover:scale-105"
                  style={{
                    background: 'hsl(var(--muted) / 0.5)',
                    color: 'hsl(var(--foreground))',
                  }}
                  title="Zoom In (+)"
                >
                  <ZoomIn size={18} />
                </button>
              )}

              {onZoomOut && (
                <button
                  onClick={onZoomOut}
                  className="p-2.5 rounded-lg transition-all hover:scale-105"
                  style={{
                    background: 'hsl(var(--muted) / 0.5)',
                    color: 'hsl(var(--foreground))',
                  }}
                  title="Zoom Out (-)"
                >
                  <ZoomOut size={18} />
                </button>
              )}

              <button
                onClick={onFitToContent}
                className="p-2.5 rounded-lg transition-all hover:scale-105"
                style={{
                  background: 'hsl(var(--success) / 0.15)',
                  color: 'hsl(var(--success))',
                }}
                title="Fit to Content (F)"
              >
                <Maximize2 size={18} />
              </button>

              {onResetViewport && (
                <button
                  onClick={onResetViewport}
                  className="p-2.5 rounded-lg transition-all hover:scale-105"
                  style={{
                    background: 'hsl(var(--muted) / 0.5)',
                    color: 'hsl(var(--foreground))',
                  }}
                  title="Reset View"
                >
                  <Move size={18} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
