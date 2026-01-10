import { useState, useCallback, useRef, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  draggedId: string | null;
  initialTablePos: Position | null;
  initialMousePos: Position | null;
}

interface SmoothDragOptions {
  gridSize?: number;
  snapToGrid?: boolean;
  onDragStart?: (id: string) => void;
  onDragEnd?: (id: string) => void;
}

export function useSmoothDrag(options: SmoothDragOptions = {}) {
  const { gridSize = 12, snapToGrid = true, onDragStart, onDragEnd } = options;
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedId: null,
    initialTablePos: null,
    initialMousePos: null,
  });
  
  // Use ref for high-frequency updates without re-renders
  const dragRef = useRef<DragState>(dragState);
  
  useEffect(() => {
    dragRef.current = dragState;
  }, [dragState]);

  const startDrag = useCallback((
    id: string,
    tablePos: Position,
    mouseWorldPos: Position
  ) => {
    const newState = {
      isDragging: true,
      draggedId: id,
      initialTablePos: { ...tablePos },
      initialMousePos: { ...mouseWorldPos },
    };
    setDragState(newState);
    dragRef.current = newState;
    onDragStart?.(id);
  }, [onDragStart]);

  const updateDrag = useCallback((
    currentMouseWorldPos: Position
  ): Position | null => {
    const { isDragging, initialTablePos, initialMousePos } = dragRef.current;
    
    if (!isDragging || !initialTablePos || !initialMousePos) {
      return null;
    }

    // Calculate delta from initial mouse position
    const deltaX = currentMouseWorldPos.x - initialMousePos.x;
    const deltaY = currentMouseWorldPos.y - initialMousePos.y;

    // Apply delta to initial table position (absolute, not cumulative)
    let newX = initialTablePos.x + deltaX;
    let newY = initialTablePos.y + deltaY;

    // Snap to grid if enabled
    if (snapToGrid && gridSize > 0) {
      newX = Math.round(newX / gridSize) * gridSize;
      newY = Math.round(newY / gridSize) * gridSize;
    }

    return { x: newX, y: newY };
  }, [gridSize, snapToGrid]);

  const endDrag = useCallback(() => {
    const { draggedId } = dragRef.current;
    
    setDragState({
      isDragging: false,
      draggedId: null,
      initialTablePos: null,
      initialMousePos: null,
    });
    
    if (draggedId) {
      onDragEnd?.(draggedId);
    }
  }, [onDragEnd]);

  return {
    isDragging: dragState.isDragging,
    draggedId: dragState.draggedId,
    startDrag,
    updateDrag,
    endDrag,
  };
}
