import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GripHorizontal } from 'lucide-react';

interface DraggableToolbarProps {
  children: React.ReactNode;
  initialPosition?: { x: number; y: number };
  isDarkMode: boolean;
  className?: string;
}

export function DraggableToolbar({
  children,
  initialPosition,
  isDarkMode,
  className = '',
}: DraggableToolbarProps) {
  const [position, setPosition] = useState(initialPosition ?? { x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.toolbar-content')) return;
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

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const parent = toolbarRef.current?.parentElement;
      if (!parent) return;
      
      const parentRect = parent.getBoundingClientRect();
      const toolbarRect = toolbarRef.current?.getBoundingClientRect();
      if (!toolbarRect) return;

      // Calculate new position relative to parent
      let newX = e.clientX - parentRect.left - dragOffset.x;
      let newY = e.clientY - parentRect.top - dragOffset.y;

      // Clamp to parent bounds
      newX = Math.max(0, Math.min(newX, parentRect.width - toolbarRect.width));
      newY = Math.max(0, Math.min(newY, parentRect.height - toolbarRect.height));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
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
      }}
    >
      <div
        className="flex items-center gap-1 px-2 py-2 rounded-xl border shadow-lg backdrop-blur-sm"
        style={{
          background: isDarkMode ? 'hsl(222 47% 11% / 0.95)' : 'hsl(0 0% 100% / 0.95)',
          borderColor: 'hsl(var(--border))',
        }}
      >
        {/* Drag handle */}
        <div
          onMouseDown={handleMouseDown}
          className="flex items-center justify-center p-1.5 rounded-lg cursor-grab hover:bg-muted/50 transition-colors"
          style={{ color: 'hsl(var(--muted-foreground))' }}
          title="Drag to move toolbar"
        >
          <GripHorizontal size={14} />
        </div>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        {/* Toolbar content */}
        <div className="toolbar-content flex items-center gap-2">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
