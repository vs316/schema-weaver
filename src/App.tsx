import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
// Add these to your existing lucide-react import:
import {
  Plus,
  X,
  Save,
  Database,
  GripHorizontal,
  Key,
  Link as LinkIcon,
  Settings,
  Download,
  Sun,
  Moon,
  MousePointer2,
  Upload,
  CheckCircle2,
  Maximize,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Copy,
  Undo2,
  Grid3x3,
  Palette,
  FileText,
  Cloud,
  ArrowLeft,
  Loader2,
  Lock,           // ADD THIS
  Unlock,         // ADD THIS
  MessageSquare,  // ADD THIS for comments
  Zap,           // ADD THIS for sample data
} from "lucide-react";

// Add these utility imports:
import { useTableComments } from "./hooks/useTableComments";
import { generateSampleData, sampleDataToJSON, sampleDataToSQLInsert } from "./utils/sampleDataGenerator";

import html2canvas from "html2canvas";
import { useCloudSync, type ERDDiagram } from "./hooks/useCloudSync";
import { usePresence } from "./hooks/usePresence";
import { DiagramSelector } from "./components/DiagramSelector";
import { PresenceIndicator, LiveCursor } from "./components/PresenceIndicator";
import type { Json } from "./integrations/supabase/types";
import { supabase } from "./utils/supabase";

/** --- TYPES --- **/
type Column = { id: string; name: string; type: string; isPk: boolean; isFk: boolean };
type Table = { 
  id: string; 
  name: string; 
  x: number; 
  y: number; 
  columns: Column[]; 
  color?: string;
  description?: string;  // ← ADD THIS LINE
};


type Relation = {
  id: string;
  sourceTableId: string;
  targetTableId: string;
  label?: string;
  isDashed: boolean;
  lineType: "curved" | "straight";
  bend?: { x: number; y: number };
};


declare global {
  interface Window {
    // Removed Netlify Identity reference
  }
}

type AppUser = {
  email?: string | null;
  name?: string | null;
  id: string;
  user_metadata?: { display_name?: string };
};
const generateId = () => Math.random().toString(36).substr(2, 9);

const TABLE_W = 224;
const HEADER_H = 40;
const ANCHOR_X = TABLE_W / 2;
const ANCHOR_Y = 20;
const GRID_SIZE = 12;

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/** --- SIMPLE TOASTS --- **/
type Toast = { id: string; title: string; description?: string; type?: "success" | "error" | "info" };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    const toast = { ...t, id: generateId() };
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== toast.id));
    }, 2500);
  };
  return { toasts, push };
}

function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <button
      onClick={onLogout}
      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-semibold"
    >
      <LogOut size={16} />
      Logout
    </button>
  );
}


function ERDBuilder({ 
  user, 
  diagram,
  onSave,
  onBack,
  syncing,
  onLogout,
}: { 
  user: AppUser;
  diagram: ERDDiagram | null;
  onSave: (updates: { tables?: Json; relations?: Json; viewport?: Json; is_dark_mode?: boolean }) => void;
  onBack: () => void;
  syncing: boolean;
  onLogout: () => void;
}) {
  // --- STATE ---
  
  const [tables, setTables] = useState<Table[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lastSaved, setLastSaved] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);

  const [multiSelectedTableIds, setMultiSelectedTableIds] = useState<Set<string>>(new Set());

  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoStart, setLassoStart] = useState<{ x: number; y: number } | null>(null);
  const [lassoRect, setLassoRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [isDraggingEdge, setIsDraggingEdge] = useState(false);
  const [draggedEdgeId, setDraggedEdgeId] = useState<string | null>(null);
  const [edgeDragStart, setEdgeDragStart] = useState<{ x: number; y: number } | null>(null);
  const [edgeDragStartBend, setEdgeDragStartBend] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  const toWorld = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (clientY - rect.top - viewport.y) / viewport.zoom;
    return { x, y };
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [connectTableSearch, setConnectTableSearch] = useState<string>("");
  const [showCommandTips, setShowCommandTips] = useState(false);

  // --- PRESENCE (Real-time collaboration) ---
  const { users: presenceUsers, isConnected: presenceConnected, updateCursor } = usePresence(
    diagram?.id ?? null,
    user.id,
    user.user_metadata?.display_name || user.name || user.email || undefined
  );

  const [isGridSnap, setIsGridSnap] = useState<boolean>(true);

  // --- TOASTS ---
  const { toasts, push } = useToasts();

  // --- HISTORY (UNDO/REDO) ---
  type Snapshot = { tables: Table[]; relations: Relation[]; viewport: { x: number; y: number; zoom: number } };
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const suppressHistory = useRef<boolean>(false);
  const lastActionWasDrag = useRef<boolean>(false);
  const historyRef = useRef<Snapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
  // Feature 1: Lock/Unlock diagram
const [isLocked, setIsLocked] = useState((diagram as any)?.is_locked ?? false);

// Feature 4: Comments
const { 
  comments, 
  loading: commentsLoading, 
  addComment, 
  deleteComment 
} = useTableComments(
  diagram?.id ?? null,
  selectedTableId,
  user.id
);
const [newCommentText, setNewCommentText] = useState("");
// const [editingCommentId, setEditingCommentId] = useState<string | null>(null);

// Feature 5: Sample Data
const [sampleDataShown, setSampleDataShown] = useState(false);
const [sampleData, setSampleData] = useState<any[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const pushHistory = useCallback((snap?: Snapshot) => {
    if (suppressHistory.current) return;
    const snapshot: Snapshot =
      snap ?? { tables: JSON.parse(JSON.stringify(tables)), relations: JSON.parse(JSON.stringify(relations)), viewport: { ...viewport } };
    
    setHistory((prev) => {
      const next = prev.slice(0, historyIndexRef.current + 1);
      return [...next, snapshot];
    });
    setHistoryIndex((idx) => idx + 1);
  }, [tables, relations, viewport]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    
    suppressHistory.current = true;
    const targetIdx = historyIndexRef.current - 1;
    const snap = historyRef.current[targetIdx];
    
    if (!snap) {
      suppressHistory.current = false;
      return;
    }
    
    try {
      const validTables = [...snap.tables];
      const validRelations = snap.relations.filter(
        r =>
          validTables.some(t => t.id === r.sourceTableId) &&
          validTables.some(t => t.id === r.targetTableId)
      );

      setTables(validTables);
      setRelations(validRelations);
      setViewport({ ...snap.viewport });
      setSelectedTableId(null);
      setSelectedEdgeId(null);
      setMultiSelectedTableIds(new Set());
      setHistoryIndex(targetIdx);
      push({ title: "Undo", type: "info" });
    } catch (err) {
      console.error("Undo failed", err);
      push({ title: "Undo failed", type: "error" });
    } finally {
      suppressHistory.current = false;
    }
  }, [push]);

  const redo = useCallback(() => {
    const nextIdx = historyIndexRef.current + 1;
    if (nextIdx >= historyRef.current.length) return;
    
    suppressHistory.current = true;
    const snap = historyRef.current[nextIdx];
    
    if (!snap) {
      suppressHistory.current = false;
      return;
    }
    
    try {
      const validTables = [...snap.tables];
      const validRelations = snap.relations.filter(
        r =>
          validTables.some(t => t.id === r.sourceTableId) &&
          validTables.some(t => t.id === r.targetTableId)
      );

      setTables(validTables);
      setRelations(validRelations);
      setViewport({ ...snap.viewport });
      setSelectedTableId(null);
      setSelectedEdgeId(null);
      setMultiSelectedTableIds(new Set());
      setHistoryIndex(nextIdx);
      push({ title: "Redo", type: "info" });
    } catch (err) {
      console.error("Redo failed", err);
      push({ title: "Redo failed", type: "error" });
    } finally {
      suppressHistory.current = false;
    }
  }, [push]);
  // --- PERSISTENCE (LOAD FROM CLOUD & AUTO-SAVE) ---
  const isInitialLoad = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load diagram from cloud on mount
  useEffect(() => {
    if (diagram && isInitialLoad.current) {
      isInitialLoad.current = false;
      try {
        const loadedTables = (diagram.tables as Table[]) || [];
        const loadedRelations = (diagram.relations as Relation[]) || [];
        const loadedViewport = (diagram.viewport as { x: number; y: number; zoom: number }) || { x: 0, y: 0, zoom: 1 };
        
        setTables(loadedTables);
        setRelations(loadedRelations);
        setViewport(loadedViewport);
        setIsDarkMode(diagram.is_dark_mode ?? true);
        setLastSaved("Loaded from cloud");
      } catch (e) {
        console.error("Failed to load data from cloud", e);
        // Fallback to localStorage
        const saved = localStorage.getItem("erd-data");
        if (saved) {
          try {
            const { t, r, dark, time } = JSON.parse(saved);
            setTables(t || []);
            setRelations(r || []);
            setIsDarkMode(dark ?? true);
            setLastSaved(time || "Never");
          } catch (e) {
            console.error("Failed to load data from localStorage", e);
          }
        }
      }
    }
  }, [diagram]);

  // Push initial snapshot once loaded
  useEffect(() => {
    if (!isInitialLoad.current && historyIndex === -1) {
      pushHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoad.current]);

  // Auto-save to cloud and localStorage
  useEffect(() => {
    if (isInitialLoad.current) return;
    if (tables.length === 0 && relations.length === 0) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      
      // Save to localStorage as backup
      localStorage.setItem(
        "erd-data",
        JSON.stringify({
          t: tables,
          r: relations,
          dark: isDarkMode,
          time: now,
        })
      );

      // Save to cloud
      onSave({
        tables: tables as Json,
        relations: relations as Json,
        viewport: viewport as Json,
        is_dark_mode: isDarkMode,
      });
      
      setLastSaved(now);
      setIsSaving(false);
      push({ title: "Synced to cloud", description: `Last saved at ${now}`, type: "success" });
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, relations, isDarkMode, viewport]);

  // Push history on non-drag meaningful changes
  useEffect(() => {
    if (isDragging || isDraggingEdge || suppressHistory.current || isInitialLoad.current) return;
    pushHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId, selectedEdgeId, isDarkMode]);

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSpeed = 0.001;
    const minZoom = 0.2;
    const maxZoom = 3;
    const delta = -e.deltaY * zoomSpeed;
    const newZoom = clamp(viewport.zoom + delta, minZoom, maxZoom);
    setViewport((prev) => ({ ...prev, zoom: newZoom }));
  };

  const resetViewport = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 0.5 });
    push({ title: "Viewport reset", type: "info" });
    pushHistory();
  }, [pushHistory, push]);

  const activeSelectedTableIds = useMemo(() => {
    if (multiSelectedTableIds.size > 0) return new Set(multiSelectedTableIds);
    if (selectedTableId) return new Set([selectedTableId]);
    return new Set<string>();
  }, [multiSelectedTableIds, selectedTableId]);

  const connected = useMemo(() => {
    const selectedTables = activeSelectedTableIds;
    const connectedTableIds = new Set<string>();
    const connectedEdgeIds = new Set<string>();

    if (selectedTables.size === 0) return { connectedTableIds, connectedEdgeIds };

    for (const r of relations) {
      const sSel = selectedTables.has(r.sourceTableId);
      const tSel = selectedTables.has(r.targetTableId);

      if (sSel || tSel) {
        connectedEdgeIds.add(r.id);
        connectedTableIds.add(r.sourceTableId);
        connectedTableIds.add(r.targetTableId);
      }
    }

    return { connectedTableIds, connectedEdgeIds };
  }, [relations, activeSelectedTableIds]);
  // Feature 2: Get relationships for selected table, sorted by priority
const selectedTableRelationships = useMemo(() => {
  if (!selectedTableId) return [];
  
  const related = relations.filter(
    r => r.sourceTableId === selectedTableId || r.targetTableId === selectedTableId
  );
  
  // Sort: relationships FROM selected table first, then TO it
  return related.sort((a, b) => {
    const aFromSelected = a.sourceTableId === selectedTableId ? 0 : 1;
    const bFromSelected = b.sourceTableId === selectedTableId ? 0 : 1;
    return aFromSelected - bFromSelected;
  });
}, [relations, selectedTableId]);

  const isTablePrimarySelected = (id: string) => activeSelectedTableIds.has(id);
  const isTableConnected = (id: string) => connected.connectedTableIds.has(id);
  const isEdgeConnected = (id: string) => connected.connectedEdgeIds.has(id);

  const handleTableMouseDown = (e: React.MouseEvent, tableId: string) => {
    // Feature 1: Check if locked
  if (isLocked) {
    push({ title: "Diagram is locked", description: "Unlock to edit", type: "info" });
    return;
  }
    if (e.button !== 0) return;
    e.stopPropagation();

    const table = tables.find((t) => t.id === tableId);
    if (!table || !canvasRef.current) return;

    if (!e.shiftKey) {
      if (!multiSelectedTableIds.has(tableId)) {
        setMultiSelectedTableIds(new Set([tableId]));
      }
      setSelectedTableId(tableId);
      setConnectTableSearch("");
    } else {
      setMultiSelectedTableIds((prev) => {
        const next = new Set(prev);
        if (next.has(tableId)) next.delete(tableId);
        else next.add(tableId);
        return next;
      });
      setSelectedTableId(tableId);
      setConnectTableSearch("");
    }

    setSelectedEdgeId(null);

    const world = toWorld(e.clientX, e.clientY);
    setDragOffset({
      x: world.x - table.x,
      y: world.y - table.y,
    });

    setDraggedTableId(tableId);
    setIsDragging(true);
    lastActionWasDrag.current = true;
  };

  const handleEdgeClick = (e: React.MouseEvent, edgeId: string) => {
    e.stopPropagation();
    setSelectedEdgeId(edgeId);
    setSelectedTableId(null);
    setMultiSelectedTableIds(new Set());
  };

  const handleEdgeHandleMouseDown = (e: React.MouseEvent, edgeId: string) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const r = relations.find((x) => x.id === edgeId);
    if (!r) return;

    setSelectedEdgeId(edgeId);
    setSelectedTableId(null);
    setMultiSelectedTableIds(new Set());

    setIsDraggingEdge(true);
    setDraggedEdgeId(edgeId);

    const world = toWorld(e.clientX, e.clientY);
    setEdgeDragStart(world);

    const currentBend = r.bend ?? { x: 0, y: 0 };
    setEdgeDragStartBend(currentBend);
    lastActionWasDrag.current = true;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setDragOffset({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
      return;
    }

    if (e.button === 0) {
      if (e.target === e.currentTarget) {
        const world = toWorld(e.clientX, e.clientY);
        setIsLassoing(true);
        setLassoStart(world);
        setLassoRect({ x: world.x, y: world.y, w: 0, h: 0 });

        setSelectedEdgeId(null);
        if (!e.shiftKey) {
          setSelectedTableId(null);
          setMultiSelectedTableIds(new Set());
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setViewport((prev) => ({
        ...prev,
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      }));
      return;
    }

    if (isDraggingEdge && draggedEdgeId && edgeDragStart && edgeDragStartBend) {
      const world = toWorld(e.clientX, e.clientY);
      const dx = world.x - edgeDragStart.x;
      const dy = world.y - edgeDragStart.y;

      setRelations((prev) =>
        prev.map((r) =>
          r.id === draggedEdgeId
            ? {
                ...r,
                bend: {
                  x: edgeDragStartBend.x + dx,
                  y: edgeDragStartBend.y + dy,
                },
              }
            : r
        )
      );
      return;
    }

    if (isDragging && draggedTableId) {
      const world = toWorld(e.clientX, e.clientY);
      const anchorTable = tables.find((t) => t.id === draggedTableId);
      if (!anchorTable) return;

      let newX = world.x - dragOffset.x;
      let newY = world.y - dragOffset.y;

      if (isGridSnap) {
        newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
        newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
      }

      const selectedIds = multiSelectedTableIds.size > 0 ? multiSelectedTableIds : new Set([draggedTableId]);

      const dx = newX - anchorTable.x;
      const dy = newY - anchorTable.y;

      setTables((prev) =>
        prev.map((t) => {
          if (!selectedIds.has(t.id)) return t;
          return { ...t, x: t.x + dx, y: t.y + dy };
        })
      );
      return;
    }

    if (isLassoing && lassoStart) {
      const world = toWorld(e.clientX, e.clientY);
      const x1 = lassoStart.x;
      const y1 = lassoStart.y;
      const x2 = world.x;
      const y2 = world.y;

      const rx = Math.min(x1, x2);
      const ry = Math.min(y1, y2);
      const rw = Math.abs(x2 - x1);
      const rh = Math.abs(y2 - y1);

      setLassoRect({ x: rx, y: ry, w: rw, h: rh });
    }
  };

  const finalizeLassoSelection = (shiftKey: boolean) => {
    if (!lassoRect) return;

    const { x, y, w, h } = lassoRect;
    const rectRight = x + w;
    const rectBottom = y + h;

    const hits = new Set<string>();
    for (const t of tables) {
      const tLeft = t.x;
      const tTop = t.y;
      const tRight = t.x + TABLE_W;
      const tBottom = t.y + HEADER_H + 20 + t.columns.length * 16;

      const intersects = !(tRight < x || tLeft > rectRight || tBottom < y || tTop > rectBottom);

      if (intersects) hits.add(t.id);
    }

    setMultiSelectedTableIds((prev) => {
      if (shiftKey) {
        const next = new Set(prev);
        for (const id of hits) next.add(id);
        return next;
      }
      return hits;
    });

    const first = Array.from(hits)[0];
    setSelectedTableId(first ?? null);
    setSelectedEdgeId(null);
  };

  const handleMouseUp = (e?: React.MouseEvent) => {
    setIsDragging(false);
    setIsPanning(false);

    if (isDraggingEdge) {
      setIsDraggingEdge(false);
      setDraggedEdgeId(null);
      setEdgeDragStart(null);
      setEdgeDragStartBend(null);
    }

    if (isLassoing) {
      setIsLassoing(false);
      setLassoStart(null);
      finalizeLassoSelection(!!e?.shiftKey);
      setLassoRect(null);
    }

    setDraggedTableId(null);

    if (lastActionWasDrag.current) {
      pushHistory();
      lastActionWasDrag.current = false;
    }
  };

  const addTable = useCallback(() => {
    // Feature 1: Check lock
  if (isLocked) {
    push({ title: "Diagram is locked", type: "info" });
    return;
  }
    const newTable: Table = {
      id: generateId(),
      name: "New_Table",
      x: (window.innerWidth / 2 - viewport.x) / viewport.zoom,
      y: (window.innerHeight / 2 - viewport.y) / viewport.zoom,
      columns: [{ id: generateId(), name: "id", type: "INT", isPk: true, isFk: false }],
      color: "#64748b", // default slate
    };
    setTables((prev) => [...prev, newTable]);
    setSelectedTableId(newTable.id);
    setSelectedEdgeId(null);
    setMultiSelectedTableIds(new Set([newTable.id]));
    pushHistory();
    push({ title: "Table added", type: "success" });
  }, [isLocked, viewport, pushHistory, push]);

  const duplicateTable = useCallback((sourceId: string) => {
     // Lock check - prevents duplicate when locked
  if (isLocked) {
    push({ title: "Diagram is locked", type: "info" });
    return;
  }
    setTables((prev) => {
      const src = prev.find((t) => t.id === sourceId);
      if (!src) return prev;
      const copy: Table = {
        ...src,
        id: generateId(),
        name: `${src.name}_copy`,
        x: src.x + 30,
        y: src.y + 30,
        columns: src.columns.map((c) => ({ ...c, id: generateId() })),
      };
      setSelectedTableId(copy.id);
      setSelectedEdgeId(null);
      setMultiSelectedTableIds(new Set([copy.id]));
      return [...prev, copy];
    });
    pushHistory();
    push({ title: "Table duplicated", type: "success" });
  }, [pushHistory, push]);

  const toggleRelation = useCallback((sourceId: string, targetId: string) => {
     // Feature 1: Check lock
  if (isLocked) {
    push({ title: "Diagram is locked", type: "info" });
    return;
  }
    if (sourceId === targetId) return;
    setRelations((prev) => {
      const existing = prev.find((r) => r.sourceTableId === sourceId && r.targetTableId === targetId);
      if (existing) {
        push({ title: "Relation removed", type: "info" });
        return prev.filter((r) => r.id !== existing.id);
      } else {
        push({ title: "Relation added", type: "success" });
        return [
          ...prev,
          {
            id: generateId(),
            sourceTableId: sourceId,
            targetTableId: targetId,
            isDashed: false,
            lineType: "curved",
            bend: { x: 0, y: 0 },
          },
        ];
      }
    });
    pushHistory();
  }, [isLocked,pushHistory, push]);

  const exportJSON = useCallback(() => {
    const data = JSON.stringify({ tables, relations });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schema-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    push({ title: "JSON exported", type: "success" });
  }, [tables, relations, push]);

  const importJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
     // Feature 1: Check lock
  if (isLocked) {
    push({ title: "Diagram is locked", type: "info" });
    return;
  }
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const { tables: t, relations: r } = JSON.parse(evt.target?.result as string);
        setTables(t);
        setRelations(
          (r as Relation[]).map((x) => ({
            ...x,
            bend: x.bend ?? { x: 0, y: 0 },
          }))
        );
        setSelectedTableId(null);
        setSelectedEdgeId(null);
        setMultiSelectedTableIds(new Set());
        pushHistory({ tables: t, relations: r, viewport } as unknown as Snapshot);
        push({ title: "Schema imported", type: "success" });
      } catch {
        alert("Invalid JSON file");
        push({ title: "Import failed", description: "Invalid JSON", type: "error" });
      }
    };
    reader.readAsText(file);
  }, [isLocked, viewport, pushHistory, push]);

  const exportPNG = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      // Create a temporary container to clone the canvas without transforms
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      tempContainer.style.backgroundColor = isDarkMode ? "#0f172a" : "#f8fafc";
      tempContainer.style.width = "1600px";
      tempContainer.style.height = "1200px";
      tempContainer.style.overflow = "hidden";
      
      document.body.appendChild(tempContainer);

      // Render all tables and relations directly without viewport transforms
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "1600");
      svg.setAttribute("height", "1200");
      svg.setAttribute("viewBox", "0 0 1600 1200");
      svg.style.background = isDarkMode ? "#0f172a" : "#f8fafc";

      // Calculate bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const t of tables) {
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x + TABLE_W);
        maxY = Math.max(maxY, t.y + HEADER_H + 20 + t.columns.length * 16);
      }

      if (tables.length === 0) {
        minX = minY = 0;
        maxX = 1600;
        maxY = 1200;
      }

      const padding = 40;
      const width = Math.max(1600, maxX - minX + padding * 2);
      const height = Math.max(1200, maxY - minY + padding * 2);
      svg.setAttribute("width", width.toString());
      svg.setAttribute("height", height.toString());

      // Draw relations
      for (const r of relations) {
        const a = getAnchors(r);
        if (!a) continue;

        const { sx, sy, tx, ty, cx, cy } = a;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const pathData = r.lineType === "straight" 
          ? `M ${sx - minX + padding} ${sy - minY + padding} L ${cx - minX + padding} ${cy - minY + padding} L ${tx - minX + padding} ${ty - minY + padding}`
          : `M ${sx - minX + padding} ${sy - minY + padding} Q ${cx - minX + padding} ${cy - minY + padding} ${tx - minX + padding} ${ty - minY + padding}`;
        
        path.setAttribute("d", pathData);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", isDarkMode ? "#475569" : "#94a3b8");
        path.setAttribute("stroke-width", r.isDashed ? "2" : "2");
        if (r.isDashed) path.setAttribute("stroke-dasharray", "5,5");
        svg.appendChild(path);

        // Draw arrow
        const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const angle = Math.atan2(ty - cy, tx - cx);
        const arrowSize = 8;
        const px = tx - minX + padding - arrowSize * Math.cos(angle);
        const py = ty - minY + padding - arrowSize * Math.sin(angle);
        const p1x = px - arrowSize * Math.cos(angle - Math.PI / 6);
        const p1y = py - arrowSize * Math.sin(angle - Math.PI / 6);
        const p2x = px - arrowSize * Math.cos(angle + Math.PI / 6);
        const p2y = py - arrowSize * Math.sin(angle + Math.PI / 6);
        arrowPath.setAttribute("points", `${tx - minX + padding},${ty - minY + padding} ${p1x},${p1y} ${p2x},${p2y}`);
        arrowPath.setAttribute("fill", isDarkMode ? "#475569" : "#94a3b8");
        svg.appendChild(arrowPath);
      }

      // Draw tables
      for (const t of tables) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        // Table background
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", (t.x - minX + padding).toString());
        rect.setAttribute("y", (t.y - minY + padding).toString());
        rect.setAttribute("width", TABLE_W.toString());
        rect.setAttribute("height", (HEADER_H + 20 + t.columns.length * 16).toString());
        rect.setAttribute("fill", t.color || "#64748b");
        rect.setAttribute("rx", "4");
        g.appendChild(rect);

        // Create foreignObject for text content (simpler for now)
        const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        fo.setAttribute("x", (t.x - minX + padding + 4).toString());
        fo.setAttribute("y", (t.y - minY + padding + 4).toString());
        fo.setAttribute("width", (TABLE_W - 8).toString());
        fo.setAttribute("height", (HEADER_H - 8).toString());
        
        const heading = document.createElement("div");
        heading.style.fontSize = "13px";
        heading.style.fontWeight = "bold";
        heading.style.color = "white";
        heading.style.padding = "2px";
        heading.textContent = t.name;
        fo.appendChild(heading);
        g.appendChild(fo);

        svg.appendChild(g);
      }

      tempContainer.appendChild(svg);

      // Use html2canvas with better config
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
      });

      const link = document.createElement("a");
      link.download = `erd-diagram-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      URL.revokeObjectURL(link.href);
      
      document.body.removeChild(tempContainer);
      
      push({ title: "PNG exported", type: "success" });
    } catch (err) {
      console.error("PNG export error:", err);
      push({ title: "PNG export failed", description: "Could not render diagram", type: "error" });
    }
  }, [isDarkMode, tables, relations, push]);

  const generateMySQLDDL = () => {
    // Basic DDL from current state; FK label assumed to be the FK column on source table referencing target's PK (first PK found or 'id')
    const findPK = (t: Table) => t.columns.find((c) => c.isPk)?.name || "id";

    const ddl: string[] = [];
    for (const t of tables) {
      const cols: string[] = t.columns.map((c) => {
        const type = c.type === "UUID" ? "CHAR(36)" : c.type === "TEXT" ? "TEXT" : c.type === "VARCHAR" ? "VARCHAR(255)" : c.type === "BOOL" ? "BOOLEAN" : "INT";
        return `  \`${c.name}\` ${type}${c.isPk ? " NOT NULL" : ""}`;
      });

      const pkCols = t.columns.filter((c) => c.isPk).map((c) => `\`${c.name}\``);
      if (pkCols.length > 0) cols.push(`  PRIMARY KEY (${pkCols.join(", ")})`);

      // FKs derived from relations where sourceTableId === t.id
      const fks = relations
        .filter((r) => r.sourceTableId === t.id)
        .map((r) => {
          const source = t;
          const target = tables.find((x) => x.id === r.targetTableId);
          if (!target) return null;
          const fkCol = r.label || `${target.name}_id`;
          const targetPk = findPK(target);
          return `  CONSTRAINT \`fk_${source.name}_${target.name}\` FOREIGN KEY (\`${fkCol}\`) REFERENCES \`${target.name}\`(\`${targetPk}\`)`;
        })
        .filter(Boolean) as string[];

      ddl.push(`CREATE TABLE \`${t.name}\` (\n${[...cols, ...fks].join(",\n")}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
    }

    const blob = new Blob([ddl.join("\n\n")], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `schema-${new Date().toISOString().slice(0, 10)}.sql`;
    link.click();
    push({ title: "SQL DDL exported", type: "success" });
  };

  const getAnchors = (r: Relation) => {
    const s = tables.find((t) => t.id === r.sourceTableId);
    const t = tables.find((t) => t.id === r.targetTableId);
    if (!s || !t) return null;

    const sx = s.x + ANCHOR_X;
    const sy = s.y + ANCHOR_Y;
    const tx = t.x + ANCHOR_X;
    const ty = t.y + ANCHOR_Y;

    const mx = (sx + tx) / 2;
    const my = (sy + ty) / 2;
    const bend = r.bend ?? { x: 0, y: 0 };
    const cx = mx + bend.x;
    const cy = my + bend.y;

    return { sx, sy, tx, ty, cx, cy, mx, my };
  };

  const getPath = (r: Relation) => {
    const a = getAnchors(r);
    if (!a) return "";

    const { sx, sy, tx, ty, cx, cy } = a;

    if (r.lineType === "straight") {
      return `M ${sx} ${sy} L ${cx} ${cy} L ${tx} ${ty}`;
    }

    return `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
  };

  const getLabelPos = (r: Relation) => {
    const a = getAnchors(r);
    if (!a) return null;

    const { sx, sy, tx, ty, cx, cy } = a;
    const t = 0.5;
    const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx;
    const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ty;
    return { x, y };
  };

  const clearAllSelections = () => {
    setSelectedTableId(null);
    setSelectedEdgeId(null);
    setMultiSelectedTableIds(new Set());
  };

  const edgeStroke = (r: Relation) => {
    const isSelected = selectedEdgeId === r.id;
    const connectedEdge = isEdgeConnected(r.id);
    const anySelection = activeSelectedTableIds.size > 0 || !!selectedEdgeId;

    if (isSelected) return "#6366f1";
    if (connectedEdge && anySelection) return "#a5b4fc";
    return isDarkMode ? "#475569" : "#94a3b8";
  };

  const edgeWidth = (r: Relation) => {
    const isSelected = selectedEdgeId === r.id;
    const connectedEdge = isEdgeConnected(r.id);
    if (isSelected) return 3.5;
    if (connectedEdge && (activeSelectedTableIds.size > 0 || !!selectedEdgeId)) return 3;
    return 2;
  };

  const labelFill = (r: Relation) => {
    const isSelected = selectedEdgeId === r.id;
    const connectedEdge = isEdgeConnected(r.id);
    if (isSelected) return isDarkMode ? "#e0e7ff" : "#1e1b4b";
    if (connectedEdge && activeSelectedTableIds.size > 0) return isDarkMode ? "#c7d2fe" : "#312e81";
    return isDarkMode ? "#94a3b8" : "#475569";
  };

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (ctrlOrCmd && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((ctrlOrCmd && e.key.toLowerCase() === "y") || (ctrlOrCmd && e.key.toLowerCase() === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      } else if (ctrlOrCmd && e.key.toLowerCase() === "s") {
        e.preventDefault();
        exportJSON();
      } else if (ctrlOrCmd && e.key.toLowerCase() === "p") {
        e.preventDefault();
        exportPNG();
      } else if (ctrlOrCmd && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedTableId) duplicateTable(selectedTableId);
      }else if (ctrlOrCmd && e.key.toLowerCase() === "l") {
  e.preventDefault();
  const newLockState = !isLocked;
  setIsLocked(newLockState);
  onSave({ is_locked: newLockState } as any);

  push({ 
    title: `Diagram ${newLockState ? "locked" : "unlocked"}`, 
    type: "info" 
  });
} else if (e.key === "Delete" || e.key === "Backspace") {
   if (isLocked) {
    push({ title: "Diagram is locked", type: "info" });
    return;
  }
        // Delete selected table/edge
        if (selectedTableId) {
          const tId = selectedTableId;
          setTables(tables.filter((x) => x.id !== tId));
          setRelations(relations.filter((r) => r.sourceTableId !== tId && r.targetTableId !== tId));
          setSelectedTableId(null);
          setMultiSelectedTableIds(new Set());
          pushHistory();
          push({ title: "Table deleted", type: "info" });
        } else if (selectedEdgeId) {
          const eId = selectedEdgeId;
          setRelations(relations.filter((x) => x.id !== eId));
          setSelectedEdgeId(null);
          pushHistory();
          push({ title: "Connection removed", type: "info" });
        }
      } else if (ctrlOrCmd && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setIsGridSnap((prev) => !prev);
        push({ title: "Grid snapping", description: isGridSnap ? "Disabled" : "Enabled", type: "info" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedTableId, selectedEdgeId, tables, relations, isGridSnap, undo, redo, duplicateTable, exportJSON, exportPNG, resetViewport, pushHistory, push]);

  // --- SCHEMA TEMPLATES ---
  const templates: { name: string; apply: () => void }[] = [
    {
      name: "Blog (Users, Posts)",
      apply: () => {
        const userT: Table = {
          id: generateId(),
          name: "users",
          x: 200,
          y: 120,
          color: "#60a5fa",
          columns: [
            { id: generateId(), name: "id", type: "INT", isPk: true, isFk: false },
            { id: generateId(), name: "email", type: "VARCHAR", isPk: false, isFk: false },
            { id: generateId(), name: "name", type: "VARCHAR", isPk: false, isFk: false },
          ],
        };
        const postT: Table = {
          id: generateId(),
          name: "posts",
          x: 500,
          y: 220,
          color: "#34d399",
          columns: [
            { id: generateId(), name: "id", type: "INT", isPk: true, isFk: false },
            { id: generateId(), name: "title", type: "VARCHAR", isPk: false, isFk: false },
            { id: generateId(), name: "content", type: "TEXT", isPk: false, isFk: false },
            { id: generateId(), name: "user_id", type: "INT", isPk: false, isFk: true },
          ],
        };
        const rel: Relation = {
          id: generateId(),
          sourceTableId: postT.id,
          targetTableId: userT.id,
          label: "user_id",
          isDashed: false,
          lineType: "curved",
          bend: { x: 0, y: 0 },
        };
        setTables((prev) => [...prev, userT, postT]);
        setRelations((prev) => [...prev, rel]);
        pushHistory();
        push({ title: "Template applied", description: "Blog schema", type: "success" });
      },
    },
    {
      name: "Store (Products, Orders, Order_Items)",
      apply: () => {
        const products: Table = {
          id: generateId(),
          name: "products",
          x: 220,
          y: 120,
          color: "#f59e0b",
          columns: [
            { id: generateId(), name: "id", type: "INT", isPk: true, isFk: false },
            { id: generateId(), name: "name", type: "VARCHAR", isPk: false, isFk: false },
            { id: generateId(), name: "price", type: "INT", isPk: false, isFk: false },
          ],
        };
        const orders: Table = {
          id: generateId(),
          name: "orders",
          x: 520,
          y: 140,
          color: "#22c55e",
          columns: [
            { id: generateId(), name: "id", type: "INT", isPk: true, isFk: false },
            { id: generateId(), name: "customer_name", type: "VARCHAR", isPk: false, isFk: false },
          ],
        };
        const orderItems: Table = {
          id: generateId(),
          name: "order_items",
          x: 420,
          y: 320,
          color: "#a78bfa",
          columns: [
            { id: generateId(), name: "id", type: "INT", isPk: true, isFk: false },
            { id: generateId(), name: "order_id", type: "INT", isPk: false, isFk: true },
            { id: generateId(), name: "product_id", type: "INT", isPk: false, isFk: true },
            { id: generateId(), name: "qty", type: "INT", isPk: false, isFk: false },
          ],
        };
        const rels: Relation[] = [
          { id: generateId(), sourceTableId: orderItems.id, targetTableId: orders.id, label: "order_id", isDashed: false, lineType: "curved", bend: { x: 0, y: 0 } },
          { id: generateId(), sourceTableId: orderItems.id, targetTableId: products.id, label: "product_id", isDashed: false, lineType: "curved", bend: { x: 0, y: 0 } },
        ];
        setTables((prev) => [...prev, products, orders, orderItems]);
        setRelations((prev) => [...prev, ...rels]);
        pushHistory();
        push({ title: "Template applied", description: "Store schema", type: "success" });
      },
    },
  ];

  // --- RENDER ---
  return (
    <div className={`flex h-screen overflow-hidden flex-col ${isDarkMode ? "bg-slate-950 text-slate-50" : "bg-white text-slate-900"}`}>
      {/* Header with logout */}
      <div
        className={`z-50 flex items-center justify-between px-4 py-3 border-b ${
          isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="flex items-center gap-2">
          <Database size={24} className="text-indigo-500" />
          <h1 className="text-xl font-bold">ERD Builder</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            title="Undo (Ctrl/Cmd+Z)"
            className={`p-2 rounded-lg transition-all ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-200 text-slate-700"}`}
          >
            <Undo2 size={16} />
          </button>

          {/* <button
            onClick={redo}
            title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
            className={`p-2 rounded-lg transition-all ${isDarkMode ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-200 text-slate-700"}`}
          >
            <Redo2 size={16} />
          </button> */}
          {/* Feature 1: Lock/Unlock Button */}
<button
  onClick={() => {
    const newLockState = !isLocked;
    setIsLocked(newLockState);
    onSave({ is_locked: newLockState } as any);

    push({
      title: `Diagram ${newLockState ? "locked" : "unlocked"}`,
      description: newLockState ? "Ctrl+L to unlock" : "Ctrl+L to lock",
      type: "info"
    });
  }}
  title={isLocked ? "Unlock diagram (Ctrl/Cmd+L)" : "Lock diagram (Ctrl/Cmd+L)"}
  className={`p-2 rounded-lg transition-all ${
    isLocked
      ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
      : isDarkMode
      ? "hover:bg-slate-800 text-slate-300"
      : "hover:bg-slate-200 text-slate-700"
  }`}
>
  {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
</button>

<span className="mx-2 opacity-30">|</span>

          
          
          {/* Presence Indicator */}
          <PresenceIndicator 
            users={presenceUsers} 
            isConnected={presenceConnected} 
            isDarkMode={isDarkMode} 
          />
          
          <span className="mx-2 opacity-30">|</span>
          <span className="text-xs text-slate-400">{user.email || user.name}</span>

          {/* <button
  onClick={() => logout({ returnTo: window.location.origin })}
  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-semibold"
>
  <LogOut size={16} />
  Logout
</button> */}
 <LogoutButton onLogout={onLogout} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR TOOLBAR */}
        <div
          className={`w-16 border-r flex flex-col items-center py-4 space-y-3 shadow-sm z-30 transition-colors duration-300 ${
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          {/* Back button */}
          <button
            onClick={onBack}
            title="Back to Diagrams"
            className="p-2 hover:bg-slate-500/15 rounded-xl text-slate-400 hover:text-slate-200 transition-all duration-200 active:scale-95 hover:scale-110 mb-1"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="p-2 bg-indigo-600 rounded-xl text-white mb-1 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-shadow duration-300">
            <Database size={24} />
          </div>

          <button
            onClick={addTable}
            title="Add Table"
            className="p-2.5 hover:bg-indigo-500/15 rounded-xl text-indigo-500 transition-all duration-200 active:scale-95 hover:scale-110"
          >
            <Plus size={22} />
          </button>

          <button
            onClick={resetViewport}
            title="Reset Zoom"
            className="p-2.5 hover:bg-slate-500/15 rounded-xl text-slate-500 transition-all duration-200 active:scale-95 hover:scale-110"
          >
            <Maximize size={20} />
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title="Toggle Theme"
            className="p-2.5 hover:bg-amber-500/15 rounded-xl text-amber-500 transition-all duration-200 active:scale-95 hover:scale-110"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className={`border-t w-8 my-2 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-slate-300"}`}></div>

          <button onClick={exportJSON} title="Download JSON Backup" className="p-2.5 hover:bg-emerald-500/15 rounded-xl text-emerald-500 transition-all duration-200 active:scale-95 hover:scale-110">
            <Save size={20} />
          </button>

          <label className="p-2.5 hover:bg-blue-500/15 rounded-xl text-blue-500 cursor-pointer transition-all duration-200 active:scale-95 hover:scale-110 inline-block" title="Import Schema">
            <Upload size={20} />
            <input type="file" className="hidden" onChange={importJSON} accept=".json" />
          </label>

          <button onClick={exportPNG} title="Export PNG Image" className="p-2.5 hover:bg-purple-500/15 rounded-xl text-purple-500 transition-all duration-200 active:scale-95 hover:scale-110">
            <Download size={20} />
          </button>

          <button onClick={generateMySQLDDL} title="Export SQL DDL (MySQL)" className="p-2.5 hover:bg-indigo-500/15 rounded-xl text-indigo-500 transition-all duration-200 active:scale-95 hover:scale-110">
            <FileText size={20} />
          </button>

          <button
            onClick={() => setIsGridSnap((prev) => !prev)}
            title={`Grid snapping ${isGridSnap ? "ON" : "OFF"} (Ctrl/Cmd+G)`}
            className={`p-2.5 rounded-xl transition-all duration-200 active:scale-95 hover:scale-110 ${
              isGridSnap ? "bg-slate-500/10" : ""
            } ${isDarkMode ? "text-slate-300 hover:bg-slate-700/40" : "text-slate-700 hover:bg-slate-100"}`}
          >
            <Grid3x3 size={20} />
          </button>

          <div className="flex-1" />

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? "Collapse Designer Panel" : "Open Designer Panel"}
            className="p-2.5 hover:bg-slate-700/40 rounded-xl text-slate-400 hover:text-slate-200 transition-all duration-200 active:scale-95 hover:scale-110"
          >
            {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>

          {/* Cloud sync status */}
          <div className="flex flex-col items-center gap-1 mb-2">
            <div className={`transition-all duration-500 ${syncing || isSaving ? "text-indigo-500 animate-pulse" : isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
              {syncing ? <Cloud size={16} /> : <CheckCircle2 size={16} />}
            </div>
            <span
              className={`text-[8px] font-bold uppercase vertical-text tracking-widest leading-none transition-colors duration-300 ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}
              style={{ writingMode: "vertical-rl" }}
            >
              {syncing ? "Syncing..." : isSaving ? "Saving..." : "Cloud Sync"}
            </span>
          </div>
        </div>

        {/* CANVAS */}
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden cursor-crosshair user-select-none"
          onWheel={handleWheel}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={(e) => {
            handleMouseMove(e);
            // Update cursor position for presence
            const world = toWorld(e.clientX, e.clientY);
            updateCursor(world.x, world.y);
          }}
          onMouseUp={(e) => handleMouseUp(e)}
          onMouseLeave={() => handleMouseUp()}
          onContextMenu={(e) => e.preventDefault()}
          onClick={(e) => {
            if (e.target === e.currentTarget) clearAllSelections();
          }}
          style={{
            backgroundImage: isDarkMode ? "radial-gradient(#1e293b 1px, transparent 1px)" : "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: `${30 * viewport.zoom}px ${30 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }}
        >
          {/* Live cursors from other users */}
          {presenceUsers.map((pUser) => (
            <LiveCursor key={pUser.id} user={pUser} viewport={viewport} />
          ))}
          <div
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              transformOrigin: "0 0",
              transition: isPanning ? "none" : "transform 0.1s ease-out",
            }}
          >
            <svg className="absolute inset-0 pointer-events-none overflow-visible w-[5000px] h-[5000px]">
              {relations.map((r) => {
                const path = getPath(r);
                if (!path) return null;

                const isSelected = selectedEdgeId === r.id;
                const connectedEdge = isEdgeConnected(r.id);
                const showHandle = isSelected;
                const labelPos = r.label ? getLabelPos(r) : null;

                return (
                  <g key={r.id} className="pointer-events-auto cursor-pointer">
                    <path d={path} fill="none" stroke="transparent" strokeWidth="22" onClick={(e) => handleEdgeClick(e as any, r.id)} />

                    <path
                      d={path}
                      fill="none"
                      stroke={edgeStroke(r)}
                      strokeWidth={edgeWidth(r)}
                      strokeDasharray={r.isDashed ? "5,5" : "0"}
                      className="transition-all"
                      onClick={(e) => handleEdgeClick(e as any, r.id)}
                    />

                    {r.label && labelPos && (
                      <text
                        x={labelPos.x}
                        y={labelPos.y - 6}
                        fill={labelFill(r)}
                        fontSize="11"
                        fontWeight="800"
                        textAnchor="middle"
                        className="select-none"
                        style={{
                          paintOrder: "stroke",
                          stroke: isDarkMode ? "rgba(2,6,23,0.65)" : "rgba(248,250,252,0.85)",
                          strokeWidth: connectedEdge ? 3 : 2,
                        }}
                        onClick={(e) => handleEdgeClick(e as any, r.id)}
                      >
                        {r.label}
                      </text>
                    )}

                    {showHandle &&
                      (() => {
                        const a = getAnchors(r);
                        if (!a) return null;
                        const { cx, cy } = a;

                        return (
                          <g>
                            <circle
                              cx={cx}
                              cy={cy}
                              r={7}
                              fill={isDarkMode ? "#0f172a" : "#ffffff"}
                              stroke="#6366f1"
                              strokeWidth="2"
                              className="cursor-grab active:cursor-grabbing"
                              onMouseDown={(e) => handleEdgeHandleMouseDown(e as any, r.id)}
                            />
                            <circle
                              cx={cx}
                              cy={cy}
                              r={16}
                              fill="transparent"
                              className="cursor-grab active:cursor-grabbing"
                              onMouseDown={(e) => handleEdgeHandleMouseDown(e as any, r.id)}
                            />
                          </g>
                        );
                      })()}
                  </g>
                );
              })}
            </svg>

            {tables.map((table) => {
              const primary = isTablePrimarySelected(table.id);
              const connectedTbl = isTableConnected(table.id);
              const anySel = activeSelectedTableIds.size > 0 || !!selectedEdgeId;
              const dimUnconnected = anySel && !primary && !connectedTbl;

              const borderClass = primary
                ? isDarkMode
                  ? "border-indigo-500 shadow-lg shadow-indigo-500/30"
                  : "border-indigo-400 shadow-lg shadow-indigo-400/25"
                : connectedTbl && anySel
                ? isDarkMode
                  ? "border-indigo-300/60 shadow-indigo-500/10"
                  : "border-indigo-300 shadow-indigo-300/15"
                : isDarkMode
                ? "border-slate-800 shadow-lg shadow-slate-950/30"
                : "border-slate-300 shadow-md shadow-slate-400/15";

              return (
                <div
                  key={table.id}
                  className={`absolute w-56 rounded-xl border-2 transition-all duration-300 select-none user-select-none hover:shadow-xl
                    ${isDarkMode ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}
                    ${borderClass}
                    ${dimUnconnected ? "opacity-30 scale-95" : ""}
                  `}
                  style={{
                    left: table.x,
                    top: table.y,
                    zIndex: primary ? 30 : connectedTbl ? 20 : 10,
                    boxShadow: table.color ? `0 6px 24px -8px ${table.color}45` : undefined,
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleTableMouseDown(e, table.id);
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div
                    className={`p-3 rounded-t-xl cursor-grab active:cursor-grabbing border-b flex items-center justify-between min-w-0 user-select-none transition-colors duration-200
                      ${isDarkMode ? "bg-slate-800/70 border-slate-700 hover:bg-slate-800" : "bg-slate-100 border-slate-200 hover:bg-slate-150"}`}
                    style={{ background: table.color ? `${table.color}22` : undefined }}
                  >
                    <span className={`font-black text-[10px] uppercase tracking-widest opacity-70 truncate ${primary ? "text-indigo-200" : ""}`}>
                      {table.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        title="Duplicate"
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateTable(table.id);
                        }}
                        className={`p-1 rounded-md transition-all ${isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-200"}`}
                      >
                        <Copy size={12} />
                      </button>
                      <GripHorizontal size={14} className="opacity-30 flex-shrink-0" />
                    </div>
                  </div>

                  <div className="p-2.5 space-y-1.5">
                    {table.columns.map((col) => (
                      <div
                        key={col.id}
                        className={`flex items-center text-[11px] justify-between px-1 py-1 rounded transition-colors duration-150 ${
                          isDarkMode ? "hover:bg-slate-700/30" : "hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {col.isPk && <Key size={10} className="text-amber-500 flex-shrink-0" />}
                          {col.isFk && <LinkIcon size={10} className="text-indigo-500 flex-shrink-0" />}
                          <span
                            className={`truncate ${col.isPk ? "font-bold" : ""} ${
                              isDarkMode ? (col.isPk ? "text-indigo-300" : "text-slate-300") : col.isPk ? "text-indigo-700" : "text-slate-700"
                            }`}
                          >
                            {col.name}
                          </span>
                        </div>
                        <span className={`text-[9px] font-mono flex-shrink-0 ml-1 ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>{col.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {lassoRect &&
            (() => {
              const left = lassoRect.x * viewport.zoom + viewport.x;
              const top = lassoRect.y * viewport.zoom + viewport.y;
              const width = lassoRect.w * viewport.zoom;
              const height = lassoRect.h * viewport.zoom;

              return (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left,
                    top,
                    width,
                    height,
                    border: "2px solid rgba(99,102,241,0.75)",
                    background: "rgba(99,102,241,0.12)",
                    borderRadius: 10,
                  }}
                />
              );
            })()}

          <div
            className={`absolute bottom-6 left-6 px-4 py-2 backdrop-blur-xl border rounded-full text-[10px] font-bold uppercase tracking-widest pointer-events-none transition-all duration-200 ${
              isDarkMode ? "bg-slate-900/60 border-slate-700 text-slate-300 shadow-lg shadow-slate-950/40" : "bg-white/70 border-slate-200 text-slate-700 shadow-md shadow-slate-400/10"
            }`}
          >
            Zoom: {Math.round(viewport.zoom * 100)}%
          </div>

          <button
            onClick={() => setShowCommandTips(!showCommandTips)}
            className={`absolute bottom-6 right-6 px-4 py-2 backdrop-blur-xl border rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${
              isDarkMode
                ? "bg-slate-900/60 border-slate-700 text-slate-300 shadow-lg shadow-slate-950/40 hover:bg-slate-800/60 hover:border-slate-600"
                : "bg-white/70 border-slate-200 text-slate-700 shadow-md shadow-slate-400/10 hover:bg-white/80 hover:border-slate-300"
            }`}
          >
            {showCommandTips ? (
              <div className="flex flex-col gap-2">
                <div className="text-[9px]">Keyboard & Mouse</div>
                <div className="space-y-1 text-[9px] font-normal opacity-90">
                  <div>Shift+Click: multi-select</div>
                  <div>Drag empty: lasso select</div>
                  <div>Right-drag: pan canvas</div>
                  <div>Click edge: bend line</div>
                  <div>Ctrl/Cmd+Z: undo, Ctrl+Shift+Z: redo</div>
                  {/* <div>Ctrl/Cmd+S: export JSON, Ctrl/Cmd+P: export PNG</div> */}
                  <div>Ctrl/Cmd+D: duplicate table</div>
                  <div>Ctrl/Cmd+G: toggle grid snapping</div>
                  <div>Delete: remove selection</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span>?</span>
                <span>Commands</span>
              </div>
            )}
          </button>

          {/* Exporting indicator */}
          {/* {isExportingPNG && (
            <div
              className={`absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                isDarkMode ? "bg-slate-900/80 border border-slate-700" : "bg-white/80 border border-slate-300"
              }`}
            >
              Exporting PNG...
            </div>
          )} */}
        </div>

        {/* EDITOR SIDEBAR */}
        <div
          className={`border-l shadow-2xl z-30 flex flex-col transition-all duration-300 overflow-hidden ${
            isSidebarOpen ? "w-80" : "w-0"
          } ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"}`}
        >
          {/* Header with toggle button */}
          <div
            className={`p-4 border-b flex items-center justify-between whitespace-nowrap transition-colors duration-300 ${
              isDarkMode ? "border-slate-800" : "border-slate-200"
            }`}
          >
            <h3 className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
              <Settings size={16} className="text-indigo-500" /> Designer
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold opacity-40 uppercase">Saved</span>
              <span className="text-[10px] font-mono text-indigo-400">{lastSaved || "..."}</span>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 hover:bg-slate-800/50 rounded text-slate-400 hover:text-slate-200 flex-shrink-0"
                title="Collapse sidebar"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className={`p-5 space-y-6 overflow-y-auto flex-1 transition-colors duration-300`}>
            {selectedTableId ? (
              (() => {
                const t = tables.find((x) => x.id === selectedTableId)!;
                return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Table Name */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Table name
          </label>
          <input
            className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none border transition-all duration-200 ${
              isDarkMode
                ? "bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500 focus:bg-slate-900"
                : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400 focus:bg-slate-50"
            } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
            value={t.name}
            onChange={(e) => !isLocked && setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
            onBlur={() => pushHistory()}
            disabled={isLocked}
          />
        </div>

        {/* Feature 3: Description */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Description (optional)
          </label>
          <textarea
            className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none border transition-all duration-200 resize-none ${
              isDarkMode
                ? "bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500 focus:bg-slate-900"
                : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400 focus:bg-slate-50"
            } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
            rows={3}
            placeholder="Add notes about this table..."
            value={t.description || ""}
            onChange={(e) => !isLocked && setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, description: e.target.value } : x)))}
            onBlur={() => pushHistory()}
            disabled={isLocked}
          />
          {t.description && (
            <div className={`text-[9px] opacity-75 ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>
              {t.description.length} characters
            </div>
          )}
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Color
          </label>
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md border cursor-pointer"
              style={{ background: t.color || "#64748b" }}
              title="Current color"
            />
            <div className="flex items-center gap-2">
              {["#64748b", "#60a5fa", "#34d399", "#f59e0b", "#a78bfa", "#ef4444"].map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-md border hover:scale-105 transition-transform ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  style={{ background: c }}
                  onClick={() => {
                    if (!isLocked) {
                      setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, color: c } : x)));
                      pushHistory();
                    }
                  }}
                  disabled={isLocked}
                  title="Set color"
                />
              ))}
            </div>
            <Palette size={14} className="opacity-40" />
          </div>
        </div>

        {/* Columns */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Columns
            </label>
            <button
              onClick={() => {
                if (!isLocked) {
                  setTables((prev) =>
                    prev.map((x) =>
                      x.id === t.id
                        ? {
                            ...x,
                            columns: [
                              ...x.columns,
                              { id: generateId(), name: "new_col", type: "VARCHAR", isPk: false, isFk: false },
                            ],
                          }
                        : x
                    )
                  );
                }
              }}
              disabled={isLocked}
              className={`text-indigo-500 text-[10px] font-bold hover:underline hover:text-indigo-600 transition-colors duration-200 ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
              onMouseUp={() => pushHistory()}
            >
              + Add column
            </button>
          </div>

          {t.columns.map((col) => (
            <div
              key={col.id}
              className={`p-3 rounded-xl border space-y-2 transition-all duration-200 ${
                isDarkMode ? "bg-slate-950 border-slate-700 hover:bg-slate-900 hover:border-slate-600" : "bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-300"
              } ${isLocked ? "opacity-60" : ""}`}
            >
              <div className="flex gap-2">
                <input
                  className={`bg-transparent text-xs w-full outline-none font-bold transition-colors duration-200 ${
                    isDarkMode ? "text-slate-100" : "text-slate-900"
                  } ${isLocked ? "cursor-not-allowed" : ""}`}
                  value={col.name}
                  onChange={(e) =>
                    !isLocked && setTables((prev) =>
                      prev.map((x) =>
                        x.id === t.id
                          ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, name: e.target.value } : c)) }
                          : x
                      )
                    )
                  }
                  onBlur={() => pushHistory()}
                  disabled={isLocked}
                />
                <button
                  className={`transition-colors duration-200 ${isDarkMode ? "text-slate-500 hover:text-red-500" : "text-slate-600 hover:text-red-600"} ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => {
                    if (!isLocked) {
                      setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, columns: x.columns.filter((c) => c.id !== col.id) } : x)));
                    }
                  }}
                  disabled={isLocked}
                  onMouseUp={() => pushHistory()}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex gap-3">
                <label className="flex items-center text-[10px] gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={col.isPk}
                    onChange={(e) =>
                      !isLocked && setTables((prev) =>
                        prev.map((x) =>
                          x.id === t.id
                            ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, isPk: e.target.checked } : c)) }
                            : x
                        )
                      )
                    }
                    disabled={isLocked}
                    onMouseUp={() => pushHistory()}
                  />{" "}
                  PK
                </label>

                <label className="flex items-center text-[10px] gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={col.isFk}
                    onChange={(e) =>
                      !isLocked && setTables((prev) =>
                        prev.map((x) =>
                          x.id === t.id
                            ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, isFk: e.target.checked } : c)) }
                            : x
                        )
                      )
                    }
                    disabled={isLocked}
                    onMouseUp={() => pushHistory()}
                  />{" "}
                  FK
                </label>

                <select
                  className={`bg-transparent text-[10px] outline-none ml-auto transition-colors duration-200 ${isDarkMode ? "text-slate-500" : "text-slate-600"} ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                  value={col.type}
                  onChange={(e) =>
                    !isLocked && setTables((prev) =>
                      prev.map((x) =>
                        x.id === t.id
                          ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, type: e.target.value } : c)) }
                          : x
                      )
                    )
                  }
                  disabled={isLocked}
                  onMouseUp={() => pushHistory()}
                >
                  <option>INT</option>
                  <option>UUID</option>
                  <option>VARCHAR</option>
                  <option>TEXT</option>
                  <option>BOOL</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Feature 2: Relationships Section */}
        {selectedTableRelationships.length > 0 && (
          <div className={`pt-4 border-t transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
            <label className={`text-[10px] font-bold uppercase block mb-2 transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              {selectedTableRelationships.length} Relationship{selectedTableRelationships.length !== 1 ? "s" : ""}
            </label>
            <div className="space-y-2 mb-4">
              {selectedTableRelationships.map((r) => {
                const isSource = r.sourceTableId === selectedTableId;
                const targetId = isSource ? r.targetTableId : r.sourceTableId;
                const targetTable = tables.find(t => t.id === targetId);
                
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedEdgeId(r.id)}
                    className={`p-2 rounded-lg text-xs cursor-pointer border transition-all ${
                      selectedEdgeId === r.id
                        ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                        : isDarkMode 
                          ? "border-indigo-700/50 text-indigo-300 hover:bg-indigo-900/30 hover:border-indigo-600"
                          : "border-indigo-300/50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400"
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1">
                      {isSource ? "→" : "←"} {targetTable?.name || "Unknown"}
                    </div>
                    {r.label && <div className="text-[9px] opacity-75 mt-1">FK: {r.label}</div>}
                    <div className="text-[8px] opacity-50 mt-1">
                      {r.lineType === "curved" ? "Curved" : "Straight"} {r.isDashed ? "• Dashed" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Connect to table */}
        <div className={`pt-4 border-t transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
          <label className={`text-[10px] font-bold uppercase block mb-3 transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Connect to table
          </label>
          <input
            type="text"
            placeholder="Search tables..."
            value={connectTableSearch}
            onChange={(e) => setConnectTableSearch(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg text-xs mb-3 border outline-none transition-all duration-200 ${
              isDarkMode
                ? "bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
            disabled={isLocked}
          />
          <div className="grid grid-cols-1 gap-2">
            {tables
              .filter((x) => x.id !== t.id && x.name.toLowerCase().includes(connectTableSearch.toLowerCase()))
              .map((target) => {
                const isLinked = relations.some(
                  (r) =>
                    (r.sourceTableId === t.id && r.targetTableId === target.id) ||
                    (r.sourceTableId === target.id && r.targetTableId === t.id)
                );
                return (
                  <button
                    key={target.id}
                    onClick={() => !isLocked && toggleRelation(t.id, target.id)}
                    disabled={isLocked}
                    className={`text-left px-3 py-2 rounded-lg text-xs border transition-all duration-200 ${
                      isLocked ? "opacity-50 cursor-not-allowed" : ""
                    } ${
                      isLinked
                        ? isDarkMode
                          ? "bg-indigo-900/40 border-indigo-600 text-indigo-200 hover:bg-indigo-900/60"
                          : "bg-indigo-100 border-indigo-400 text-indigo-900 hover:bg-indigo-200"
                        : isDarkMode
                        ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                        : "border-slate-300 text-slate-900 hover:bg-slate-100 hover:border-slate-400"
                    }`}
                  >
                    {isLinked ? "✓ " : ""}Link to {target.name}
                  </button>
                );
              })}
            {tables.filter((x) => x.id !== t.id && x.name.toLowerCase().includes(connectTableSearch.toLowerCase())).length === 0 && (
              <div className={`text-xs py-3 text-center transition-colors duration-200 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                {connectTableSearch.length > 0 ? "No tables found" : "No other tables available"}
              </div>
            )}
          </div>
        </div>

        {/* Feature 4: Comments Section */}
        <div className={`pt-4 border-t transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
          <div className="flex items-center justify-between mb-3">
            <label className={`text-[10px] font-bold uppercase transition-colors duration-200 flex items-center gap-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              <MessageSquare size={12} />
              Comments {comments.length > 0 && `(${comments.length})`}
            </label>
          </div>

          {/* Add comment form */}
          {!isLocked && (
            <div className="mb-4 space-y-2">
              <textarea
                className={`w-full rounded-lg px-3 py-2 text-xs outline-none border focus:ring-2 focus:ring-indigo-500 resize-none transition-all duration-200 ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500"
                    : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400"
                }`}
                rows={2}
                placeholder="Add a comment..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
              />
              <button
                onClick={async () => {
                  if (newCommentText.trim()) {
                    try {
                      await addComment(newCommentText);
                      setNewCommentText("");
                      push({ title: "Comment added", type: "success" });
                    } catch (err) {
                      push({ title: "Failed to add comment", type: "error" });
                    }
                  }
                }}
                disabled={!newCommentText.trim() || commentsLoading}
                className="w-full py-1.5 bg-indigo-500/10 text-indigo-500 text-xs font-bold rounded-lg hover:bg-indigo-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Post Comment
              </button>
            </div>
          )}

          {/* Comments list */}
          {commentsLoading ? (
            <div className={`text-xs text-center py-2 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
              Loading comments...
            </div>
          ) : comments.length === 0 ? (
            <div className={`text-xs text-center py-4 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
              No comments yet
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`p-2.5 rounded-lg border transition-all duration-200 ${
                    isDarkMode ? "bg-slate-950/50 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] font-bold ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                        {comment.author_email?.split('@')}
                      </div>
                      <div className={`text-xs my-1.5 leading-relaxed break-words ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        {comment.content}
                      </div>
                      <div className={`text-[8px] ${isDarkMode ? "text-slate-600" : "text-slate-500"}`}>
                        {new Date(comment.created_at).toLocaleDateString()} at {new Date(comment.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    {comment.author_id === user.id && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className={`p-1 rounded transition-all flex-shrink-0 ${isDarkMode ? "hover:bg-red-900/20 text-red-500" : "hover:bg-red-100 text-red-600"}`}
                        title="Delete comment"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature 5: Sample Data */}
        <div className={`pt-4 border-t transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
          <button
            onClick={() => {
              if (!sampleDataShown) {
                const data = generateSampleData(t.columns, 5);
                setSampleData(data);
                setSampleDataShown(true);
              } else {
                setSampleDataShown(false);
              }
            }}
            className={`w-full px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-200 flex items-center justify-center gap-2 ${
              sampleDataShown
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-500"
                : isDarkMode 
                  ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                  : "border-slate-300 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Zap size={12} />
            {sampleDataShown ? "Hide" : "Show"} Sample Data
          </button>

          {sampleDataShown && sampleData.length > 0 && (
            <div className="mt-3 space-y-2">
              {/* Sample data mini table */}
              <div className={`overflow-x-auto rounded-lg border transition-all duration-200 ${
                isDarkMode ? "border-slate-800 bg-slate-950/30" : "border-slate-200 bg-slate-50"
              }`}>
                <table className="w-full text-[9px]">
                  <thead>
                    <tr className={`border-b transition-colors duration-200 ${isDarkMode ? "border-slate-800 bg-slate-900/50" : "border-slate-200 bg-slate-100"}`}>
                      {t.columns.map((col) => (
                        <th key={col.id} className={`px-2 py-1.5 text-left font-bold ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                          <div className="truncate">{col.name}</div>
                          <div className={`text-[8px] font-normal opacity-60 mt-0.5 ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>
                            {col.type}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.slice(0, 3).map((row, idx) => (
                      <tr key={idx} className={`border-b transition-colors duration-200 hover:bg-opacity-50 ${isDarkMode ? "border-slate-800 hover:bg-slate-900/20" : "border-slate-100 hover:bg-slate-100"}`}>
                        {t.columns.map((col) => (
                          <td key={col.id} className={`px-2 py-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"} truncate max-w-xs`}>
                            {String(row[col.name])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Quick copy buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const json = sampleDataToJSON(t.name, t.columns, sampleData);
                    navigator.clipboard.writeText(json);
                    push({ title: "JSON copied to clipboard", type: "success" });
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 ${
                    isDarkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Copy JSON
                </button>
                <button
                  onClick={() => {
                    const sql = sampleDataToSQLInsert(t.name, t.columns, sampleData);
                    navigator.clipboard.writeText(sql);
                    push({ title: "SQL INSERT copied", type: "success" });
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all duration-200 ${
                    isDarkMode ? "border-slate-700 text-slate-400 hover:bg-slate-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Copy SQL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete buttons */}
        <div className="flex items-center gap-2 pt-4 border-t transition-colors duration-300" style={{borderColor: isDarkMode ? "#1e293b" : "#e2e8f0"}}>
          <button
            onClick={() => duplicateTable(t.id)}
            disabled={isLocked}
            className={`flex-1 py-2 bg-indigo-500/10 text-indigo-500 text-xs font-bold rounded-lg hover:bg-indigo-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
          >
            Duplicate table
          </button>
          <button
            onClick={() => {
              if (!isLocked) {
                setTables(tables.filter((x) => x.id !== t.id));
                setRelations(relations.filter((r) => r.sourceTableId !== t.id && r.targetTableId !== t.id));
                setSelectedTableId(null);
                setMultiSelectedTableIds(new Set());
                pushHistory();
                push({ title: "Table deleted", type: "info" });
              }
            }}
            disabled={isLocked}
            className="flex-1 py-2 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Delete table
          </button>
        </div>
      </div>
    );
  })()
) : selectedEdgeId ? (
              (() => {
                const r = relations.find((x) => x.id === selectedEdgeId)!;
                return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="space-y-2">
                      <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Edge label</label>
                      <input
                        className={`w-full rounded-lg px-3 py-2 text-sm outline-none border focus:ring-2 focus:ring-indigo-500 transition-all duration-200 ${
                          isDarkMode ? "bg-slate-950 border-slate-700 text-slate-100 focus:bg-slate-900 focus:border-indigo-500" : "bg-white border-slate-300 text-slate-900 focus:bg-slate-50 focus:border-indigo-400"
                        }`}
                        placeholder="e.g. user_id"
                        value={r.label || ""}
                        onChange={(e) => setRelations((prev) => prev.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))}
                        onBlur={() => pushHistory()}
                      />
                    </div>

                    <div className="space-y-3">
                      <label className={`text-[10px] font-bold uppercase block transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Line style</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRelations((prev) => prev.map((x) => (x.id === r.id ? { ...x, isDashed: !x.isDashed } : x)))}
                          className={`flex-1 py-2 rounded-lg text-xs border transition-all ${
                            r.isDashed ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" : isDarkMode ? "border-slate-700 text-slate-400" : "border-slate-200"
                          }`}
                          onMouseUp={() => pushHistory()}
                        >
                          Dotted
                        </button>

                        <button
                          onClick={() =>
                            setRelations((prev) =>
                              prev.map((x) => (x.id === r.id ? { ...x, lineType: x.lineType === "curved" ? "straight" : "curved" } : x))
                            )
                          }
                          className={`flex-1 py-2 rounded-lg text-xs border transition-all duration-200 ${
                            r.lineType === "straight"
                              ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20"
                              : isDarkMode
                              ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                              : "border-slate-300 text-slate-600 hover:bg-slate-100"
                          }`}
                          onMouseUp={() => pushHistory()}
                        >
                          Straight
                        </button>
                      </div>

                      <div className={`text-[11px] leading-relaxed transition-colors duration-200 ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>
                        Tip: Click an edge to select it, then drag the small handle to bend/route it.
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setRelations(relations.filter((x) => x.id !== r.id));
                        setSelectedEdgeId(null);
                        pushHistory();
                        push({ title: "Connection removed", type: "info" });
                      }}
                      className="w-full py-2 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200"
                    >
                      Remove connection
                    </button>
                  </div>
                );
              })()
            ) : (
              <div className={`space-y-5`}>
                <div className={`h-full flex flex-col items-center justify-center text-center select-none transition-colors duration-300 ${isDarkMode ? "text-slate-700" : "text-slate-400"}`}>
                  <MousePointer2 size={40} className="mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">
                    Select an element
                    <br />
                    to edit settings
                  </p>
                </div>

                <div className={`space-y-2`}>
                  <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Quick templates</label>
                  <div className="grid grid-cols-1 gap-2">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.name}
                        onClick={tpl.apply}
                        className={`text-left px-3 py-2 rounded-lg text-xs border transition-all duration-200 ${
                          isDarkMode ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600" : "border-slate-300 text-slate-900 hover:bg-slate-100 hover:border-slate-400"
                        }`}
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`p-4 border-t transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAllSelections}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all duration-200 ${
                  isDarkMode ? "border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300" : "border-slate-300 hover:bg-slate-100 hover:border-slate-400 text-slate-700"
                }`}
              >
                Clear selection
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className={`p-2 rounded-lg text-xs font-bold border transition-all duration-200 ${
                  isDarkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-slate-300 hover:bg-slate-100 text-slate-700"
                }`}
                title="Collapse"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 flex flex-col gap-2 z-[60]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2 rounded-lg shadow-lg backdrop-blur-md border text-sm transition-all ${
              t.type === "success"
                ? isDarkMode
                  ? "bg-emerald-900/50 border-emerald-700 text-emerald-200"
                  : "bg-emerald-100 border-emerald-300 text-emerald-800"
                : t.type === "error"
                ? isDarkMode
                  ? "bg-rose-900/50 border-rose-700 text-rose-200"
                  : "bg-rose-100 border-rose-300 text-rose-800"
                : isDarkMode
                ? "bg-slate-900/60 border-slate-700 text-slate-200"
                : "bg-white/70 border-slate-300 text-slate-800"
            }`}
          >
            <div className="font-semibold">{t.title}</div>
            {t.description && <div className="text-xs opacity-80">{t.description}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth();
  const [selectedDiagram, setSelectedDiagram] = useState<ERDDiagram | null>(null);
  const [showSelector, setShowSelector] = useState(true);
  
  // Use Supabase user id for cloud sync
  const userId = user?.id;
  const {
    diagrams,
    loading: cloudLoading,
    syncing,
    teamId,
    createDiagram,
    saveDiagram,
    deleteDiagram,
    loadDiagram,
    profileExists,
    error: cloudError,
  } = useCloudSync(userId);
  const [bootstrapped, setBootstrapped] = useState(false);
  // useEffect(() => {
  //   if (!authLoading && !isAuthenticated) {
  //     navigate('/auth');
  //   }
  // }, [authLoading, isAuthenticated, navigate]);
  useEffect(() => {
  let mounted = true;

  (async () => {
    const { data } = await supabase.auth.getSession();
    if (!mounted) return;

    const session = data.session;

    // PASSWORD RECOVERY HAS HIGHEST PRIORITY
    if (
      session &&
      window.location.hash.includes("type=recovery")
    ) {
      navigate("/reset-password", { replace: true });
      setBootstrapped(true);
      return;
    }

    // NOT AUTHENTICATED
    if (!session) {
      navigate("/auth", { replace: true });
      setBootstrapped(true);
      return;
    }

    // AUTHENTICATED
    navigate("/diagrams", { replace: true });
    setBootstrapped(true);
  })();

  return () => {
    mounted = false;
  };
}, [navigate]);
  if (!bootstrapped) {
    return null;
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleSave = async (updates: { tables?: Json; relations?: Json; viewport?: Json; is_dark_mode?: boolean }) => {
    if (selectedDiagram) {
      await saveDiagram(selectedDiagram.id, updates);
    }
  };

  const handleBack = () => {
    setSelectedDiagram(null);
    setShowSelector(true);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Show diagram selector
  if (showSelector && !selectedDiagram) {
    return (
      <DiagramSelector
        diagrams={diagrams}
        loading={cloudLoading || !profileExists}
        error={cloudError}
        teamId={teamId}
        onSelect={async (diagram) => {
          const loaded = await loadDiagram(diagram.id);
          if (loaded) {
            setSelectedDiagram(loaded);
            setShowSelector(false);
          }
        }}
        onCreate={async () => {
          const newDiagram = await createDiagram('New Diagram');
          if (newDiagram) {
            setSelectedDiagram(newDiagram);
            setShowSelector(false);
          }
        }}
        onDelete={async (id) => {
          await deleteDiagram(id);
        }}
        onLogout={handleLogout}
      />
    );
  }

  const appUser: AppUser = {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.display_name || user.email,
    user_metadata: user.user_metadata,
  };

  return (
    <ERDBuilder
      user={appUser}
      diagram={selectedDiagram}
      onSave={handleSave}
      onBack={handleBack}
      syncing={syncing}
      onLogout={handleLogout}
    />
  );
}