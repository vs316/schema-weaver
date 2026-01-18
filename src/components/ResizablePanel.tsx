import { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizablePanelProps {
  children: React.ReactNode;
  defaultWidth: number;
  minWidth: number;
  maxWidth: number;
  isOpen: boolean;
  isDarkMode: boolean;
  side: 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export function ResizablePanel({
  children,
  defaultWidth,
  minWidth,
  maxWidth,
  isOpen,
  isDarkMode,
  side,
  className = '',
  style = {},
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const delta = side === 'right' 
        ? startXRef.current - e.clientX
        : e.clientX - startXRef.current;
      
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, startWidthRef.current + delta)
      );
      
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth, side]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className={`relative flex flex-col ${className}`}
      style={{ 
        width: `${width}px`,
        ...style,
      }}
    >
      {/* Resize handle */}
      <div
        className={`absolute top-0 ${side === 'right' ? 'left-0' : 'right-0'} h-full w-1 group cursor-ew-resize z-40 flex items-center justify-center`}
        onMouseDown={handleMouseDown}
      >
        <div 
          className={`h-12 w-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
            isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-300 hover:bg-slate-400'
          } ${isResizing ? 'opacity-100' : ''}`}
          style={{ marginLeft: side === 'right' ? '-6px' : '2px' }}
        >
          <GripVertical size={10} className={isDarkMode ? 'text-slate-400' : 'text-slate-600'} />
        </div>
      </div>
      
      {/* Content - with proper overflow handling */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
