import { motion } from 'framer-motion';
import {
  Plus,
  Undo2,
  Redo2,
  Maximize2,
  Menu,
  Link2,
  Settings,
} from 'lucide-react';
import type { DiagramType } from '../types/uml';

interface MobileBottomNavProps {
  isDarkMode: boolean;
  diagramType: DiagramType;
  canUndo: boolean;
  canRedo: boolean;
  isLocked: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFitToContent: () => void;
  onAddElement: () => void;
  onStartConnection: () => void;
  onToggleSidebar: () => void;
  onShowMenu: () => void;
}

export function MobileBottomNav({
  isDarkMode,
  diagramType,
  canUndo,
  canRedo,
  isLocked,
  onUndo,
  onRedo,
  onFitToContent,
  onAddElement,
  onStartConnection,
  onToggleSidebar,
  onShowMenu,
}: MobileBottomNavProps) {
  const getAddLabel = () => {
    switch (diagramType) {
      case 'erd': return 'Table';
      case 'uml-class': return 'Class';
      case 'flowchart': return 'Node';
      case 'sequence': return 'Actor';
      default: return 'Add';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
    >
      <div
        className="mx-3 mb-3 px-2 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl"
        style={{
          background: isDarkMode ? 'hsl(222 47% 8% / 0.98)' : 'hsl(0 0% 100% / 0.98)',
          borderColor: 'hsl(var(--border))',
        }}
      >
        <div className="flex items-center justify-around">
          {/* Menu */}
          <button
            onClick={onShowMenu}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            <Menu size={22} />
            <span className="text-[9px] font-medium">Menu</span>
          </button>

          {/* Undo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 disabled:opacity-30"
            style={{ color: canUndo ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
          >
            <Undo2 size={22} />
            <span className="text-[9px] font-medium">Undo</span>
          </button>

          {/* Add (Primary Action) */}
          {!isLocked && (
            <button
              onClick={onAddElement}
              className="flex flex-col items-center gap-1 p-3 -mt-4 rounded-2xl shadow-lg transition-all active:scale-95"
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
              }}
            >
              <Plus size={24} />
              <span className="text-[9px] font-semibold">{getAddLabel()}</span>
            </button>
          )}

          {/* Redo */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 disabled:opacity-30"
            style={{ color: canRedo ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
          >
            <Redo2 size={22} />
            <span className="text-[9px] font-medium">Redo</span>
          </button>

          {/* Connect or Fit */}
          {!isLocked ? (
            <button
              onClick={onStartConnection}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              <Link2 size={22} />
              <span className="text-[9px] font-medium">Connect</span>
            </button>
          ) : (
            <button
              onClick={onFitToContent}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95"
              style={{ color: 'hsl(var(--success))' }}
            >
              <Maximize2 size={22} />
              <span className="text-[9px] font-medium">Fit</span>
            </button>
          )}

          {/* Sidebar Toggle */}
          <button
            onClick={onToggleSidebar}
            className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95"
            style={{ color: 'hsl(var(--muted-foreground))' }}
          >
            <Settings size={22} />
            <span className="text-[9px] font-medium">Panel</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
