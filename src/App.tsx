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
  Upload,
  CheckCircle2,
  Maximize,
  LogOut,
  ChevronRight,
  ChevronLeft,
  Copy,
  Undo2,
  Grid3x3,
  FileText,
  Cloud,
  ArrowLeft,
  Loader2,
  Lock,           // ADD THIS
  Unlock,         // ADD THIS
  MessageSquare,  // ADD THIS for comments
} from "lucide-react";

// Add these utility imports:
import { useTableComments } from "./hooks/useTableComments";

import html2canvas from "html2canvas";
import { useCloudSync, type ERDDiagram } from "./hooks/useCloudSync";
import { usePresence } from "./hooks/usePresence";
import { DiagramSelector } from "./components/DiagramSelector";
import { PresenceIndicator, LiveCursor } from "./components/PresenceIndicator";
import type { Json } from "./integrations/supabase/types";

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
  onSave: (updates: { tables?: Json; relations?: Json; viewport?: Json; is_dark_mode?: boolean; is_locked?: boolean }) => void;
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

  // --- PERFORMANCE OPTIMIZATION REFS ---
  // Store drag positions in refs for instant visual feedback without setState
  const dragPreviewRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const edgeBendPreviewRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const dragStartTablePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

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
  setMultiSelectedTableIds(new Set());  // ← Clear first, then set single
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

    // Store starting positions for all selected tables
    const selectedIds = multiSelectedTableIds.size > 0 ? multiSelectedTableIds : new Set([tableId]);
    dragStartTablePositionsRef.current.clear();
    for (const id of selectedIds) {
      const t = tables.find(x => x.id === id);
      if (t) dragStartTablePositionsRef.current.set(id, { x: t.x, y: t.y });
    }
    dragPreviewRef.current.clear();

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
    edgeBendPreviewRef.current.clear();
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
    // TABLE DRAG - Check first (highest priority for user interaction)
    if (isDragging && draggedTableId && !isPanning) {
      const world = toWorld(e.clientX, e.clientY);
      const anchorTable = tables.find((t) => t.id === draggedTableId);
      if (!anchorTable) return;

      let newX = world.x - dragOffset.x;
      let newY = world.y - dragOffset.y;

      // Don't snap during drag - snapping happens on drop
      // This allows smooth placement anywhere

      const selectedIds = multiSelectedTableIds.size > 0 ? multiSelectedTableIds : new Set([draggedTableId]);
      const dx = newX - anchorTable.x;
      const dy = newY - anchorTable.y;

      // Store visual offsets in ref (no setState = 60fps)
      dragPreviewRef.current.clear();
      for (const id of selectedIds) {
        const startPos = dragStartTablePositionsRef.current.get(id);
        if (startPos) {
          dragPreviewRef.current.set(id, {
            x: startPos.x + dx,
            y: startPos.y + dy,
          });
        }
      }

      // Trigger re-render via state update (batched by React)
      // But store actual positions in ref for instant visual feedback
      return;
    }

    // EDGE BEND - Second priority
    if (isDraggingEdge && draggedEdgeId && edgeDragStart && edgeDragStartBend && !isPanning) {
      const world = toWorld(e.clientX, e.clientY);
      const dx = world.x - edgeDragStart.x;
      const dy = world.y - edgeDragStart.y;

      edgeBendPreviewRef.current.set(draggedEdgeId, {
        x: edgeDragStartBend.x + dx,
        y: edgeDragStartBend.y + dy,
      });

      return;
    }

    // LASSO SELECTION - Third priority
    if (isLassoing && lassoStart && !isPanning) {
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
      return;
    }

    // PAN - Lowest priority (only if nothing else is active)
    if (isPanning) {
      setViewport((prev) => ({
        ...prev,
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      }));
      return;
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

    // Finalize drag - commit preview positions to state with grid snapping
    if (dragPreviewRef.current.size > 0) {
      setTables((prev) =>
        prev.map((t) => {
          const preview = dragPreviewRef.current.get(t.id);
          if (!preview) return t;

          // Apply grid snapping on drop
          let finalX = preview.x;
          let finalY = preview.y;
          if (isGridSnap) {
            finalX = Math.round(finalX / GRID_SIZE) * GRID_SIZE;
            finalY = Math.round(finalY / GRID_SIZE) * GRID_SIZE;
          }

          return { ...t, x: finalX, y: finalY };
        })
      );
      dragPreviewRef.current.clear();
    }

    // Finalize edge bend
    if (edgeBendPreviewRef.current.size > 0) {
      setRelations((prev) =>
        prev.map((r) => {
          const preview = edgeBendPreviewRef.current.get(r.id);
          if (!preview) return r;
          return { ...r, bend: preview };
        })
      );
      edgeBendPreviewRef.current.clear();
    }

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

  // Force re-render on drag preview changes (smooth visual feedback)
  useEffect(() => {
    if (dragPreviewRef.current.size > 0 || edgeBendPreviewRef.current.size > 0) {
      // Trigger render without setState spam - refs already updated
      const timer = setTimeout(() => {}, 0);
      return () => clearTimeout(timer);
    }
  }, [draggedTableId, draggedEdgeId]);

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
  }, [isLocked, pushHistory, push]);

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
  }, [isLocked, pushHistory, push]);

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
            // Don't clear selections if we just finished dragging
            if (lastActionWasDrag.current) {
              lastActionWasDrag.current = false;
              return;
            }
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
              // Get preview position if dragging
              const previewPos = dragPreviewRef.current.get(table.id);
              const displayX = previewPos?.x ?? table.x;
              const displayY = previewPos?.y ?? table.y;

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
                    left: displayX,
                    top: displayY,
                    zIndex: primary ? 30 : connectedTbl ? 20 : 10,
                    boxShadow: table.color ? `0 6px 24px -8px ${table.color}45` : undefined,
                    willChange: draggedTableId === table.id ? "transform" : "auto",
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
            Table Color
          </label>
          <div className="flex gap-2">
            {["#64748b", "#60a5fa", "#34d399", "#f59e0b", "#f87171", "#a78bfa", "#38bdf8", "#fb923c"].map((color) => (
              <button
                key={color}
                onClick={() => !isLocked && setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, color } : x)))}
                className="w-6 h-6 rounded-lg border-2 transition-all hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: color,
                  borderColor: t.color === color ? "#fff" : "transparent",
                  boxShadow: t.color === color ? `0 0 12px ${color}` : "none",
                }}
                disabled={isLocked}
              />
            ))}
          </div>
        </div>

        {/* Columns Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Columns
            </label>
            {!isLocked && (
              <button
                onClick={() => {
                  const newColumn: Column = {
                    id: generateId(),
                    name: "new_column",
                    type: "VARCHAR",
                    isPk: false,
                    isFk: false,
                  };
                  setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, columns: [...x.columns, newColumn] } : x)));
                  pushHistory();
                }}
                className="p-1 hover:bg-indigo-500/15 rounded text-indigo-500 transition-all text-[10px]"
                title="Add Column"
              >
                + Add
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {t.columns.map((col) => (
              <div key={col.id} className={`p-2.5 rounded-lg border transition-all ${isDarkMode ? "border-slate-700 bg-slate-800/40" : "border-slate-300 bg-slate-100/40"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) =>
                      !isLocked &&
                      setTables((prev) =>
                        prev.map((x) =>
                          x.id === t.id
                            ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, name: e.target.value } : c)) }
                            : x
                        )
                      )
                    }
                    onBlur={() => pushHistory()}
                    placeholder="Column name"
                    className={`flex-1 text-xs px-2 py-1 rounded outline-none border transition-all focus:ring-2 focus:ring-indigo-500 ${
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-indigo-500"
                        : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400"
                    } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                    disabled={isLocked}
                  />

                  {!isLocked && (
                    <button
                      onClick={() => {
                        setTables((prev) =>
                          prev.map((x) =>
                            x.id === t.id ? { ...x, columns: x.columns.filter((c) => c.id !== col.id) } : x
                          )
                        );
                        pushHistory();
                      }}
                      className="p-1 rounded hover:bg-red-500/15 text-red-500 transition-all"
                      title="Delete Column"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={col.type}
                    onChange={(e) =>
                      !isLocked &&
                      setTables((prev) =>
                        prev.map((x) =>
                          x.id === t.id
                            ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, type: e.target.value } : c)) }
                            : x
                        )
                      )
                    }
                    onBlur={() => pushHistory()}
                    className={`flex-1 text-xs px-2 py-1 rounded outline-none border transition-all focus:ring-2 focus:ring-indigo-500 ${
                      isDarkMode
                        ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-indigo-500"
                        : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400"
                    } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                    disabled={isLocked}
                  >
                    <option>INT</option>
                    <option>VARCHAR</option>
                    <option>TEXT</option>
                    <option>BOOL</option>
                    <option>UUID</option>
                  </select>

                  <label className={`flex items-center gap-1 cursor-pointer text-xs ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`} title="Primary Key">
                    <input
                      type="checkbox"
                      checked={col.isPk}
                      onChange={(e) =>
                        !isLocked &&
                        setTables((prev) =>
                          prev.map((x) =>
                            x.id === t.id
                              ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, isPk: e.target.checked } : c)) }
                              : x
                          )
                        )
                      }
                      onBlur={() => pushHistory()}
                      disabled={isLocked}
                      className="accent-amber-500"
                    />
                    <Key size={10} className="text-amber-500" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Relationships Section */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Relationships
          </label>
          {selectedTableRelationships.length > 0 ? (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {selectedTableRelationships.map((rel) => {
                const isForeignTableId = rel.sourceTableId === t.id;
                const otherTableId = isForeignTableId ? rel.targetTableId : rel.sourceTableId;
                const otherTable = tables.find((x) => x.id === otherTableId);

                return (
                  <div
                    key={rel.id}
                    onClick={() => setSelectedEdgeId(rel.id)}
                    className={`p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedEdgeId === rel.id
                        ? isDarkMode
                          ? "border-indigo-500 bg-indigo-500/10"
                          : "border-indigo-400 bg-indigo-400/10"
                        : isDarkMode
                        ? "border-slate-700 bg-slate-800/40 hover:border-slate-600"
                        : "border-slate-300 bg-slate-100/40 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold">
                      <span className={isForeignTableId ? "text-indigo-400" : "text-slate-400"}>{otherTable?.name || "?"}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isDarkMode ? "bg-slate-700" : "bg-slate-300"}`}>
                        {isForeignTableId ? "→" : "←"}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={rel.label || ""}
                      onChange={(e) => {
                        setRelations((prev) =>
                          prev.map((r) => (r.id === rel.id ? { ...r, label: e.target.value || "" } : r))
                        );
                      }}
                      onBlur={() => pushHistory()}
                      onClickCapture={(e) => e.stopPropagation()}
                      placeholder="Label (optional)"
                      className={`w-full mt-1 text-xs px-2 py-1 rounded outline-none border transition-all focus:ring-2 focus:ring-indigo-500 ${
                        isDarkMode
                          ? "bg-slate-900 border-slate-700 text-slate-100 focus:border-indigo-500"
                          : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400"
                      } ${isLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                      disabled={isLocked}
                    />

                    {!isLocked && (
                      <div className="flex gap-1 mt-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRelations((prev) =>
                              prev.map((r) =>
                                r.id === rel.id
                                  ? { ...r, lineType: rel.lineType === "curved" ? "straight" : "curved" }
                                  : r
                              )
                            );
                            pushHistory();
                          }}
                          className={`flex-1 text-[9px] px-2 py-1 rounded transition-all ${
                            rel.lineType === "curved"
                              ? "bg-indigo-500/20 text-indigo-400"
                              : isDarkMode
                              ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                          }`}
                        >
                          {rel.lineType === "curved" ? "Curved" : "Straight"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRelations((prev) =>
                              prev.map((r) =>
                                r.id === rel.id
                                  ? { ...r, isDashed: !rel.isDashed }
                                  : r
                              )
                            );
                            pushHistory();
                          }}
                          className={`flex-1 text-[9px] px-2 py-1 rounded transition-all ${
                            rel.isDashed
                              ? "bg-indigo-500/20 text-indigo-400"
                              : isDarkMode
                              ? "bg-slate-700 text-slate-300 hover:bg-slate-600"
                              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                          }`}
                        >
                          {rel.isDashed ? "Dashed" : "Solid"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRelation(rel.sourceTableId, rel.targetTableId);
                          }}
                          className="flex-1 text-[9px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={`text-[11px] opacity-60 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>No relationships yet</p>
          )}

          {!isLocked && (
            <div className="space-y-2 pt-2">
              <input
                type="text"
                value={connectTableSearch}
                onChange={(e) => setConnectTableSearch(e.target.value)}
                placeholder="Search to connect..."
                className={`w-full text-xs px-2 py-1 rounded outline-none border transition-all focus:ring-2 focus:ring-indigo-500 ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500"
                    : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400"
                }`}
              />
              {connectTableSearch && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {tables
                    .filter(
                      (x) =>
                        x.id !== t.id &&
                        x.name.toLowerCase().includes(connectTableSearch.toLowerCase()) &&
                        !selectedTableRelationships.find(
                          (r) =>
                            (r.sourceTableId === t.id && r.targetTableId === x.id) ||
                            (r.sourceTableId === x.id && r.targetTableId === t.id)
                        )
                    )
                    .map((x) => (
                      <button
                        key={x.id}
                        onClick={() => {
                          toggleRelation(t.id, x.id);
                          setConnectTableSearch("");
                        }}
                        className={`w-full text-xs px-2 py-1 rounded text-left transition-all ${
                          isDarkMode
                            ? "bg-slate-700 hover:bg-indigo-600 text-slate-100"
                            : "bg-slate-200 hover:bg-indigo-400 text-slate-900 hover:text-white"
                        }`}
                      >
                        + Connect to {x.name}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Feature 4: Comments Section */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-bold uppercase transition-colors duration-200 flex items-center gap-1 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              <MessageSquare size={12} /> Comments
            </label>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {commentsLoading ? (
              <div className="text-xs opacity-60">Loading comments...</div>
            ) : comments.length > 0 ? (
              comments.map((c) => (
                <div key={c.id} className={`p-2 rounded-lg text-xs space-y-1 ${isDarkMode ? "bg-slate-800/40 border border-slate-700" : "bg-slate-100/40 border border-slate-300"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-400">{c.user_email?.split("@")[0]}</span>
                    {!isLocked && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="text-red-500 hover:text-red-400 transition-all"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-300 text-[10px]">{c.content}</p>
                </div>
              ))
            ) : (
              <p className={`text-[10px] opacity-60 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>No comments yet</p>
            )}
          </div>

          {!isLocked && (
            <div className="flex gap-1">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Add a comment..."
                className={`flex-1 text-xs px-2 py-1 rounded outline-none border transition-all focus:ring-2 focus:ring-indigo-500 resize-none ${
                  isDarkMode
                    ? "bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500"
                    : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400"
                }`}
                rows={2}
              />
              <button
                onClick={() => {
                  if (newCommentText.trim()) {
                    addComment(newCommentText);
                    setNewCommentText("");
                  }
                }}
                disabled={!newCommentText.trim()}
                className="px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs font-semibold"
              >
                Post
              </button>
            </div>
          )}
        </div>
      </div>
              );
              })()
            ) : selectedEdgeId ? (
              (() => {
                const r = relations.find((x) => x.id === selectedEdgeId)!;
                const s = tables.find((x) => x.id === r.sourceTableId)!;
                const t = tables.find((x) => x.id === r.targetTableId)!;

                return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <h4 className={`text-xs font-bold uppercase mb-2 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                        Relationship
                      </h4>
                      <div className={`text-sm font-semibold space-y-1 ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                        <div>{s.name}</div>
                        <div className={`text-center text-lg ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                          →
                        </div>
                        <div>{t.name}</div>
                      </div>
                    </div>

                    {!isLocked && (
                      <div className="space-y-2">
                        <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          Label
                        </label>
                        <input
                          type="text"
                          value={r.label || ""}
                          onChange={(e) => setRelations((prev) => prev.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))}
                          onBlur={() => pushHistory()}
                          placeholder="FK column name..."
                          className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none border transition-all ${
                            isDarkMode
                              ? "bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500"
                              : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400"
                          }`}
                        />
                      </div>
                    )}

                    {!isLocked && (
                      <div className="space-y-2">
                        <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          Line style
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setRelations((prev) =>
                                prev.map((x) => (x.id === r.id ? { ...x, lineType: "curved" } : x))
                              );
                              pushHistory();
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                              r.lineType === "curved"
                                ? "bg-indigo-600 text-white"
                                : isDarkMode
                                ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            }`}
                          >
                            Curved
                          </button>
                          <button
                            onClick={() => {
                              setRelations((prev) =>
                                prev.map((x) => (x.id === r.id ? { ...x, lineType: "straight" } : x))
                              );
                              pushHistory();
                            }}
                            className={`flex-1 px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                              r.lineType === "straight"
                                ? "bg-indigo-600 text-white"
                                : isDarkMode
                                ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                                : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            }`}
                          >
                            Straight
                          </button>
                        </div>
                      </div>
                    )}

                    {!isLocked && (
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            setRelations((prev) =>
                              prev.map((x) => (x.id === r.id ? { ...x, isDashed: !r.isDashed } : x))
                            );
                            pushHistory();
                          }}
                          className={`w-full px-3 py-2 rounded-lg font-semibold text-xs transition-all ${
                            r.isDashed
                              ? "bg-indigo-600 text-white"
                              : isDarkMode
                              ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                          }`}
                        >
                          {r.isDashed ? "Dashed" : "Solid"}
                        </button>
                      </div>
                    )}

                    {!isLocked && (
                      <button
                        onClick={() => {
                          setRelations((prev) => prev.filter((x) => x.id !== r.id));
                          setSelectedEdgeId(null);
                          pushHistory();
                          push({ title: "Relationship removed", type: "info" });
                        }}
                        className="w-full px-3 py-2 rounded-lg font-semibold text-xs bg-red-600 text-white hover:bg-red-700 transition-all"
                      >
                        Delete Relationship
                      </button>
                    )}
                  </div>
                );
              })()
            ) : (
              <div className={`text-center py-12 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                <p className="text-sm font-semibold">Select a table or relationship to edit</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOASTS */}
      <div className="fixed bottom-6 left-6 space-y-2 pointer-events-none z-40">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg text-sm font-semibold backdrop-blur-xl border pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-300 ${
              t.type === "success"
                ? isDarkMode
                  ? "bg-emerald-900/60 border-emerald-700 text-emerald-200"
                  : "bg-emerald-100 border-emerald-300 text-emerald-800"
                : t.type === "error"
                ? isDarkMode
                  ? "bg-red-900/60 border-red-700 text-red-200"
                  : "bg-red-100 border-red-300 text-red-800"
                : isDarkMode
                ? "bg-slate-900/60 border-slate-700 text-slate-200"
                : "bg-slate-100 border-slate-300 text-slate-800"
            }`}
          >
            <p>{t.title}</p>
            {t.description && <p className="text-xs opacity-75">{t.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** --- APP --- **/
export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedDiagramId, setSelectedDiagramId] = useState<string | null>(null);
  const { diagrams, currentDiagram, setCurrentDiagram, loading: syncLoading, syncing } = useCloudSync(user?.id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="animate-spin">
          <Loader2 size={48} className="text-indigo-500" />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleSave = (updates: any) => {
    if (currentDiagram) {
      setCurrentDiagram({ ...currentDiagram, ...updates });
    }
  };

  const handleSelectDiagram = (diagram: ERDDiagram) => {
    setCurrentDiagram(diagram);
    setSelectedDiagramId(diagram.id);
  };

  const handleCreateDiagram = async () => {
    const newDiagram: ERDDiagram = {
      id: generateId(),
      name: "New Diagram",
      tables: [],
      relations: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      is_dark_mode: true,
      is_locked: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setCurrentDiagram(newDiagram);
    setSelectedDiagramId(newDiagram.id);
  };

  return selectedDiagramId && currentDiagram ? (
    <ERDBuilder
      user={user}
      diagram={currentDiagram}
      onSave={handleSave}
      onBack={() => {
        setSelectedDiagramId(null);
        setCurrentDiagram(null);
      }}
      syncing={syncing}
      onLogout={() => {
        setSelectedDiagramId(null);
        navigate("/auth");
      }}
    />
  ) : (
    <DiagramSelector
      diagrams={diagrams}
      onSelect={handleSelectDiagram}
      onCreate={handleCreateDiagram}
      onLogout={() => navigate("/auth")}
      loading={syncLoading}
    />
  );
}