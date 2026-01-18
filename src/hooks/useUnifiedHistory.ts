import { useState, useRef, useCallback } from 'react';
import type { DiagramType } from '../types/uml';

// Unified snapshot for all diagram types
export interface UnifiedSnapshot {
  diagramType: DiagramType;
  // ERD
  tables: any[];
  relations: any[];
  // UML Class
  umlClasses: any[];
  umlRelations: any[];
  // Flowchart
  flowchartNodes: any[];
  flowchartConnections: any[];
  // Common
  viewport: { x: number; y: number; zoom: number };
}

interface UseUnifiedHistoryOptions {
  maxHistory?: number;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useUnifiedHistory(options: UseUnifiedHistoryOptions = {}) {
  const { maxHistory = 50, onUndo, onRedo } = options;
  
  const [history, setHistory] = useState<UnifiedSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const suppressHistory = useRef<boolean>(false);
  const historyRef = useRef<UnifiedSnapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Keep refs in sync with state
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  const pushHistory = useCallback((snapshot: UnifiedSnapshot) => {
    if (suppressHistory.current) return;
    
    setHistory((prev) => {
      // Trim future history if we're not at the end
      const trimmed = prev.slice(0, historyIndexRef.current + 1);
      // Add new snapshot
      const next = [...trimmed, JSON.parse(JSON.stringify(snapshot))];
      // Limit history size
      if (next.length > maxHistory) {
        return next.slice(next.length - maxHistory);
      }
      return next;
    });
    setHistoryIndex((idx) => Math.min(idx + 1, maxHistory - 1));
  }, [maxHistory]);

  const undo = useCallback((): UnifiedSnapshot | null => {
    if (historyIndexRef.current <= 0) return null;
    
    suppressHistory.current = true;
    const targetIdx = historyIndexRef.current - 1;
    const snap = historyRef.current[targetIdx];
    
    if (!snap) {
      suppressHistory.current = false;
      return null;
    }
    
    setHistoryIndex(targetIdx);
    suppressHistory.current = false;
    onUndo?.();
    return JSON.parse(JSON.stringify(snap));
  }, [onUndo]);

  const redo = useCallback((): UnifiedSnapshot | null => {
    const nextIdx = historyIndexRef.current + 1;
    if (nextIdx >= historyRef.current.length) return null;
    
    suppressHistory.current = true;
    const snap = historyRef.current[nextIdx];
    
    if (!snap) {
      suppressHistory.current = false;
      return null;
    }
    
    setHistoryIndex(nextIdx);
    suppressHistory.current = false;
    onRedo?.();
    return JSON.parse(JSON.stringify(snap));
  }, [onRedo]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const setSuppressHistory = useCallback((suppress: boolean) => {
    suppressHistory.current = suppress;
  }, []);

  const reset = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
    suppressHistory.current = false;
  }, []);

  return {
    history,
    historyIndex,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    setSuppressHistory,
    reset,
  };
}
