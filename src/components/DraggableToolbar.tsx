import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripHorizontal, Minimize2, Maximize2 } from 'lucide-react';

interface DraggableToolbarProps {
  children: React.ReactNode;
  label?: string;
  initialPosition?: { x: number; y: number };
  isDarkMode: boolean;
  className?: string;
  isCollapsible?: boolean;
}

export function DraggableToolbar({
  children,
  label,
  initialPosition,
  isDarkMode,
  className = '',
  isCollapsible = true,
}: DraggableToolbarProps) {
  const [position, setPosition] = useState(initialPosition ?? { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.toolbar-content')) return;
    if ((e.target as HTMLElement).closest('.collapse-btn')) return;
    e.preventDefault();
    setIsDragging(true);
    const rect = toolbarRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.toolbar-content')) return;
    if ((e.target as HTMLElement).closest('.collapse-btn')) return;
    const touch = e.touches[0];
    setIsDragging(true);
    const rect = toolbarRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const parent = toolbarRef.current?.parentElement;
      if (!parent) return;
      
      const parentRect = parent.getBoundingClientRect();
      const toolbarRect = toolbarRef.current?.getBoundingClientRect();
      if (!toolbarRect) return;

      let newX = e.clientX - parentRect.left - dragOffset.x;
      let newY = e.clientY - parentRect.top - dragOffset.y;

      newX = Math.max(0, Math.min(newX, parentRect.width - toolbarRect.width));
      newY = Math.max(0, Math.min(newY, parentRect.height - toolbarRect.height));

      setPosition({ x: newX, y: newY });
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const parent = toolbarRef.current?.parentElement;
      if (!parent) return;
      
      const parentRect = parent.getBoundingClientRect();
      const toolbarRect = toolbarRef.current?.getBoundingClientRect();
      if (!toolbarRect) return;

      let newX = touch.clientX - parentRect.left - dragOffset.x;
      let newY = touch.clientY - parentRect.top - dragOffset.y;

      newX = Math.max(0, Math.min(newX, parentRect.width - toolbarRect.width));
      newY = Math.max(0, Math.min(newY, parentRect.height - toolbarRect.height));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <motion.div
      ref={toolbarRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`absolute z-30 ${className}`}
      style={{
        left: position.x || undefined,
        top: position.y || undefined,
        bottom: position.y === 0 && !initialPosition ? 24 : undefined,
        cursor: isDragging ? 'grabbing' : 'default',
        touchAction: 'none',
      }}
    >
      <div
        className="flex items-center gap-1.5 px-2 py-2 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-200"
        style={{
          background: isDarkMode ? 'hsl(222 47% 8% / 0.95)' : 'hsl(0 0% 100% / 0.95)',
          borderColor: 'hsl(var(--border))',
          boxShadow: isDarkMode 
            ? '0 8px 32px -8px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)' 
            : '0 8px 32px -8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
        }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-grab hover:bg-muted/50 transition-colors touch-none"
          style={{ color: 'hsl(var(--muted-foreground))' }}
          title="Drag to move toolbar"
        >
          <GripHorizontal size={14} />
          {label && (
            <span className="text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap">
              {label}
            </span>
          )}
        </div>
        
        {!isCollapsed && (
          <>
            <div className="w-px h-6 bg-border" />
            
            {/* Toolbar content */}
            <div className="toolbar-content flex items-center gap-1.5">
              {children}
            </div>
          </>
        )}

        {isCollapsible && (
          <>
            <div className="w-px h-6 bg-border" />
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="collapse-btn p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              style={{ color: 'hsl(var(--muted-foreground))' }}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
