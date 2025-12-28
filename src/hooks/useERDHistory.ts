import { useState, useCallback, useRef, useEffect } from "react";
import type { Table, Relation } from "../types";

type Viewport = { x: number; y: number; zoom: number };
type Snapshot = { tables: Table[]; relations: Relation[]; viewport: Viewport };

export function useHistory() {
  const [tables, setTables] = useState<Table[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const suppressHistory = useRef(false);
  const historyRef = useRef<Snapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const pushHistory = useCallback((snap?: Snapshot) => {
    if (suppressHistory.current) return;
    
    const snapshot: Snapshot = snap ?? {
      tables: JSON.parse(JSON.stringify(tables)),
      relations: JSON.parse(JSON.stringify(relations)),
      viewport: { ...viewport }
    };

    setHistory((prev) => {
      const next = prev.slice(0, historyIndexRef.current + 1);
      return [...next, snapshot];
    });
    setHistoryIndex((idx) => idx + 1);
  }, [tables, relations, viewport]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return false;

    suppressHistory.current = true;
    const targetIdx = historyIndexRef.current - 1;
    const snap = historyRef.current[targetIdx];

    if (!snap) {
      suppressHistory.current = false;
      return false;
    }

    try {
      const validTables = [...snap.tables];
      const validRelations = snap.relations.filter(
        (r: Relation) =>
          validTables.some((t) => t.id === r.sourceTableId) &&
          validTables.some((t) => t.id === r.targetTableId)
      );

      setTables(validTables);
      setRelations(validRelations);
      setViewport({ ...snap.viewport });
      setHistoryIndex(targetIdx);
      return true;
    } catch (err) {
      console.error("Undo failed", err);
      return false;
    } finally {
      suppressHistory.current = false;
    }
  }, []);

  const redo = useCallback(() => {
    const nextIdx = historyIndexRef.current + 1;
    if (nextIdx >= historyRef.current.length) return false;

    suppressHistory.current = true;
    const snap = historyRef.current[nextIdx];

    if (!snap) {
      suppressHistory.current = false;
      return false;
    }

    try {
      const validTables = [...snap.tables];
      const validRelations = snap.relations.filter(
        (r: Relation) =>
          validTables.some((t) => t.id === r.sourceTableId) &&
          validTables.some((t) => t.id === r.targetTableId)
      );

      setTables(validTables);
      setRelations(validRelations);
      setViewport({ ...snap.viewport });
      setHistoryIndex(nextIdx);
      return true;
    } catch (err) {
      console.error("Redo failed", err);
      return false;
    } finally {
      suppressHistory.current = false;
    }
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    tables,
    setTables,
    relations,
    setRelations,
    viewport,
    setViewport,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    suppressHistory,
    isInitialLoad,
  };
}
