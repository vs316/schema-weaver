import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
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
  Minimize,
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
  Lock,
  Unlock,
  MessageSquare,
  Zap,
  StickyNote,
  HelpCircle,
  GitCommit,
  Wrench,
  ExternalLink,
} from "lucide-react";

import { CollapsibleSection } from "./components/CollapsibleSection";
import { ResizablePanel } from "./components/ResizablePanel";
import { ColorPicker } from "./components/ColorPicker";
import { useUserRole } from "./hooks/useUserRole";
import { useRealTimeNotifications } from "./hooks/useRealTimeNotifications";
import { RealTimeNotification } from "./components/RealTimeNotification";
import { DiagramTypeSelector } from "./components/DiagramTypeSelector";
import { UMLClassNode } from "./components/UMLClassNode";
import { UMLClassEditor } from "./components/UMLClassEditor";
import { FlowchartNode } from "./components/FlowchartNode";
import { FlowchartToolbox, FlowchartNodeEditor } from "./components/FlowchartToolbox";
import { UMLMarkerDefs, UMLRelationLine } from "./components/UMLRelationLine";
import { ConnectionToolbar } from "./components/ConnectionToolbar";
import type { UMLClass, UMLRelation, UMLRelationType, FlowchartNode as FlowchartNodeType, FlowchartConnection, SequenceParticipant, SequenceMessage } from "./types/uml";
import type { DiagramType } from "./types/uml";

import { generateSampleData, sampleDataToJSON, sampleDataToSQLInsert } from "./utils/sampleDataGenerator";
import { exportUMLDiagram as _exportUMLDiagram, exportFlowchartDiagram as _exportFlowchartDiagram } from "./utils/diagramExport";

import html2canvas from "html2canvas";
import { useCloudSync, type ERDDiagram } from "./hooks/useCloudSync";
import { usePresence } from "./hooks/usePresence";
import { DiagramSelector } from "./components/DiagramSelector";
import { PresenceIndicator, LiveCursor } from "./components/PresenceIndicator";
import { KeyboardShortcutsOverlay } from "./components/KeyboardShortcutsOverlay";
import { Minimap } from "./components/Minimap";
import { SequenceParticipantNode, SequenceMessageArrow, SequenceToolbox, SequenceEditor } from "./components/SequenceDiagram";
import { FlowchartConnectionEditor } from "./components/FlowchartConnectionEditor";
import { WaypointDragHUD } from "./components/WaypointDragHUD";
import { useIsMobile, useIsSmallScreen } from "./hooks/useMediaQuery";
import { useTheme } from "./components/ThemeProvider";
import { QuickActionsToolbar } from "./components/QuickActionsToolbar";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { useTouchGestures } from "./hooks/useTouchGestures";
import type { Json } from "./integrations/supabase/types";
import { supabase } from "./utils/supabase";

/** --- TYPES --- **/
type TableComment = {
  id: string;
  author_id: string;
  author_email: string;
  content: string;
  created_at: string;
};
type Column = { id: string; name: string; type: string; isPk: boolean; isFk: boolean };
type Table = { 
  id: string; 
  name: string; 
  x: number; 
  y: number; 
  columns: Column[]; 
  color?: string;
  description?: string;
  comments?: TableComment[];
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

/** --- SIMPLE TOASTS with throttling --- **/
type Toast = { id: string; title: string; description?: string; type?: "success" | "error" | "info" };
const lastToastTimeRef: Record<string, number> = {};
const TOAST_THROTTLE_MS = 5000; // Only show same toast type every 5 seconds

function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (t: Omit<Toast, "id">) => {
    // Throttle repetitive toasts like "Synced to cloud"
    const toastKey = t.title;
    const now = Date.now();
    if (lastToastTimeRef[toastKey] && now - lastToastTimeRef[toastKey] < TOAST_THROTTLE_MS) {
      // Skip this toast as we just showed one
      return;
    }
    lastToastTimeRef[toastKey] = now;
    
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
  teamId: _teamId,
}: { 
  user: AppUser;
  diagram: ERDDiagram | null;
  onSave: (updates: { 
    tables?: Json; 
    relations?: Json; 
    uml_classes?: Json;
    uml_relations?: Json;
    flowchart_nodes?: Json;
    flowchart_connections?: Json;
    sequence_participants?: Json;
    sequence_messages?: Json;
    viewport?: Json; 
    is_dark_mode?: boolean;
    is_locked?: boolean;
  }) => void;
  onBack: () => void;
  syncing: boolean;
  onLogout: () => void;
  teamId: string | null;
}) {
  // --- STATE ---
  
  const [tables, setTables] = useState<Table[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const { isDarkMode, toggleTheme, setTheme } = useTheme();
  const [lastSaved, setLastSaved] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [_panMode, setPanMode] = useState(false); // Shift+P pan mode (visual cue)

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  // Store initial positions for smooth absolute dragging
  const initialDragPosRef = useRef<{ tableX: number; tableY: number; mouseX: number; mouseY: number } | null>(null);
  const multiDragOffsetsRef = useRef<Map<string, { dx: number; dy: number }>>(new Map());
  const [draggedTableId, setDraggedTableId] = useState<string | null>(null);

  const [multiSelectedTableIds, setMultiSelectedTableIds] = useState<Set<string>>(new Set());

  const [isLassoing, setIsLassoing] = useState(false);
  const [lassoStart, setLassoStart] = useState<{ x: number; y: number } | null>(null);
  const [lassoRect, setLassoRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const [isDraggingEdge, setIsDraggingEdge] = useState(false);
  const [draggedEdgeId, setDraggedEdgeId] = useState<string | null>(null);
  const [edgeDragStart, setEdgeDragStart] = useState<{ x: number; y: number } | null>(null);
  const [edgeDragStartBend, setEdgeDragStartBend] = useState<{ x: number; y: number } | null>(null);

  // Flowchart connection bend/waypoint dragging (single control point)
  const [isDraggingFlowchartBend, setIsDraggingFlowchartBend] = useState(false);
  const [draggedFlowchartConnectionId, setDraggedFlowchartConnectionId] = useState<string | null>(null);
  const [flowchartBendDragStart, setFlowchartBendDragStart] = useState<{ x: number; y: number } | null>(null);
  const [flowchartBendDragStartBend, setFlowchartBendDragStartBend] = useState<{ x: number; y: number } | null>(null);

  // Flowchart multi-waypoint dragging
  const [isDraggingFlowchartWaypoint, setIsDraggingFlowchartWaypoint] = useState(false);
  const [draggedFlowchartWaypoint, setDraggedFlowchartWaypoint] = useState<{ connectionId: string; index: number } | null>(null);
  const [flowchartWaypointDragStart, setFlowchartWaypointDragStart] = useState<{ x: number; y: number } | null>(null);
  const [flowchartWaypointDragStartPos, setFlowchartWaypointDragStartPos] = useState<{ x: number; y: number } | null>(null);

  // Flowchart ghost preview while drawing a connection
  const [flowchartGhostTarget, setFlowchartGhostTarget] = useState<{ x: number; y: number } | null>(null);

  // Waypoint HUD state for showing coordinates while dragging
  const [waypointHUDState, setWaypointHUDState] = useState<{
    visible: boolean;
    screenPos: { x: number; y: number };
    worldPos: { x: number; y: number };
    isSnapped: boolean;
    isAvoiding: boolean;
  }>({ visible: false, screenPos: { x: 0, y: 0 }, worldPos: { x: 0, y: 0 }, isSnapped: false, isAvoiding: false });

  // Responsive hooks
  const isMobile = useIsMobile();
  const isSmallScreen = useIsSmallScreen();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Touch gesture support for pinch-to-zoom and two-finger pan
  useTouchGestures(canvasRef, {
    onPinchZoom: useCallback((scale: number, centerX: number, centerY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const newZoom = clamp(viewport.zoom * scale, 0.2, 3);
      const zoomDelta = newZoom - viewport.zoom;
      
      // Adjust position to zoom towards the pinch center
      const x = centerX - rect.left;
      const y = centerY - rect.top;
      
      setViewport(prev => ({
        x: prev.x - x * (zoomDelta / prev.zoom),
        y: prev.y - y * (zoomDelta / prev.zoom),
        zoom: newZoom,
      }));
    }, [viewport.zoom]),
    onPan: useCallback((deltaX: number, deltaY: number) => {
      setViewport(prev => ({
        ...prev,
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
    }, []),
    enabled: isMobile || isSmallScreen,
  });

  const normalizeViewport = useCallback((raw: any) => {
    const x = Number(raw?.x);
    const y = Number(raw?.y);
    const z = Number(raw?.zoom);
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
      zoom: Number.isFinite(z) && z > 0 ? z : 1,
    };
  }, []);

  const getCanvasCenterWorld = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 120, y: 120 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return toWorld(cx, cy);
  }, [viewport.x, viewport.y, viewport.zoom]);

  const toWorld = (clientX: number, clientY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (clientY - rect.top - viewport.y) / viewport.zoom;
    return { x, y };
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [connectTableSearch, setConnectTableSearch] = useState<string>("");
  // showCommandTips state removed - using keyboard shortcuts overlay instead

  // --- PRESENCE (Real-time collaboration) ---
  const { users: presenceUsers, isConnected: presenceConnected, updateCursor } = usePresence(
    diagram?.id ?? null,
    user.id,
    user.user_metadata?.display_name || user.name || user.email || undefined
  );

  const [isGridSnap, setIsGridSnap] = useState<boolean>(true);

  // --- TOASTS ---
  const { toasts, push } = useToasts();

  // --- HISTORY (UNDO/REDO) - Unified for all diagram types ---
  type Snapshot = { 
    tables: Table[]; 
    relations: Relation[]; 
    umlClasses: UMLClass[];
    umlRelations: UMLRelation[];
    flowchartNodes: FlowchartNodeType[];
    flowchartConnections: FlowchartConnection[];
    viewport: { x: number; y: number; zoom: number };
    diagramType: DiagramType;
  };
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const suppressHistory = useRef<boolean>(false);
  const lastActionWasDrag = useRef<boolean>(false);
  const historyRef = useRef<Snapshot[]>([]);
  const historyIndexRef = useRef<number>(-1);
// Feature 1: Lock/Unlock diagram
const [isLocked, setIsLocked] = useState((diagram as any)?.is_locked ?? false);

// Feature 4: Comments - stored directly in table.comments array (synced to cloud)
const [newCommentText, setNewCommentText] = useState("");

// Feature 5: Sample Data
const [sampleDataShown, setSampleDataShown] = useState(false);
const [sampleData, setSampleData] = useState<any[]>([]);

// Feature 6: Keyboard shortcuts overlay
const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

// Feature 7: Fullscreen mode  
const [isFullscreen, setIsFullscreen] = useState(false);

// Feature 8: Real-time notifications & user role (using hooks)
const userRole = useUserRole(_teamId);
const { notifications, dismiss: dismissNotification, dismissAll: dismissAllNotifications } = useRealTimeNotifications(_teamId, user.id, diagram?.id ?? null);

// Feature 9: Collapsible minimap and resizable sidebar
const [isMinimapCollapsed, setIsMinimapCollapsed] = useState(false);

// Feature 10: Sidebar as popup modal
const [_isSidebarPopup, _setIsSidebarPopup] = useState(false);

// Feature 11: Multi-diagram type support (ERD, UML Class, Flowchart)
const [diagramType, setDiagramType] = useState<DiagramType>('erd');
// UML Class Diagram state
const [umlClasses, setUmlClasses] = useState<UMLClass[]>([]);
const [umlRelations, setUmlRelations] = useState<UMLRelation[]>([]);
const [selectedUmlClassId, setSelectedUmlClassId] = useState<string | null>(null);
const [selectedUmlRelationId, setSelectedUmlRelationId] = useState<string | null>(null);
const [isDrawingUmlRelation, setIsDrawingUmlRelation] = useState(false);
const [umlRelationSource, setUmlRelationSource] = useState<string | null>(null);
const [pendingUmlRelationType, setPendingUmlRelationType] = useState<UMLRelationType>('association');

// Flowchart state  
const [flowchartNodes, setFlowchartNodes] = useState<FlowchartNodeType[]>([]);
const [flowchartConnections, setFlowchartConnections] = useState<FlowchartConnection[]>([]);
const [selectedFlowchartNodeId, setSelectedFlowchartNodeId] = useState<string | null>(null);
const [selectedFlowchartConnectionId, setSelectedFlowchartConnectionId] = useState<string | null>(null);

  // Flowchart connection drawing state
const [isDrawingConnection, setIsDrawingConnection] = useState(false);
const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [pendingFlowchartConnectionType, setPendingFlowchartConnectionType] = useState<
    import("./types/uml").FlowchartConnectionType
  >("arrow");

// Sequence Diagram state
const [sequenceParticipants, setSequenceParticipants] = useState<SequenceParticipant[]>([]);
const [sequenceMessages, setSequenceMessages] = useState<SequenceMessage[]>([]);
const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
// Keep setSequenceMessages available for future message addition UI
void setSequenceMessages;

// Auto-lock for readers/viewers - they cannot unlock
const effectiveIsLocked = isLocked || userRole.isReaderOrViewer;

  // Keep refs in sync with state
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
      umlClasses: JSON.parse(JSON.stringify(umlClasses)),
      umlRelations: JSON.parse(JSON.stringify(umlRelations)),
      flowchartNodes: JSON.parse(JSON.stringify(flowchartNodes)),
      flowchartConnections: JSON.parse(JSON.stringify(flowchartConnections)),
      viewport: { ...viewport },
      diagramType,
    };
    
    setHistory((prev) => {
      const next = prev.slice(0, historyIndexRef.current + 1);
      return [...next, snapshot];
    });
    setHistoryIndex((idx) => idx + 1);
  }, [tables, relations, umlClasses, umlRelations, flowchartNodes, flowchartConnections, viewport, diagramType]);

  // Feature 4: Comments - stored directly in table.comments array (synced to cloud)
  // Get comments for the selected table
  const selectedTableComments = useMemo(() => {
    if (!selectedTableId) return [];
    const table = tables.find(t => t.id === selectedTableId);
    return table?.comments || [];
  }, [selectedTableId, tables]);

  // Add comment to the selected table
  const handleAddComment = useCallback((content: string) => {
    if (!selectedTableId || !content.trim() || isLocked) return;
    
    const newComment: TableComment = {
      id: generateId(),
      author_id: user.id,
      author_email: user.email || 'Unknown',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    
    setTables(prev => prev.map(t => 
      t.id === selectedTableId
        ? { ...t, comments: [...(t.comments || []), newComment] }
        : t
    ));
  }, [selectedTableId, user.id, user.email, isLocked]);

  // Delete comment from the selected table
  const handleDeleteComment = useCallback((commentId: string) => {
    if (!selectedTableId || isLocked) return;
    
    setTables(prev => prev.map(t => 
      t.id === selectedTableId
        ? { ...t, comments: (t.comments || []).filter(c => c.id !== commentId) }
        : t
    ));
  }, [selectedTableId, isLocked]);

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
      // Restore all diagram types
      setTables([...snap.tables]);
      setRelations([...snap.relations]);
      setUmlClasses([...(snap.umlClasses || [])]);
      setUmlRelations([...(snap.umlRelations || [])]);
      setFlowchartNodes([...(snap.flowchartNodes || [])]);
      setFlowchartConnections([...(snap.flowchartConnections || [])]);
      setViewport({ ...snap.viewport });
      if (snap.diagramType) setDiagramType(snap.diagramType);
      
      setSelectedTableId(null);
      setSelectedEdgeId(null);
      setSelectedUmlClassId(null);
      setSelectedFlowchartNodeId(null);
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
      // Restore all diagram types
      setTables([...snap.tables]);
      setRelations([...snap.relations]);
      setUmlClasses([...(snap.umlClasses || [])]);
      setUmlRelations([...(snap.umlRelations || [])]);
      setFlowchartNodes([...(snap.flowchartNodes || [])]);
      setFlowchartConnections([...(snap.flowchartConnections || [])]);
      setViewport({ ...snap.viewport });
      if (snap.diagramType) setDiagramType(snap.diagramType);
      
      setSelectedTableId(null);
      setSelectedEdgeId(null);
      setSelectedUmlClassId(null);
      setSelectedFlowchartNodeId(null);
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
  const lastLocalSaveRef = useRef<string | null>(null); // Track when we last saved locally

  // Load diagram from cloud on mount
  useEffect(() => {
    if (diagram && isInitialLoad.current) {
      isInitialLoad.current = false;
      try {
        const loadedTables = (diagram.tables as Table[]) || [];
        const loadedRelations = (diagram.relations as Relation[]) || [];
        const loadedViewport = normalizeViewport(diagram.viewport);
        
        // Load ERD data
        setTables(loadedTables);
        setRelations(loadedRelations);
        setViewport(loadedViewport);
        // Ensure global theme is applied consistently (diagram should follow global theme)
        if (typeof diagram.is_dark_mode === 'boolean') {
          setTheme(diagram.is_dark_mode ? 'dark' : 'light');
        }
        setIsLocked(diagram.is_locked ?? false);
        
        // Load diagram type and set the correct view
        const loadedDiagramType = (diagram.diagram_type as DiagramType) || 'erd';
        setDiagramType(loadedDiagramType);
        
        // Load UML data
        const loadedUmlClasses = ((diagram.uml_classes as unknown as UMLClass[]) || []).map((c) => {
          const x = Number((c as any).x);
          const y = Number((c as any).y);
          if (Number.isFinite(x) && Number.isFinite(y)) return c;
          const center = getCanvasCenterWorld();
          return { ...c, x: center.x, y: center.y };
        });
        const loadedUmlRelations = (diagram.uml_relations as unknown as UMLRelation[]) || [];
        setUmlClasses(loadedUmlClasses);
        setUmlRelations(loadedUmlRelations);
        
        // Load Flowchart data
        const loadedFlowchartNodes = ((diagram.flowchart_nodes as unknown as FlowchartNodeType[]) || []).map((n) => {
          const x = Number((n as any).x);
          const y = Number((n as any).y);
          if (Number.isFinite(x) && Number.isFinite(y)) return n;
          const center = getCanvasCenterWorld();
          return { ...n, x: center.x, y: center.y };
        });
        const loadedFlowchartConnections = (diagram.flowchart_connections as unknown as FlowchartConnection[]) || [];
        setFlowchartNodes(loadedFlowchartNodes);
        setFlowchartConnections(loadedFlowchartConnections);
        
        // Load Sequence diagram data
        const loadedSequenceParticipants = ((diagram.sequence_participants as unknown as SequenceParticipant[]) || []).map((p, idx) => {
          const x = Number((p as any).x);
          if (Number.isFinite(x)) return p;
          const center = getCanvasCenterWorld();
          return { ...p, x: center.x + idx * 150 };
        });
        const loadedSequenceMessages = (diagram.sequence_messages as unknown as SequenceMessage[]) || [];
        setSequenceParticipants(loadedSequenceParticipants);
        setSequenceMessages(loadedSequenceMessages);
        
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
            setTheme((dark ?? true) ? "dark" : "light");
            setLastSaved(time || "Never");
          } catch (e) {
            console.error("Failed to load data from localStorage", e);
          }
        }
      }
    }
  }, [diagram, normalizeViewport, getCanvasCenterWorld, setTheme]);

  // Listen for remote changes after initial load
  useEffect(() => {
    if (isInitialLoad.current || !diagram) return;
    
    // Only apply remote changes if we haven't saved in the last 2 seconds
    // This prevents overwriting local edits with our own saves echoed back
    const now = Date.now();
    const lastSaveTime = lastLocalSaveRef.current ? parseInt(lastLocalSaveRef.current) : 0;
    if (now - lastSaveTime < 2500) return;

    // Detect if this is a remote change (diagram data updated from server)
    const remoteTables = (diagram.tables as Table[]) || [];
    const remoteRelations = (diagram.relations as Relation[]) || [];
    
    // Check if data is different
    const currentTablesJson = JSON.stringify(tables);
    const remoteTablesJson = JSON.stringify(remoteTables);
    const currentRelationsJson = JSON.stringify(relations);
    const remoteRelationsJson = JSON.stringify(remoteRelations);
    
    if (currentTablesJson !== remoteTablesJson || currentRelationsJson !== remoteRelationsJson) {
      // Apply remote changes
      suppressHistory.current = true;
      setTables(remoteTables);
      setRelations(remoteRelations);
      setTheme((diagram.is_dark_mode ?? true) ? "dark" : "light");
      setIsLocked(diagram.is_locked ?? false);
      suppressHistory.current = false;
      
      push({ title: "Remote changes applied", description: "Another user made changes", type: "info" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram?.updated_at]);

  // Push initial snapshot once loaded
  useEffect(() => {
    if (!isInitialLoad.current && historyIndex === -1) {
      pushHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoad.current]);

  // Auto-save to cloud and localStorage - includes all diagram types
  useEffect(() => {
    if (isInitialLoad.current) return;
    
    // Check if there's any content to save based on diagram type
    const hasERDContent = tables.length > 0 || relations.length > 0;
    const hasUMLContent = umlClasses.length > 0 || umlRelations.length > 0;
    const hasFlowchartContent = flowchartNodes.length > 0 || flowchartConnections.length > 0;
    const hasSequenceContent = sequenceParticipants.length > 0 || sequenceMessages.length > 0;
    
    if (!hasERDContent && !hasUMLContent && !hasFlowchartContent && !hasSequenceContent) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      setIsSaving(true);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      
      // Track when we saved locally to avoid re-applying our own changes
      lastLocalSaveRef.current = Date.now().toString();
      
      // Save to localStorage as backup (ERD data only for backward compatibility)
      localStorage.setItem(
        "erd-data",
        JSON.stringify({
          t: tables,
          r: relations,
          dark: isDarkMode,
          time: now,
        })
      );

      // Save ALL diagram type data to cloud
      const safeViewport = normalizeViewport(viewport);
      const safeUmlClasses = umlClasses.map((c) => ({
        ...c,
        x: Number.isFinite(Number((c as any).x)) ? Number((c as any).x) : safeViewport.x,
        y: Number.isFinite(Number((c as any).y)) ? Number((c as any).y) : safeViewport.y,
      }));
      const safeFlowchartNodes = flowchartNodes.map((n) => ({
        ...n,
        x: Number.isFinite(Number((n as any).x)) ? Number((n as any).x) : safeViewport.x,
        y: Number.isFinite(Number((n as any).y)) ? Number((n as any).y) : safeViewport.y,
      }));
      const safeSequenceParticipants = sequenceParticipants.map((p, idx) => ({
        ...p,
        x: Number.isFinite(Number((p as any).x)) ? Number((p as any).x) : safeViewport.x + idx * 150,
      }));

      onSave({
        tables: tables as Json,
        relations: relations as Json,
        uml_classes: safeUmlClasses as unknown as Json,
        uml_relations: umlRelations as unknown as Json,
        flowchart_nodes: safeFlowchartNodes as unknown as Json,
        flowchart_connections: flowchartConnections as unknown as Json,
        sequence_participants: safeSequenceParticipants as unknown as Json,
        sequence_messages: sequenceMessages as unknown as Json,
        viewport: safeViewport as unknown as Json,
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
  }, [tables, relations, umlClasses, umlRelations, flowchartNodes, flowchartConnections, sequenceParticipants, sequenceMessages, isDarkMode, viewport]);

  // Push history on non-drag meaningful changes
  useEffect(() => {
    if (isDragging || isDraggingEdge || suppressHistory.current || isInitialLoad.current) return;
    pushHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableId, selectedEdgeId, isDarkMode]);

  const handleWheel = (e: React.WheelEvent) => {
    // Ctrl/Cmd + scroll = zoom towards mouse position
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSpeed = 0.002;
      const minZoom = 0.2;
      const maxZoom = 3;
      const delta = -e.deltaY * zoomSpeed;
      const newZoom = clamp(viewport.zoom + delta, minZoom, maxZoom);
      
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const zoomRatio = newZoom / viewport.zoom;
        const newX = mouseX - (mouseX - viewport.x) * zoomRatio;
        const newY = mouseY - (mouseY - viewport.y) * zoomRatio;
        setViewport({ x: newX, y: newY, zoom: newZoom });
      }
      return;
    }
    
    // Two-finger trackpad scroll = pan (no modifier key)
    // This works because trackpads report deltaX and deltaY for two-finger gestures
    setViewport((prev) => ({
      ...prev,
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY,
    }));
  };
  
  // Zoom in/out functions for keyboard shortcuts
  const zoomIn = useCallback(() => {
    const newZoom = clamp(viewport.zoom * 1.2, 0.2, 3);
    setViewport((prev) => ({ ...prev, zoom: newZoom }));
    push({ title: "Zoomed in", description: `${Math.round(newZoom * 100)}%`, type: "info" });
  }, [viewport.zoom, push]);
  
  const zoomOut = useCallback(() => {
    const newZoom = clamp(viewport.zoom / 1.2, 0.2, 3);
    setViewport((prev) => ({ ...prev, zoom: newZoom }));
    push({ title: "Zoomed out", description: `${Math.round(newZoom * 100)}%`, type: "info" });
  }, [viewport.zoom, push]);

  const resetViewport = useCallback(() => {
    setViewport({ x: 0, y: 0, zoom: 0.5 });
    push({ title: "Viewport reset", type: "info" });
    pushHistory();
  }, [pushHistory, push]);

  // Fit to Content - calculate bounds of all elements and center viewport
  const fitToContent = useCallback(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasContent = false;

    // Check based on diagram type
    if (diagramType === 'erd') {
      for (const t of tables) {
        hasContent = true;
        const tableHeight = HEADER_H + 20 + (t.columns?.length ?? 0) * 16;
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x + TABLE_W);
        maxY = Math.max(maxY, t.y + tableHeight);
      }
    } else if (diagramType === 'uml-class') {
      for (const c of umlClasses) {
        hasContent = true;
        const classHeight = 80 + (c.attributes?.length ?? 0) * 16 + (c.methods?.length ?? 0) * 16;
        minX = Math.min(minX, c.x);
        minY = Math.min(minY, c.y);
        maxX = Math.max(maxX, c.x + 180);
        maxY = Math.max(maxY, c.y + classHeight);
      }
    } else if (diagramType === 'flowchart') {
      for (const n of flowchartNodes) {
        hasContent = true;
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + 120);
        maxY = Math.max(maxY, n.y + 60);
      }
    } else if (diagramType === 'sequence') {
      for (const p of sequenceParticipants) {
        hasContent = true;
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, 50); // Participants are at fixed Y
        maxX = Math.max(maxX, p.x + 100);
        maxY = Math.max(maxY, 200 + sequenceMessages.length * 50);
      }
    }

    if (!hasContent) {
      resetViewport();
      return;
    }

    // Add padding
    const padding = 100;
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    // Calculate zoom to fit
    const canvasWidth = canvasRef.current?.clientWidth ?? 1000;
    const canvasHeight = canvasRef.current?.clientHeight ?? 800;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const zoomX = canvasWidth / contentWidth;
    const zoomY = canvasHeight / contentHeight;
    const zoom = Math.min(zoomX, zoomY, 1.5); // Max zoom of 1.5

    // Center the content
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newX = canvasWidth / 2 - centerX * zoom;
    const newY = canvasHeight / 2 - centerY * zoom;

    setViewport({ x: newX, y: newY, zoom: Math.max(0.2, zoom) });
    push({ title: "Fit to content", type: "info" });
  }, [diagramType, tables, umlClasses, flowchartNodes, sequenceParticipants, sequenceMessages.length, resetViewport, push]);

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
    // Check if locked (including reader auto-lock) - still allow selection but not dragging
    if (effectiveIsLocked) {
      // Allow selection in locked mode for analysis
      if (!e.shiftKey) {
        setMultiSelectedTableIds(new Set());
        setSelectedTableId(tableId);
      } else {
        setMultiSelectedTableIds((prev) => {
          const next = new Set(prev);
          if (next.has(tableId)) next.delete(tableId);
          else next.add(tableId);
          return next;
        });
        setSelectedTableId(tableId);
      }
      setSelectedEdgeId(null);
      return; // Don't allow dragging
    }
    if (e.button !== 0) return;
    e.stopPropagation();

    const table = tables.find((t) => t.id === tableId);
    if (!table || !canvasRef.current) return;

    const currentMultiSelected = e.shiftKey ? multiSelectedTableIds : new Set<string>();
    
    if (!e.shiftKey) {
      setMultiSelectedTableIds(new Set());
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
    
    // Store initial positions for absolute positioning (prevents jitter)
    initialDragPosRef.current = {
      tableX: table.x,
      tableY: table.y,
      mouseX: world.x,
      mouseY: world.y,
    };
    
    // Store offsets for multi-select
    const selectedIds = currentMultiSelected.size > 0 ? currentMultiSelected : new Set([tableId]);
    multiDragOffsetsRef.current.clear();
    tables.forEach(t => {
      if (selectedIds.has(t.id) || t.id === tableId) {
        multiDragOffsetsRef.current.set(t.id, {
          dx: t.x - table.x,
          dy: t.y - table.y,
        });
      }
    });

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
    // Right-click (button 2) OR middle-click (button 1) for panning
    if (e.button === 2 || e.button === 1) {
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

        // Clear all selections based on diagram type
        setSelectedEdgeId(null);
        if (!e.shiftKey) {
          setSelectedTableId(null);
          setMultiSelectedTableIds(new Set());
          // Clear non-ERD selections
          setSelectedUmlClassId(null);
          setSelectedUmlRelationId(null);
          setSelectedFlowchartNodeId(null);
          setSelectedFlowchartConnectionId(null);
          setSelectedParticipantId(null);
          setSelectedMessageId(null);
        }
        
        // Cancel any in-progress connection drawing
        setIsDrawingUmlRelation(false);
        setUmlRelationSource(null);
        setIsDrawingConnection(false);
        setConnectionSource(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update live cursor position for presence
    const worldPos = toWorld(e.clientX, e.clientY);
    updateCursor(worldPos.x, worldPos.y);

    // Flowchart ghost preview
    if (diagramType === 'flowchart' && isDrawingConnection && connectionSource) {
      setFlowchartGhostTarget(worldPos);
    }

  // TABLE/UML/FLOWCHART DRAG - Using absolute positioning for smooth movement
  if (isDragging && draggedTableId && !isPanning && initialDragPosRef.current) {
    const world = toWorld(e.clientX, e.clientY);
    const { tableX, tableY, mouseX, mouseY } = initialDragPosRef.current;
    
    // Calculate delta from initial mouse position (absolute, not cumulative)
    let newX = tableX + (world.x - mouseX);
    let newY = tableY + (world.y - mouseY);

    if (isGridSnap) {
      newX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
      newY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
    }

    // Handle different diagram types
    if (diagramType === 'uml-class') {
      setUmlClasses((prev) =>
        prev.map((c) => c.id === draggedTableId ? { ...c, x: newX, y: newY } : c)
      );
    } else if (diagramType === 'flowchart') {
      setFlowchartNodes((prev) =>
        prev.map((n) => n.id === draggedTableId ? { ...n, x: newX, y: newY } : n)
      );
    } else if (diagramType === 'sequence') {
      // Sequence participants only move horizontally
      setSequenceParticipants((prev) =>
        prev.map((p) => p.id === draggedTableId ? { ...p, x: newX } : p)
      );
    } else {
      // ERD mode - Apply to all selected tables using their stored offsets
      setTables((prev) =>
        prev.map((t) => {
          const offset = multiDragOffsetsRef.current.get(t.id);
          if (!offset && t.id !== draggedTableId) return t;
          
          if (t.id === draggedTableId) {
            return { ...t, x: newX, y: newY };
          }
          
          return { 
            ...t, 
            x: newX + offset!.dx, 
            y: newY + offset!.dy,
          };
        })
      );
    }
    return;
  }

  // EDGE BEND - Second priority
  if (isDraggingEdge && draggedEdgeId && edgeDragStart && edgeDragStartBend && !isPanning) {
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

  // FLOWCHART CONNECTION BEND - Second priority (alongside ERD edge bends)
  if (
    isDraggingFlowchartBend &&
    draggedFlowchartConnectionId &&
    flowchartBendDragStart &&
    flowchartBendDragStartBend &&
    !isPanning
  ) {
    const world = toWorld(e.clientX, e.clientY);
    const dx = world.x - flowchartBendDragStart.x;
    const dy = world.y - flowchartBendDragStart.y;

    let nextBend = {
      x: flowchartBendDragStartBend.x + dx,
      y: flowchartBendDragStartBend.y + dy,
    };
    if (isGridSnap) {
      nextBend = {
        x: Math.round(nextBend.x / GRID_SIZE) * GRID_SIZE,
        y: Math.round(nextBend.y / GRID_SIZE) * GRID_SIZE,
      };
    }

    // soft repel from node bounding boxes
    const repelFromNodes = (p: { x: number; y: number }) => {
      const padding = 18;
      const strength = 0.65;
      let out = { ...p };
      for (const n of flowchartNodes) {
        const left = n.x - padding;
        const top = n.y - padding;
        const right = n.x + 120 + padding;
        const bottom = n.y + 60 + padding;
        const inside = out.x >= left && out.x <= right && out.y >= top && out.y <= bottom;
        if (!inside) continue;

        const dl = Math.abs(out.x - left);
        const dr = Math.abs(right - out.x);
        const dt = Math.abs(out.y - top);
        const db = Math.abs(bottom - out.y);
        const min = Math.min(dl, dr, dt, db);

        if (min === dl) out.x = out.x + (left - out.x) * (1 - strength);
        else if (min === dr) out.x = out.x + (right - out.x) * (1 - strength);
        else if (min === dt) out.y = out.y + (top - out.y) * (1 - strength);
        else out.y = out.y + (bottom - out.y) * (1 - strength);
      }
      return out;
    };
    nextBend = repelFromNodes(nextBend);

    setFlowchartConnections((prev) =>
      prev.map((c) =>
        c.id === draggedFlowchartConnectionId
          ? {
              ...c,
              bend: nextBend,
              // dragging implies a curved route
              lineType: c.connectionType === 'loop-back' ? c.lineType : 'curved',
            }
          : c
      )
    );

    lastActionWasDrag.current = true;
    return;
  }

  // FLOWCHART WAYPOINT DRAG
  if (
    isDraggingFlowchartWaypoint &&
    draggedFlowchartWaypoint &&
    flowchartWaypointDragStart &&
    flowchartWaypointDragStartPos &&
    !isPanning
  ) {
    const world = toWorld(e.clientX, e.clientY);
    const dx = world.x - flowchartWaypointDragStart.x;
    const dy = world.y - flowchartWaypointDragStart.y;

    let nextPoint = {
      x: flowchartWaypointDragStartPos.x + dx,
      y: flowchartWaypointDragStartPos.y + dy,
    };
    if (isGridSnap) {
      nextPoint = {
        x: Math.round(nextPoint.x / GRID_SIZE) * GRID_SIZE,
        y: Math.round(nextPoint.y / GRID_SIZE) * GRID_SIZE,
      };
    }

    // soft repel from node bounding boxes
    const repelFromNodes = (p: { x: number; y: number }) => {
      const padding = 18;
      const strength = 0.65;
      let out = { ...p };
      for (const n of flowchartNodes) {
        // expanded bbox
        const left = n.x - padding;
        const top = n.y - padding;
        const right = n.x + 120 + padding;
        const bottom = n.y + 60 + padding;
        const inside = out.x >= left && out.x <= right && out.y >= top && out.y <= bottom;
        if (!inside) continue;

        // push toward nearest edge
        const dl = Math.abs(out.x - left);
        const dr = Math.abs(right - out.x);
        const dt = Math.abs(out.y - top);
        const db = Math.abs(bottom - out.y);
        const min = Math.min(dl, dr, dt, db);

        if (min === dl) out.x = out.x + (left - out.x) * (1 - strength);
        else if (min === dr) out.x = out.x + (right - out.x) * (1 - strength);
        else if (min === dt) out.y = out.y + (top - out.y) * (1 - strength);
        else out.y = out.y + (bottom - out.y) * (1 - strength);
      }
      return out;
    };

    const originalPoint = { ...nextPoint };
    nextPoint = repelFromNodes(nextPoint);
    const wasSnapped = isGridSnap && (Math.round(originalPoint.x / GRID_SIZE) * GRID_SIZE === originalPoint.x);
    const wasAvoiding = originalPoint.x !== nextPoint.x || originalPoint.y !== nextPoint.y;

    // Update HUD state
    setWaypointHUDState({
      visible: true,
      screenPos: { x: e.clientX, y: e.clientY },
      worldPos: nextPoint,
      isSnapped: wasSnapped,
      isAvoiding: wasAvoiding,
    });

    setFlowchartConnections((prev) =>
      prev.map((c) => {
        if (c.id !== draggedFlowchartWaypoint.connectionId) return c;
        const wps = [...(c.waypoints ?? [])];
        if (!wps[draggedFlowchartWaypoint.index]) return c;
        wps[draggedFlowchartWaypoint.index] = nextPoint;
        return { ...c, waypoints: wps };
      })
    );

    lastActionWasDrag.current = true;
    return;
  }

  // Hide waypoint HUD when not dragging
  if (waypointHUDState.visible && !isDraggingFlowchartWaypoint) {
    setWaypointHUDState(prev => ({ ...prev, visible: false }));
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
    
    // Select elements based on current diagram type
    if (diagramType === 'uml-class') {
      // UML Classes
      for (const c of umlClasses) {
        const cLeft = c.x;
        const cTop = c.y;
        const cRight = c.x + 180;
        const cBottom = c.y + 80 + c.attributes.length * 16 + c.methods.length * 16;

        // Check if element intersects with lasso rect
        const intersects = !(cRight < x || cLeft > rectRight || cBottom < y || cTop > rectBottom);
        
        // Use intersection for more intuitive selection
        if (intersects) hits.add(c.id);
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
      setSelectedUmlClassId(first ?? null);
      
    } else if (diagramType === 'flowchart') {
      // Flowchart Nodes
      for (const n of flowchartNodes) {
        const nLeft = n.x;
        const nTop = n.y;
        const nRight = n.x + 120;
        const nBottom = n.y + 60;

        const intersects = !(nRight < x || nLeft > rectRight || nBottom < y || nTop > rectBottom);
        
        if (intersects) hits.add(n.id);
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
      setSelectedFlowchartNodeId(first ?? null);
      
    } else {
      // ERD Tables
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
    }
    
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

    if (isDraggingFlowchartBend) {
      setIsDraggingFlowchartBend(false);
      setDraggedFlowchartConnectionId(null);
      setFlowchartBendDragStart(null);
      setFlowchartBendDragStartBend(null);
    }

    if (isDraggingFlowchartWaypoint) {
      setIsDraggingFlowchartWaypoint(false);
      setDraggedFlowchartWaypoint(null);
      setFlowchartWaypointDragStart(null);
      setFlowchartWaypointDragStartPos(null);
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

  const addFlowchartNode = useCallback((type: import('./types/uml').FlowchartNodeType) => {
    if (effectiveIsLocked) {
      push({ title: 'Diagram is locked', type: 'info' });
      return;
    }
    const center = getCanvasCenterWorld();
    const nodeType = type;
    const newNode: FlowchartNodeType = {
      id: generateId(),
      type: nodeType,
      label: nodeType === 'start-end' ? 'Start' : nodeType === 'decision' ? 'Condition?' : 'Process',
      x: center.x,
      y: center.y,
    };
    setFlowchartNodes((prev) => [...prev, newNode]);
    setSelectedFlowchartNodeId(newNode.id);
    setSelectedFlowchartConnectionId(null);
    push({ title: 'Node added', type: 'success' });
  }, [effectiveIsLocked, getCanvasCenterWorld, push]);

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
    // Push history BEFORE the change so undo works correctly
    pushHistory();
    
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
      push({ title: "Exporting PNG...", type: "info" });
      
      // Calculate the true bounds of all tables to get full diagram extent
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const t of tables) {
        const tableHeight = HEADER_H + 20 + t.columns.length * 16;
        minX = Math.min(minX, t.x);
        minY = Math.min(minY, t.y);
        maxX = Math.max(maxX, t.x + TABLE_W);
        maxY = Math.max(maxY, t.y + tableHeight);
      }

      // Handle empty diagram
      if (tables.length === 0) {
        minX = 0;
        minY = 0;
        maxX = 800;
        maxY = 600;
      }

      // Add generous padding
      const padding = 80;
      const diagramWidth = maxX - minX + padding * 2;
      const diagramHeight = maxY - minY + padding * 2;
      
      // Create a temporary container to clone the canvas without transforms
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      tempContainer.style.backgroundColor = isDarkMode ? "#0f172a" : "#f8fafc";
      tempContainer.style.width = `${diagramWidth}px`;
      tempContainer.style.height = `${diagramHeight}px`;
      tempContainer.style.overflow = "hidden";
      
      document.body.appendChild(tempContainer);

      // Render all tables and relations directly without viewport transforms
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", diagramWidth.toString());
      svg.setAttribute("height", diagramHeight.toString());
      svg.setAttribute("viewBox", `0 0 ${diagramWidth} ${diagramHeight}`);
      svg.style.background = isDarkMode ? "#0f172a" : "#f8fafc";

      // Draw relations (clean lines, no debug artifacts)
      for (const r of relations) {
        const a = getAnchors(r);
        if (!a) continue;

        const { sx, sy, tx, ty, cx, cy } = a;
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        
        // Calculate proper offset values
        const offsetSx = sx - minX + padding;
        const offsetSy = sy - minY + padding;
        const offsetTx = tx - minX + padding;
        const offsetTy = ty - minY + padding;
        const offsetCx = cx - minX + padding;
        const offsetCy = cy - minY + padding;
        
        const pathData = r.lineType === "straight" 
          ? `M ${offsetSx} ${offsetSy} L ${offsetCx} ${offsetCy} L ${offsetTx} ${offsetTy}`
          : `M ${offsetSx} ${offsetSy} Q ${offsetCx} ${offsetCy} ${offsetTx} ${offsetTy}`;
        
        path.setAttribute("d", pathData);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", isDarkMode ? "#6366f1" : "#4f46e5");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        if (r.isDashed) path.setAttribute("stroke-dasharray", "8,4");
        svg.appendChild(path);

        // Draw arrow
        const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        const angle = Math.atan2(ty - cy, tx - cx);
        const arrowSize = 10;
        const px = tx - minX + padding - arrowSize * Math.cos(angle);
        const py = ty - minY + padding - arrowSize * Math.sin(angle);
        const p1x = px - arrowSize * Math.cos(angle - Math.PI / 6);
        const p1y = py - arrowSize * Math.sin(angle - Math.PI / 6);
        const p2x = px - arrowSize * Math.cos(angle + Math.PI / 6);
        const p2y = py - arrowSize * Math.sin(angle + Math.PI / 6);
        arrowPath.setAttribute("points", `${tx - minX + padding},${ty - minY + padding} ${p1x},${p1y} ${p2x},${p2y}`);
        arrowPath.setAttribute("fill", isDarkMode ? "#475569" : "#94a3b8");
        svg.appendChild(arrowPath);

        // Draw edge label if exists
        if (r.label) {
          const labelX = (sx + tx) / 2 - minX + padding;
          const labelY = (sy + ty) / 2 - minY + padding - 10;
          const labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          labelText.setAttribute("x", labelX.toString());
          labelText.setAttribute("y", labelY.toString());
          labelText.setAttribute("text-anchor", "middle");
          labelText.setAttribute("fill", isDarkMode ? "#94a3b8" : "#64748b");
          labelText.setAttribute("font-size", "10");
          labelText.textContent = r.label;
          svg.appendChild(labelText);
        }
      }

      // Draw tables with all details
      for (const t of tables) {
        const tableHeight = HEADER_H + 20 + t.columns.length * 16;
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        
        // Clean shadow (subtle, not the debug gray lines)
        const shadow = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        shadow.setAttribute("x", (t.x - minX + padding + 3).toString());
        shadow.setAttribute("y", (t.y - minY + padding + 3).toString());
        shadow.setAttribute("width", TABLE_W.toString());
        shadow.setAttribute("height", tableHeight.toString());
        shadow.setAttribute("fill", isDarkMode ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.08)");
        shadow.setAttribute("rx", "10");
        g.appendChild(shadow);
        
        // Table background
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", (t.x - minX + padding).toString());
        rect.setAttribute("y", (t.y - minY + padding).toString());
        rect.setAttribute("width", TABLE_W.toString());
        rect.setAttribute("height", tableHeight.toString());
        rect.setAttribute("fill", isDarkMode ? "#1e293b" : "#ffffff");
        rect.setAttribute("stroke", t.color || (isDarkMode ? "#64748b" : "#94a3b8"));
        rect.setAttribute("stroke-width", "2");
        rect.setAttribute("rx", "10");
        g.appendChild(rect);

        // Header background with proper clip
        const headerRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        headerRect.setAttribute("x", (t.x - minX + padding + 1).toString());
        headerRect.setAttribute("y", (t.y - minY + padding + 1).toString());
        headerRect.setAttribute("width", (TABLE_W - 2).toString());
        headerRect.setAttribute("height", (HEADER_H - 1).toString());
        headerRect.setAttribute("fill", t.color || (isDarkMode ? "#64748b" : "#6366f1"));
        headerRect.setAttribute("rx", "9");
        g.appendChild(headerRect);
        
        // Header bottom cover (square corners at bottom of header)
        const headerBottom = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        headerBottom.setAttribute("x", (t.x - minX + padding + 1).toString());
        headerBottom.setAttribute("y", (t.y - minY + padding + HEADER_H - 10).toString());
        headerBottom.setAttribute("width", (TABLE_W - 2).toString());
        headerBottom.setAttribute("height", "10");
        headerBottom.setAttribute("fill", t.color || (isDarkMode ? "#64748b" : "#6366f1"));
        g.appendChild(headerBottom);
        
        // Table name text
        const tableName = document.createElementNS("http://www.w3.org/2000/svg", "text");
        tableName.setAttribute("x", (t.x - minX + padding + 12).toString());
        tableName.setAttribute("y", (t.y - minY + padding + 24).toString());
        tableName.setAttribute("fill", "white");
        tableName.setAttribute("font-size", "13");
        tableName.setAttribute("font-weight", "bold");
        tableName.setAttribute("font-family", "system-ui, -apple-system, sans-serif");
        tableName.textContent = t.name;
        g.appendChild(tableName);

        // Draw columns
        t.columns.forEach((col, i) => {
          const colY = t.y - minY + padding + HEADER_H + 16 + i * 16;
          
          // Column text
          const colText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          colText.setAttribute("x", (t.x - minX + padding + 12).toString());
          colText.setAttribute("y", colY.toString());
          colText.setAttribute("fill", isDarkMode ? "#e2e8f0" : "#334155");
          colText.setAttribute("font-size", "11");
          colText.setAttribute("font-family", "ui-monospace, monospace");
          
          // Add key indicators
          let prefix = "";
          if (col.isPk) prefix += "🔑 ";
          if (col.isFk) prefix += "🔗 ";
          colText.textContent = `${prefix}${col.name}`;
          g.appendChild(colText);
          
          // Column type
          const typeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          typeText.setAttribute("x", (t.x - minX + padding + TABLE_W - 12).toString());
          typeText.setAttribute("y", colY.toString());
          typeText.setAttribute("fill", isDarkMode ? "#64748b" : "#94a3b8");
          typeText.setAttribute("font-size", "9");
          typeText.setAttribute("text-anchor", "end");
          typeText.setAttribute("font-family", "ui-monospace, monospace");
          typeText.textContent = col.type;
          g.appendChild(typeText);
        });

        svg.appendChild(g);
      }

      tempContainer.appendChild(svg);

      // Use html2canvas with better config for crisp output
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
      });

      const link = document.createElement("a");
      link.download = `erd-diagram-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
      URL.revokeObjectURL(link.href);
      
      document.body.removeChild(tempContainer);
      
      push({ title: "PNG exported", description: `${Math.round(diagramWidth)}x${Math.round(diagramHeight)}px`, type: "success" });
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

      // If typing in an input/textarea, ignore non-ctrl shortcuts
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
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
        // Don't delete if user is typing in an input or textarea
        const activeElement = document.activeElement;
        if (activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA') {
          return; // Allow normal backspace behavior in inputs
        }
        
        if (effectiveIsLocked) {
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
      } else if (e.key === "=" || e.key === "+") {
        // Zoom in with + or =
        e.preventDefault();
        zoomIn();
      } else if (e.key === "-" || e.key === "_") {
        // Zoom out with -
        e.preventDefault();
        zoomOut();
      } else if (e.shiftKey && e.key.toLowerCase() === "p") {
        // Toggle pan mode with Shift+P
        e.preventDefault();
        setPanMode((prev) => {
          const newState = !prev;
          push({ title: newState ? "Pan mode enabled" : "Pan mode disabled", description: "Right-click drag to pan", type: "info" });
          return newState;
        });
      } else if (e.key === "0" && ctrlOrCmd) {
        // Reset zoom with Ctrl+0
        e.preventDefault();
        resetViewport();
      } else if (e.key === "/" && ctrlOrCmd) {
        // Toggle keyboard shortcuts overlay with Ctrl+/
        e.preventDefault();
        setShowKeyboardShortcuts((prev) => !prev);
      } else if (e.key === "Escape" && showKeyboardShortcuts) {
        // Close keyboard shortcuts overlay with Escape
        e.preventDefault();
        setShowKeyboardShortcuts(false);
      } else if (e.key.toLowerCase() === "n" && !ctrlOrCmd && !e.shiftKey) {
        // Add new table with N key (only if not typing in an input)
        if (!isTyping) {
          e.preventDefault();
          addTable();
        }
      } else if (!ctrlOrCmd && !e.shiftKey && !isTyping && e.key.toLowerCase() === 'f') {
        // Fit to content (Flowchart/UML/Sequence)
        if (diagramType !== 'erd') {
          e.preventDefault();
          fitToContent();
        }
      } else if (!ctrlOrCmd && !e.shiftKey && !isTyping && e.key.toLowerCase() === 'c') {
        // Start/Cancel flowchart connection drawing
        if (diagramType === 'flowchart') {
          e.preventDefault();
          if (effectiveIsLocked) {
            push({ title: 'Diagram is locked', type: 'info' });
            return;
          }
          if (isDrawingConnection) {
            setIsDrawingConnection(false);
            setConnectionSource(null);
            push({ title: 'Connection cancelled', type: 'info' });
            return;
          }
          if (!selectedFlowchartNodeId) {
            push({ title: 'Select a node first', type: 'info' });
            return;
          }
          setIsDrawingConnection(true);
          setConnectionSource(selectedFlowchartNodeId);
          push({ title: 'Click target node', type: 'info' });
        }
      } else if (!ctrlOrCmd && !e.shiftKey && !isTyping && diagramType === 'flowchart') {
        const k = e.key.toLowerCase();
        if (k === 'd') {
          e.preventDefault();
          addFlowchartNode('decision');
        } else if (k === 'p') {
          e.preventDefault();
          addFlowchartNode('process');
        } else if (k === 's') {
          e.preventDefault();
          addFlowchartNode('start-end');
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    selectedTableId,
    selectedEdgeId,
    tables,
    relations,
    isGridSnap,
    undo,
    redo,
    duplicateTable,
    exportJSON,
    exportPNG,
    resetViewport,
    pushHistory,
    push,
    zoomIn,
    zoomOut,
    showKeyboardShortcuts,
    addTable,
    diagramType,
    fitToContent,
    effectiveIsLocked,
    isDrawingConnection,
    selectedFlowchartNodeId,
    addFlowchartNode,
  ]);

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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Database size={24} className="text-indigo-500" />
            <h1 className="text-xl font-bold">
              {diagramType === 'erd' ? 'ERD Builder' : diagramType === 'uml-class' ? 'UML Class' : 'Flowchart'}
            </h1>
          </div>
          <DiagramTypeSelector
            currentType={diagramType}
            onTypeChange={(type) => {
              setDiagramType(type);
              // Clear selections when switching modes
              setSelectedTableId(null);
              setSelectedEdgeId(null);
              setMultiSelectedTableIds(new Set());
            }}
            isDarkMode={isDarkMode}
          />
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
{/* Lock/Unlock Button - disabled for readers/viewers */}
<button
  onClick={() => {
    // Readers/viewers cannot unlock
    if (userRole.isReaderOrViewer) {
      push({ title: "Readers cannot unlock diagrams", type: "info" });
      return;
    }
    const newLockState = !isLocked;
    setIsLocked(newLockState);
    onSave({ is_locked: newLockState } as any);

    push({
      title: `Diagram ${newLockState ? "locked" : "unlocked"}`,
      description: newLockState ? "Ctrl+L to unlock" : "Ctrl+L to lock",
      type: "info"
    });
  }}
  disabled={userRole.isReaderOrViewer && !isLocked}
  title={userRole.isReaderOrViewer 
    ? "Readers cannot modify lock state" 
    : (isLocked ? "Unlock diagram (Ctrl/Cmd+L)" : "Lock diagram (Ctrl/Cmd+L)")}
  className={`p-2 rounded-lg transition-all ${
    effectiveIsLocked
      ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
      : isDarkMode
      ? "hover:bg-slate-800 text-slate-300"
      : "hover:bg-slate-200 text-slate-700"
  } ${userRole.isReaderOrViewer ? "opacity-60 cursor-not-allowed" : ""}`}
>
  {effectiveIsLocked ? <Lock size={16} /> : <Unlock size={16} />}
</button>

{/* Fullscreen Toggle Button */}
<button
  onClick={() => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    push({
      title: isFullscreen ? "Exited fullscreen" : "Entered fullscreen",
      type: "info"
    });
  }}
  title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
  className={`p-2 rounded-lg transition-all ${
    isFullscreen
      ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
      : isDarkMode
      ? "hover:bg-slate-800 text-slate-300"
      : "hover:bg-slate-200 text-slate-700"
  }`}
>
  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
</button>

<span className="mx-2 opacity-30">|</span>

          
          
          {/* Presence Indicator */}
          <PresenceIndicator 
            users={presenceUsers} 
            isConnected={presenceConnected} 
            isDarkMode={isDarkMode} 
          />
          {/* Real-time Notifications */}
          <RealTimeNotification
            notifications={notifications}
            onDismiss={dismissNotification}
            onDismissAll={dismissAllNotifications}
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
        {/* SIDEBAR TOOLBAR - hidden on mobile */}
        <div
          className={`${isMobile ? 'hidden' : 'flex'} w-12 md:w-16 border-r flex-col items-center py-2 md:py-4 space-y-2 md:space-y-3 shadow-sm z-30 transition-colors duration-300 ${
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

          {/* Fit to Content - for non-ERD diagrams */}
          {diagramType !== 'erd' && (
            <button
              onClick={fitToContent}
              title="Fit to Content"
              className="p-2.5 hover:bg-indigo-500/15 rounded-xl text-indigo-400 transition-all duration-200 active:scale-95 hover:scale-110"
            >
              <Minimize size={20} />
            </button>
          )}

          <button
            onClick={() => toggleTheme()}
            title="Toggle Theme"
            className="p-2.5 hover:bg-amber-500/15 rounded-xl text-amber-500 transition-all duration-200 active:scale-95 hover:scale-110"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className={`border-t w-8 my-2 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-slate-300"}`}></div>

          <button onClick={exportJSON} title="Download JSON Backup" className="p-2.5 hover:bg-emerald-500/15 rounded-xl text-emerald-500 transition-all duration-200 active:scale-95 hover:scale-110">
            <Save size={20} />
          </button>

          {/* Import JSON - disabled for readers/viewers */}
          {userRole.canImport ? (
            <label className="p-2.5 hover:bg-blue-500/15 rounded-xl text-blue-500 cursor-pointer transition-all duration-200 active:scale-95 hover:scale-110 inline-block" title="Import Schema">
              <Upload size={20} />
              <input type="file" className="hidden" onChange={importJSON} accept=".json" />
            </label>
          ) : (
            <button 
              className="p-2.5 rounded-xl text-slate-500 opacity-50 cursor-not-allowed" 
              title="Readers cannot import schemas"
              disabled
            >
              <Upload size={20} />
            </button>
          )}

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
            {/* ERD Mode - Tables and Relations */}
            {diagramType === 'erd' && (
              <>
                <svg className="absolute inset-0 pointer-events-none overflow-visible w-[5000px] h-[5000px]">
                  {relations.map((r) => {
                    const path = getPath(r);
                    if (!path) return null;

                    const isSelected = selectedEdgeId === r.id;
                    const connectedEdge = isEdgeConnected(r.id);
                    const showHandle = isSelected;
                    const labelPos = r.label ? getLabelPos(r) : null;
                    
                    // Check if this relation is connected to the selected table for animation
                    const isAnimated = selectedTableId && 
                      (r.sourceTableId === selectedTableId || r.targetTableId === selectedTableId);

                    return (
                      <g key={r.id} className="pointer-events-auto cursor-pointer">
                        <path d={path} fill="none" stroke="transparent" strokeWidth="22" onClick={(e) => handleEdgeClick(e as any, r.id)} />

                        {/* Animated glow effect for connected relations */}
                        {isAnimated && (
                          <path
                            d={path}
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth={6}
                            strokeOpacity={0.3}
                            strokeDasharray={r.isDashed ? "5,5" : "0"}
                            className="animate-pulse"
                          />
                        )}

                        <path
                          d={path}
                          fill="none"
                          stroke={edgeStroke(r)}
                          strokeWidth={edgeWidth(r)}
                          strokeDasharray={r.isDashed ? "5,5" : "0"}
                          className="transition-all duration-300"
                          style={{
                            strokeDashoffset: isAnimated ? '0' : undefined,
                            animation: isAnimated ? 'dash 1.5s ease-in-out infinite' : undefined,
                          }}
                          onClick={(e) => handleEdgeClick(e as any, r.id)}
                        />

                        {/* Animated flow indicators for selected table connections */}
                        {isAnimated && (
                          <>
                            <circle r={r.isDashed ? 3 : 4} fill="#6366f1" opacity={r.isDashed ? 0.8 : 1}>
                              <animateMotion
                                dur={r.isDashed ? "2.5s" : "2s"}
                                repeatCount="indefinite"
                                path={path}
                              />
                            </circle>
                            {r.isDashed && (
                              <circle r={3} fill="#a78bfa" opacity={0.6}>
                                <animateMotion
                                  dur="2.5s"
                                  repeatCount="indefinite"
                                  path={path}
                                  begin="1.25s"
                                />
                              </circle>
                            )}
                          </>
                        )}

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
                      : "border-indigo-500 shadow-lg shadow-indigo-500/20"
                    : connectedTbl && anySel
                    ? isDarkMode
                      ? "border-indigo-300/60 shadow-indigo-500/10"
                      : "border-indigo-400 shadow-indigo-400/15"
                    : isDarkMode
                    ? "border-slate-700 shadow-lg shadow-slate-950/30"
                    : "border-slate-300 shadow-md shadow-slate-300/40";

                  return (
                    <div
                      key={table.id}
                      className={`absolute w-56 rounded-xl border-2 transition-all duration-300 select-none user-select-none hover:shadow-xl
                        ${isDarkMode ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800 shadow-lg"}
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
                          ${isDarkMode ? "bg-slate-800/70 border-slate-700 hover:bg-slate-800" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}
                        style={{ background: table.color ? `${table.color}${isDarkMode ? '25' : '18'}` : undefined }}
                      >
                        <span className={`font-black text-[10px] uppercase tracking-widest truncate ${
                          primary ? (isDarkMode ? "text-indigo-200" : "text-indigo-700") : (isDarkMode ? "opacity-70" : "opacity-90 text-slate-700")
                        }`}>
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
                              {col.isPk && <Key size={10} className={isDarkMode ? "text-amber-400" : "text-amber-600"} />}
                              {col.isFk && <LinkIcon size={10} className={isDarkMode ? "text-indigo-400" : "text-indigo-600"} />}
                              <span
                                className={`truncate ${col.isPk ? "font-bold" : ""} ${
                                  isDarkMode 
                                    ? (col.isPk ? "text-indigo-300" : "text-slate-300") 
                                    : (col.isPk ? "text-indigo-700" : "text-slate-700")
                                }`}
                              >
                                {col.name}
                              </span>
                            </div>
                            <span className={`text-[9px] font-mono flex-shrink-0 ml-1 ${
                              isDarkMode ? "text-slate-500" : "text-slate-500"
                            }`}>{col.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* UML Class Diagram Mode */}
            {diagramType === 'uml-class' && (
              <>
                <svg className="absolute inset-0 pointer-events-none overflow-visible w-[5000px] h-[5000px]">
                  <UMLMarkerDefs isDarkMode={isDarkMode} />
                  {umlRelations.map((rel) => {
                    const sourceClass = umlClasses.find(c => c.id === rel.sourceClassId);
                    const targetClass = umlClasses.find(c => c.id === rel.targetClassId);
                    return (
                      <UMLRelationLine
                        key={rel.id}
                        relation={rel}
                        sourceClass={sourceClass}
                        targetClass={targetClass}
                        isDarkMode={isDarkMode}
                        isSelected={selectedUmlRelationId === rel.id}
                      />
                    );
                  })}
                </svg>

                {umlClasses.map((umlClass) => (
                  <UMLClassNode
                    key={umlClass.id}
                    umlClass={umlClass}
                    isSelected={selectedUmlClassId === umlClass.id}
                    isDarkMode={isDarkMode}
                    zoom={viewport.zoom}
                    onSelect={() => {
                      if (isDrawingUmlRelation && umlRelationSource && umlRelationSource !== umlClass.id) {
                        // Complete the relation
                        const newRelation: UMLRelation = {
                          id: generateId(),
                          sourceClassId: umlRelationSource,
                          targetClassId: umlClass.id,
                          type: pendingUmlRelationType,
                        };
                        setUmlRelations(prev => [...prev, newRelation]);
                        setIsDrawingUmlRelation(false);
                        setUmlRelationSource(null);
                        push({ title: "Relation created", type: "success" });
                      } else {
                        setSelectedUmlClassId(umlClass.id);
                        setSelectedUmlRelationId(null);
                      }
                    }}
                    onDragStart={(e) => {
                      if (effectiveIsLocked) return;
                      e.preventDefault();
                      const world = toWorld(e.clientX, e.clientY);
                      initialDragPosRef.current = {
                        tableX: umlClass.x,
                        tableY: umlClass.y,
                        mouseX: world.x,
                        mouseY: world.y,
                      };
                      setDraggedTableId(umlClass.id);
                      setIsDragging(true);
                    }}
                  />
                ))}

                {/* UML Mode placeholder when empty */}
                {umlClasses.length === 0 && (
                  <div 
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
                    style={{ pointerEvents: 'none' }}
                  >
                    <div className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                      UML Class Diagram
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      Click "Add Class" in the sidebar to get started
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Flowchart Mode */}
            {diagramType === 'flowchart' && (
              <>
                <svg className="absolute inset-0 pointer-events-none overflow-visible w-[5000px] h-[5000px]">
                  <defs>
                    <marker
                      id="fc-arrow"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                      markerUnits="strokeWidth"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                    </marker>
                    <marker
                      id="fc-arrow-start"
                      markerWidth="10"
                      markerHeight="7"
                      refX="1"
                      refY="3.5"
                      orient="auto-start-reverse"
                      markerUnits="strokeWidth"
                    >
                      <polygon points="10 0, 0 3.5, 10 7" fill="currentColor" />
                    </marker>
                  </defs>

                  {/* Ghost preview while drawing a flowchart connection */}
                  {isDrawingConnection && connectionSource && flowchartGhostTarget && (() => {
                    const sourceNode = flowchartNodes.find(n => n.id === connectionSource);
                    if (!sourceNode) return null;

                    const sx = sourceNode.x + 60;
                    const sy = sourceNode.y + 25;
                    const tx = flowchartGhostTarget.x;
                    const ty = flowchartGhostTarget.y;

                    const connectionType = pendingFlowchartConnectionType;
                    const dashArray =
                      connectionType === 'dashed' || connectionType === 'conditional-no'
                        ? '8 6'
                        : connectionType === 'dotted'
                          ? '2 6'
                          : undefined;

                    const markerStart = connectionType === 'bidirectional' ? 'url(#fc-arrow-start)' : undefined;
                    const markerEnd = 'url(#fc-arrow)';

                    const dx = tx - sx;
                    const dy = ty - sy;
                    const dist = Math.max(1, Math.hypot(dx, dy));
                    const nx = -dy / dist;
                    const ny = dx / dist;

                    const isLoopBack = connectionType === 'loop-back';
                    const baseOffset = 80;
                    const offset = baseOffset * 1.6;
                    const midX = (sx + tx) / 2;
                    const midY = (sy + ty) / 2;
                    const loopV = { x: nx * offset, y: ny * offset };

                    const path = isLoopBack
                      ? `M ${sx} ${sy} C ${sx + loopV.x} ${sy + loopV.y}, ${tx + loopV.x} ${ty + loopV.y}, ${tx} ${ty}`
                      : `M ${sx} ${sy} Q ${midX + nx * 30} ${midY + ny * 30} ${tx} ${ty}`;

                    return (
                      <g className="pointer-events-none">
                        <path
                          d={path}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeDasharray={dashArray}
                          markerStart={markerStart}
                          markerEnd={markerEnd}
                          style={{
                            color: 'hsl(var(--primary))',
                            opacity: 0.55,
                          }}
                        />
                      </g>
                    );
                  })()}

                  {flowchartConnections.map((conn) => {
                    const sourceNode = flowchartNodes.find(n => n.id === conn.sourceNodeId);
                    const targetNode = flowchartNodes.find(n => n.id === conn.targetNodeId);
                    if (!sourceNode || !targetNode) return null;

                    const sx = sourceNode.x + 60;
                    const sy = sourceNode.y + 25;
                    const tx = targetNode.x + 60;
                    const ty = targetNode.y + 25;

                    const connectionType = (conn.connectionType ?? 'arrow') as import('./types/uml').FlowchartConnectionType;
                    const isSelected = selectedFlowchartConnectionId === conn.id;

                    // Dash arrays for different connection types
                    const dashArray =
                      connectionType === 'dashed' || connectionType === 'conditional-no'
                        ? '8 6'
                        : connectionType === 'dotted'
                          ? '2 6'
                          : undefined;

                    const markerStart = connectionType === 'bidirectional' ? 'url(#fc-arrow-start)' : undefined;
                    const markerEnd = 'url(#fc-arrow)';

                    const dx = tx - sx;
                    const dy = ty - sy;
                    const dist = Math.max(1, Math.hypot(dx, dy));
                    const nx = -dy / dist;
                    const ny = dx / dist;
                    const baseOffset = 80;
                    const offset = connectionType === 'loop-back' ? baseOffset * 1.6 : baseOffset;

                    // Bend/control handling
                    const midX = (sx + tx) / 2;
                    const midY = (sy + ty) / 2;
                    const defaultQuadControl = { x: midX + nx * 30, y: midY + ny * 30 };
                    const bendPoint = conn.bend ?? defaultQuadControl;

                    // For loop-back, treat bendPoint as a handle around the midpoint, and derive the offset vector
                    const loopVec = { x: bendPoint.x - midX, y: bendPoint.y - midY };
                    const loopDefaultVec = { x: nx * offset, y: ny * offset };
                    const loopV = conn.bend ? loopVec : loopDefaultVec;

                    // Calculate path based on connection type
                    const isLoopBack = connectionType === 'loop-back';
                    const hasWaypoints = (conn.waypoints?.length ?? 0) > 0;
                    const path = hasWaypoints
                      ? `M ${sx} ${sy} ${conn.waypoints!.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${tx} ${ty}`
                      : isLoopBack
                        ? `M ${sx} ${sy} C ${sx + loopV.x} ${sy + loopV.y}, ${tx + loopV.x} ${ty + loopV.y}, ${tx} ${ty}`
                        : conn.lineType === 'curved'
                          ? `M ${sx} ${sy} Q ${bendPoint.x} ${bendPoint.y} ${tx} ${ty}`
                          : `M ${sx} ${sy} L ${tx} ${ty}`;

                    // Calculate label position - midpoint with offset to avoid overlap
                    const labelX = isLoopBack 
                      ? (sx + tx) / 2 + nx * offset * 0.5
                      : (sx + tx) / 2 + nx * 10;
                    const labelY = isLoopBack 
                      ? (sy + ty) / 2 + ny * offset * 0.5 - 5
                      : (sy + ty) / 2 + ny * 10 - 5;

                    // Bend handle position
                    const handlePos = isLoopBack
                      ? { x: midX + loopV.x, y: midY + loopV.y }
                      : bendPoint;

                    // Display label (use connection label or auto-label for Yes/No types)
                    const displayLabel = conn.label || 
                      (connectionType === 'conditional-yes' ? 'Yes' : 
                       connectionType === 'conditional-no' ? 'No' : undefined);

                    return (
                      <g
                        key={conn.id}
                        className="pointer-events-auto cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();

                           // Shift+click: Smart waypoint insertion into nearest segment
                           if (e.shiftKey && !effectiveIsLocked) {
                             const world = toWorld(e.clientX, e.clientY);
                             setFlowchartConnections((prev) =>
                               prev.map((c) => {
                                 if (c.id !== conn.id) return c;
                                 const wps = [...(c.waypoints ?? [])];
                                 
                                 // Find the nearest segment to insert into
                                 const sourceN = flowchartNodes.find(n => n.id === c.sourceNodeId);
                                 const targetN = flowchartNodes.find(n => n.id === c.targetNodeId);
                                 if (!sourceN || !targetN) {
                                   wps.push({ x: world.x, y: world.y });
                                   return { ...c, waypoints: wps, lineType: 'straight' };
                                 }

                                 // Build list of points: source -> waypoints -> target
                                 const points = [
                                   { x: sourceN.x + 60, y: sourceN.y + 25 },
                                   ...wps,
                                   { x: targetN.x + 60, y: targetN.y + 25 },
                                 ];

                                 // Find nearest segment
                                 let minDist = Infinity;
                                 let insertIdx = wps.length; // default: append

                                 for (let i = 0; i < points.length - 1; i++) {
                                   const p1 = points[i];
                                   const p2 = points[i + 1];
                                   // Distance from point to line segment
                                   const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                                   if (segLen === 0) continue;
                                   const t = Math.max(0, Math.min(1, ((world.x - p1.x) * (p2.x - p1.x) + (world.y - p1.y) * (p2.y - p1.y)) / (segLen * segLen)));
                                   const projX = p1.x + t * (p2.x - p1.x);
                                   const projY = p1.y + t * (p2.y - p1.y);
                                   const dist = Math.hypot(world.x - projX, world.y - projY);
                                   if (dist < minDist) {
                                     minDist = dist;
                                     insertIdx = i; // Insert after waypoint index i-1 (so at position i in wps array)
                                   }
                                 }

                                 // Insert at the correct position (adjusting for source point at index 0)
                                 const wpInsertIdx = Math.max(0, insertIdx);
                                 wps.splice(wpInsertIdx, 0, { x: world.x, y: world.y });
                                 
                                 return { ...c, waypoints: wps, lineType: 'straight' };
                               })
                             );
                             setSelectedFlowchartConnectionId(conn.id);
                             setSelectedFlowchartNodeId(null);
                             push({ title: 'Waypoint inserted', type: 'info' });
                             return;
                           }

                          setSelectedFlowchartConnectionId(conn.id);
                          setSelectedFlowchartNodeId(null);
                        }}
                      >
                        {/* Hit area - invisible wider path for easier selection */}
                        <path
                          d={path}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={20}
                          className="hover:stroke-primary/10"
                        />
                        {/* Selection highlight */}
                        {isSelected && (
                          <path
                            d={path}
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth={6}
                            strokeOpacity={0.3}
                            strokeDasharray={dashArray}
                          />
                        )}
                        {/* Actual connection line */}
                        <path
                          d={path}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={isSelected ? 3 : 2}
                          strokeDasharray={dashArray}
                          markerStart={markerStart}
                          markerEnd={markerEnd}
                          style={{
                            color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                          }}
                        />
                        {/* Label with background for readability */}
                        {displayLabel && (
                          <>
                            <rect
                              x={labelX - 15}
                              y={labelY - 8}
                              width={30}
                              height={14}
                              rx={3}
                              fill={isDarkMode ? 'hsl(var(--background))' : 'hsl(var(--background))'}
                              fillOpacity={0.9}
                            />
                            <text
                              x={labelX}
                              y={labelY + 3}
                              fill={connectionType === 'conditional-yes' ? 'hsl(var(--success, 142 76% 36%))' : 
                                    connectionType === 'conditional-no' ? 'hsl(var(--destructive))' : 
                                    'hsl(var(--muted-foreground))'}
                              fontSize="10"
                              fontWeight={connectionType === 'conditional-yes' || connectionType === 'conditional-no' ? '600' : '400'}
                              textAnchor="middle"
                            >
                              {displayLabel}
                            </text>
                          </>
                        )}

                        {/* Bend/waypoint handle (selected + unlocked) */}
                        {isSelected && !effectiveIsLocked && !hasWaypoints && (
                          <circle
                            cx={handlePos.x}
                            cy={handlePos.y}
                            r={6}
                            fill="hsl(var(--background))"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            style={{ cursor: 'grab' }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();

                              const world = toWorld((e as any).clientX, (e as any).clientY);
                              setIsDraggingFlowchartBend(true);
                              setDraggedFlowchartConnectionId(conn.id);
                              setFlowchartBendDragStart(world);

                              // If straight, begin by turning it into a curved path
                              const startBend = conn.lineType === 'curved' || isLoopBack ? handlePos : defaultQuadControl;
                              setFlowchartBendDragStartBend(startBend);

                              if (conn.lineType === 'straight' && !isLoopBack) {
                                setFlowchartConnections((prev) =>
                                  prev.map((c) =>
                                    c.id === conn.id
                                      ? { ...c, lineType: 'curved', bend: startBend }
                                      : c
                                  )
                                );
                              }
                            }}
                          />
                        )}

                        {/* Waypoints (selected + unlocked) */}
                        {isSelected && !effectiveIsLocked && hasWaypoints && (
                          <>
                            {(conn.waypoints ?? []).map((wp, idx) => (
                              <circle
                                key={`${conn.id}-wp-${idx}`}
                                cx={wp.x}
                                cy={wp.y}
                                r={6}
                                fill="hsl(var(--background))"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                style={{ cursor: 'grab' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!e.altKey) return;
                                  setFlowchartConnections((prev) =>
                                    prev.map((c) => {
                                      if (c.id !== conn.id) return c;
                                      const wps = [...(c.waypoints ?? [])];
                                      wps.splice(idx, 1);
                                      return { ...c, waypoints: wps.length ? wps : undefined };
                                    })
                                  );
                                  push({ title: 'Waypoint removed', type: 'info' });
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  const world = toWorld((e as any).clientX, (e as any).clientY);
                                  setIsDraggingFlowchartWaypoint(true);
                                  setDraggedFlowchartWaypoint({ connectionId: conn.id, index: idx });
                                  setFlowchartWaypointDragStart(world);
                                  setFlowchartWaypointDragStartPos({ x: wp.x, y: wp.y });
                                }}
                              />
                            ))}
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {flowchartNodes.map((node) => (
                  <FlowchartNode
                    key={node.id}
                    node={node}
                    isSelected={selectedFlowchartNodeId === node.id}
                    isDarkMode={isDarkMode}
                    onSelect={() => {
                      if (isDrawingConnection && connectionSource && connectionSource !== node.id) {
                        // Find source node to check if it's a decision node
                        const srcNode = flowchartNodes.find(n => n.id === connectionSource);
                        const isFromDecision = srcNode?.type === 'decision';
                        
                        // Count existing connections from this decision node
                        const existingFromDecision = flowchartConnections.filter(c => c.sourceNodeId === connectionSource);
                        
                        // Auto-set connection type for decision branches
                        let autoConnectionType = pendingFlowchartConnectionType;
                        let autoLabel = '';
                        if (isFromDecision && pendingFlowchartConnectionType === 'arrow') {
                          if (existingFromDecision.length === 0) {
                            autoConnectionType = 'conditional-yes';
                            autoLabel = 'Yes';
                          } else if (existingFromDecision.length === 1) {
                            autoConnectionType = 'conditional-no';
                            autoLabel = 'No';
                          }
                        }
                        
                        const newConnection: FlowchartConnection = {
                          id: generateId(),
                          sourceNodeId: connectionSource,
                          targetNodeId: node.id,
                          lineType: 'curved',
                          connectionType: autoConnectionType,
                          label: autoLabel || undefined,
                        };
                        setFlowchartConnections(prev => [...prev, newConnection]);
                        setIsDrawingConnection(false);
                        setConnectionSource(null);
                        setSelectedFlowchartConnectionId(newConnection.id);
                        push({ title: "Connection created", type: "success" });
                      } else {
                        setSelectedFlowchartNodeId(node.id);
                        setSelectedFlowchartConnectionId(null);
                      }
                    }}
                    onDragStart={(e) => {
                      if (effectiveIsLocked) return;
                      e.preventDefault();
                      const world = toWorld(e.clientX, e.clientY);
                      initialDragPosRef.current = {
                        tableX: node.x,
                        tableY: node.y,
                        mouseX: world.x,
                        mouseY: world.y,
                      };
                      setDraggedTableId(node.id);
                      setIsDragging(true);
                    }}
                  />
                ))}

                {/* Flowchart placeholder when empty */}
                {flowchartNodes.length === 0 && (
                  <div 
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
                    style={{ pointerEvents: 'none' }}
                  >
                    <div className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                      Flowchart
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      Use the toolbox below to add nodes
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Sequence Diagram Mode */}
            {diagramType === 'sequence' && (
              <>
                <svg className="absolute inset-0 pointer-events-none overflow-visible w-[5000px] h-[5000px]">
                  {sequenceMessages.map((message) => {
                    const fromParticipant = sequenceParticipants.find(p => p.id === message.fromId);
                    const toParticipant = sequenceParticipants.find(p => p.id === message.toId);
                    return (
                      <SequenceMessageArrow
                        key={message.id}
                        message={message}
                        fromParticipant={fromParticipant}
                        toParticipant={toParticipant}
                        isDarkMode={isDarkMode}
                        isSelected={selectedMessageId === message.id}
                        baseY={150}
                        onSelect={() => {
                          setSelectedMessageId(message.id);
                          setSelectedParticipantId(null);
                        }}
                      />
                    );
                  })}
                </svg>

                {sequenceParticipants.map((participant) => (
                  <SequenceParticipantNode
                    key={participant.id}
                    participant={participant}
                    isSelected={selectedParticipantId === participant.id}
                    isDarkMode={isDarkMode}
                    diagramHeight={200 + sequenceMessages.length * 50}
                    onSelect={() => {
                      setSelectedParticipantId(participant.id);
                      setSelectedMessageId(null);
                    }}
                    onDragStart={(e) => {
                      if (effectiveIsLocked) return;
                      e.preventDefault();
                      const world = toWorld(e.clientX, e.clientY);
                      initialDragPosRef.current = {
                        tableX: participant.x,
                        tableY: 0,
                        mouseX: world.x,
                        mouseY: world.y,
                      };
                      setDraggedTableId(participant.id);
                      setIsDragging(true);
                    }}
                  />
                ))}

                {/* Sequence Diagram placeholder when empty */}
                {sequenceParticipants.length === 0 && (
                  <div 
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
                    style={{ pointerEvents: 'none' }}
                  >
                    <div className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                      Sequence Diagram
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`}>
                      Use the toolbox below to add participants
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Connection Toolbar - visible in UML and Flowchart modes */}
          {(diagramType === 'uml-class' || diagramType === 'flowchart') && !effectiveIsLocked && (
            <ConnectionToolbar
              isVisible={true}
              isDrawing={diagramType === 'uml-class' ? isDrawingUmlRelation : isDrawingConnection}
              diagramType={diagramType as 'uml-class' | 'flowchart'}
              selectedRelationType={pendingUmlRelationType}
              selectedConnectionType={pendingFlowchartConnectionType}
              onStartConnection={() => {
                if (diagramType === 'uml-class' && selectedUmlClassId) {
                  setIsDrawingUmlRelation(true);
                  setUmlRelationSource(selectedUmlClassId);
                  push({ title: "Click target class", type: "info" });
                } else if (diagramType === 'flowchart' && selectedFlowchartNodeId) {
                  setIsDrawingConnection(true);
                  setConnectionSource(selectedFlowchartNodeId);
                  push({ title: "Click target node", type: "info" });
                } else {
                  push({ title: `Select a ${diagramType === 'uml-class' ? 'class' : 'node'} first`, type: "info" });
                }
              }}
              onCancelConnection={() => {
                setIsDrawingUmlRelation(false);
                setUmlRelationSource(null);
                setIsDrawingConnection(false);
                setConnectionSource(null);
              }}
              onSelectRelationType={(type) => setPendingUmlRelationType(type)}
              onSelectConnectionType={(type) => setPendingFlowchartConnectionType(type)}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Flowchart Toolbox - visible only in flowchart mode */}
          {diagramType === 'flowchart' && (
            <FlowchartToolbox
              onAddNode={(type) => {
                  const center = getCanvasCenterWorld();
                const newNode: FlowchartNodeType = {
                  id: generateId(),
                  type,
                  label: type === 'start-end' ? 'Start' : type === 'decision' ? 'Condition?' : 'Process',
                    x: center.x,
                    y: center.y,
                };
                setFlowchartNodes(prev => [...prev, newNode]);
                setSelectedFlowchartNodeId(newNode.id);
                push({ title: "Node added", type: "success" });
              }}
              isDarkMode={isDarkMode}
              isLocked={effectiveIsLocked}
            />
          )}

          {/* Sequence Toolbox - visible only in sequence mode */}
          {diagramType === 'sequence' && (
            <SequenceToolbox
              onAddParticipant={(type) => {
                const newParticipant: SequenceParticipant = {
                  id: generateId(),
                  name: type === 'actor' ? 'Actor' : type === 'object' ? 'Object' : type.charAt(0).toUpperCase() + type.slice(1),
                  type,
                  x: 100 + sequenceParticipants.length * 150,
                };
                setSequenceParticipants(prev => [...prev, newParticipant]);
                setSelectedParticipantId(newParticipant.id);
                push({ title: "Participant added", type: "success" });
              }}
              isDarkMode={isDarkMode}
              isLocked={effectiveIsLocked}
            />
          )}

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

          {/* Waypoint Drag HUD */}
          <WaypointDragHUD
            visible={waypointHUDState.visible}
            position={waypointHUDState.screenPos}
            worldPosition={waypointHUDState.worldPos}
            isSnapped={waypointHUDState.isSnapped}
            isAvoiding={waypointHUDState.isAvoiding}
            viewport={viewport}
          />

          {/* Zoom indicator - hide on mobile */}
          {!isMobile && (
            <div
              className={`absolute bottom-6 left-6 px-4 py-2 backdrop-blur-xl border rounded-full text-[10px] font-bold uppercase tracking-widest pointer-events-none transition-all duration-200 ${isSmallScreen ? 'hidden' : ''} ${
                isDarkMode ? "bg-slate-900/60 border-slate-700 text-slate-300 shadow-lg shadow-slate-950/40" : "bg-white/70 border-slate-200 text-slate-700 shadow-md shadow-slate-400/10"
              }`}
            >
              Zoom: {Math.round(viewport.zoom * 100)}%
            </div>
          )}

          {/* Refactored Commands Pill - hide on mobile/small screens */}
          {!isSmallScreen && (
            <button
              onClick={() => setShowKeyboardShortcuts(true)}
              className={`absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${
                isDarkMode
                  ? "bg-slate-900/80 border-slate-700/50 text-slate-300 hover:bg-slate-800/80 hover:border-primary/50"
                  : "bg-white/90 border-slate-200 text-slate-600 hover:bg-white hover:border-primary/50"
              }`}
            >
              <div 
                className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ 
                  background: 'hsl(var(--primary) / 0.15)', 
                  color: 'hsl(var(--primary))' 
                }}
              >
                ?
              </div>
              <span className="text-[11px] font-semibold">Shortcuts</span>
              <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                ⌘/
              </div>
            </button>
          )}

          {/* Quick Actions Toolbar - always visible except on mobile */}
          {!isMobile && (
            <QuickActionsToolbar
              isDarkMode={isDarkMode}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onUndo={undo}
              onRedo={redo}
              onFitToContent={fitToContent}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onResetViewport={resetViewport}
            />
          )}

          {/* Mobile Bottom Navigation */}
          {isMobile && (
            <MobileBottomNav
              isDarkMode={isDarkMode}
              diagramType={diagramType}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              isLocked={effectiveIsLocked}
              onUndo={undo}
              onRedo={redo}
              onFitToContent={fitToContent}
              onAddElement={() => {
                if (diagramType === 'erd') {
                  addTable();
                } else if (diagramType === 'uml-class') {
                  const center = getCanvasCenterWorld();
                  const newClass: UMLClass = {
                    id: generateId(),
                    name: 'NewClass',
                    stereotype: undefined,
                    x: center.x,
                    y: center.y,
                    attributes: [],
                    methods: [],
                  };
                  setUmlClasses(prev => [...prev, newClass]);
                  setSelectedUmlClassId(newClass.id);
                  push({ title: "Class added", type: "success" });
                } else if (diagramType === 'flowchart') {
                  const center = getCanvasCenterWorld();
                  const newNode: FlowchartNodeType = {
                    id: generateId(),
                    type: 'process',
                    label: 'Process',
                    x: center.x,
                    y: center.y,
                  };
                  setFlowchartNodes(prev => [...prev, newNode]);
                  setSelectedFlowchartNodeId(newNode.id);
                  push({ title: "Node added", type: "success" });
                } else if (diagramType === 'sequence') {
                  const newParticipant: SequenceParticipant = {
                    id: generateId(),
                    name: 'Actor',
                    type: 'actor',
                    x: 100 + sequenceParticipants.length * 150,
                  };
                  setSequenceParticipants(prev => [...prev, newParticipant]);
                  setSelectedParticipantId(newParticipant.id);
                  push({ title: "Participant added", type: "success" });
                }
              }}
              onStartConnection={() => {
                if (diagramType === 'uml-class' && selectedUmlClassId) {
                  setIsDrawingUmlRelation(true);
                  setUmlRelationSource(selectedUmlClassId);
                  push({ title: "Click target class", type: "info" });
                } else if (diagramType === 'flowchart' && selectedFlowchartNodeId) {
                  setIsDrawingConnection(true);
                  setConnectionSource(selectedFlowchartNodeId);
                  push({ title: "Click target node", type: "info" });
                } else {
                  push({ title: `Select a ${diagramType === 'erd' ? 'table' : diagramType === 'uml-class' ? 'class' : 'node'} first`, type: "info" });
                }
              }}
              onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              onShowMenu={() => setShowMobileMenu(!showMobileMenu)}
            />
          )}
        </div>

        {/* EDITOR SIDEBAR - Resizable with popup modal option */}
        <ResizablePanel
          defaultWidth={320}
          minWidth={280}
          maxWidth={600}
          isOpen={isSidebarOpen}
          isDarkMode={isDarkMode}
          side="right"
          className={`border-l shadow-2xl z-30 transition-all duration-300 ${
            isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
          style={{ 
            marginTop: isMinimapCollapsed ? '56px' : '120px', 
            height: isMinimapCollapsed ? 'calc(100% - 56px)' : 'calc(100% - 120px)' 
          }}
        >
          {/* Header with toggle and popup buttons */}
          <div
            className={`p-4 border-b flex items-center justify-between whitespace-nowrap transition-colors duration-300 flex-shrink-0 ${
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
                onClick={() => _setIsSidebarPopup(true)}
                className={`p-1 rounded flex-shrink-0 transition-colors ${isDarkMode ? "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"}`}
                title="Open in popup modal"
              >
                <ExternalLink size={14} />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className={`p-1 rounded flex-shrink-0 transition-colors ${isDarkMode ? "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"}`}
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
        {/* Table Name - only editable by users with canEdit permission */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Table name
          </label>
          <input
            className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none border transition-all duration-200 ${
              isDarkMode
                ? "bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500 focus:bg-slate-900"
                : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400 focus:bg-slate-50"
            } ${(isLocked || !userRole.canEdit) ? "opacity-60 cursor-not-allowed" : ""}`}
            value={t.name}
            onChange={(e) => userRole.canEdit && !isLocked && setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
            onBlur={() => pushHistory()}
            disabled={isLocked || !userRole.canEdit}
          />
        </div>

        {/* Description Collapsible Section */}
        <CollapsibleSection 
          title="Description" 
          icon={<FileText size={14} />} 
          defaultOpen={!!t.description}
          isDarkMode={isDarkMode}
        >
          <textarea
            className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none border transition-all duration-200 resize-none ${
              isDarkMode
                ? "bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500 focus:bg-slate-900"
                : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400 focus:bg-slate-50"
            } ${!userRole.canAddMetadata ? "opacity-60 cursor-not-allowed" : ""}`}
            rows={3}
            placeholder="Add notes about this table..."
            value={t.description || ""}
            onChange={(e) => userRole.canAddMetadata && setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, description: e.target.value } : x)))}
            onBlur={() => pushHistory()}
            disabled={!userRole.canAddMetadata}
          />
          {t.description && (
            <div className={`text-[9px] opacity-75 mt-1 ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>
              {t.description.length} characters
            </div>
          )}
        </CollapsibleSection>

        {/* Comments Collapsible Section - Moved under description, readers can add comments */}
        <CollapsibleSection
          title="Comments"
          icon={<MessageSquare size={14} />}
          badge={selectedTableComments.length || undefined}
          defaultOpen={selectedTableComments.length > 0}
          isDarkMode={isDarkMode}
        >
          {/* Add comment form - Anyone with canAddMetadata can add comments */}
          {userRole.canAddMetadata && (
            <div className="mb-3 space-y-2">
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
                onClick={() => {
                  if (newCommentText.trim()) {
                    handleAddComment(newCommentText);
                    setNewCommentText("");
                    push({ title: "Comment added", type: "success" });
                  }
                }}
                disabled={!newCommentText.trim()}
                className="w-full py-1.5 bg-indigo-500/10 text-indigo-500 text-xs font-bold rounded-lg hover:bg-indigo-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Post Comment
              </button>
            </div>
          )}

          {/* Comments list */}
          {selectedTableComments.length === 0 ? (
            <div className={`text-xs text-center py-2 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
              No comments yet
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedTableComments.map((comment: TableComment) => (
                <div
                  key={comment.id}
                  className={`p-2 rounded-lg border transition-all duration-200 ${
                    isDarkMode ? "bg-slate-950/50 border-slate-800 hover:border-slate-700" : "bg-slate-50 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-[10px] font-bold ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                        {comment.author_email?.split('@')[0] || 'User'}
                      </div>
                      <div className={`text-xs my-1 leading-relaxed break-words ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                        {comment.content}
                      </div>
                      <div className={`text-[8px] ${isDarkMode ? "text-slate-600" : "text-slate-500"}`}>
                        {new Date(comment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {comment.author_id === user.id && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
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
        </CollapsibleSection>

        {/* Notes Collapsible Section */}
        <CollapsibleSection 
          title="Notes" 
          icon={<StickyNote size={14} />} 
          badge={(t as any).notes?.length || undefined}
          isDarkMode={isDarkMode}
        >
          <div className="space-y-2">
            {((t as any).notes || []).map((note: any) => (
              <div key={note.id} className={`p-2 rounded-lg text-xs ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
                <p style={{ color: isDarkMode ? '#e2e8f0' : '#334155' }}>{note.content}</p>
                <p className="text-[9px] mt-1" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                  {note.author_email?.split('@')[0]} • {new Date(note.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
            {userRole.canAddMetadata && (
              <input
                type="text"
                placeholder="Add a note..."
                className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${isDarkMode ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                    const note = { id: generateId(), content: (e.target as HTMLInputElement).value.trim(), author_id: user.id, author_email: user.email || '', created_at: new Date().toISOString() };
                    setTables(prev => prev.map(x => x.id === t.id ? { ...x, notes: [...((x as any).notes || []), note] } as any : x));
                    (e.target as HTMLInputElement).value = '';
                    push({ title: "Note added", type: "success" });
                  }
                }}
              />
            )}
          </div>
        </CollapsibleSection>

        {/* Questions Collapsible Section */}
        <CollapsibleSection 
          title="Questions" 
          icon={<HelpCircle size={14} />} 
          badge={(t as any).questions?.filter((q: any) => !q.resolved)?.length || undefined}
          isDarkMode={isDarkMode}
        >
          <div className="space-y-2">
            {((t as any).questions || []).map((q: any) => (
              <div key={q.id} className={`p-2 rounded-lg text-xs ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
                <p style={{ color: isDarkMode ? '#e2e8f0' : '#334155' }}>{q.content}</p>
                <p className="text-[9px] mt-1" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                  {q.author_email?.split('@')[0]} • {q.resolved ? '✓ Resolved' : 'Open'}
                </p>
              </div>
            ))}
            {userRole.canAddMetadata && (
              <input
                type="text"
                placeholder="Ask a question..."
                className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${isDarkMode ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                    const question = { id: generateId(), content: (e.target as HTMLInputElement).value.trim(), author_id: user.id, author_email: user.email || '', created_at: new Date().toISOString(), resolved: false };
                    setTables(prev => prev.map(x => x.id === t.id ? { ...x, questions: [...((x as any).questions || []), question] } as any : x));
                    (e.target as HTMLInputElement).value = '';
                    push({ title: "Question added", type: "success" });
                  }
                }}
              />
            )}
          </div>
        </CollapsibleSection>

        {/* Changes Collapsible Section */}
        <CollapsibleSection 
          title="Changes" 
          icon={<GitCommit size={14} />} 
          badge={(t as any).changes?.length || undefined}
          isDarkMode={isDarkMode}
        >
          <div className="space-y-2">
            {((t as any).changes || []).map((change: any) => (
              <div key={change.id} className={`p-2 rounded-lg text-xs ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
                <p style={{ color: isDarkMode ? '#e2e8f0' : '#334155' }}>{change.content}</p>
                <p className="text-[9px] mt-1" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                  {change.author_email?.split('@')[0]} • {change.type || 'modified'}
                </p>
              </div>
            ))}
            {userRole.canAddMetadata && (
              <input
                type="text"
                placeholder="Log a change..."
                className={`w-full px-3 py-2 rounded-lg text-xs border outline-none ${isDarkMode ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                    const change = { id: generateId(), content: (e.target as HTMLInputElement).value.trim(), author_id: user.id, author_email: user.email || '', created_at: new Date().toISOString(), type: 'modified' };
                    setTables(prev => prev.map(x => x.id === t.id ? { ...x, changes: [...((x as any).changes || []), change] } as any : x));
                    (e.target as HTMLInputElement).value = '';
                    push({ title: "Change logged", type: "success" });
                  }
                }}
              />
            )}
          </div>
        </CollapsibleSection>

        {/* Fixes Collapsible Section */}
        <CollapsibleSection 
          title="Fixes" 
          icon={<Wrench size={14} />} 
          badge={(t as any).fixes?.length || undefined}
          isDarkMode={isDarkMode}
        >
          <div className="space-y-2">
            {((t as any).fixes || []).map((fix: any) => (
              <div key={fix.id} className={`p-2 rounded-lg text-xs ${isDarkMode ? "bg-slate-950" : "bg-white"}`}>
                <div className="flex items-center gap-2">
                  {/* Editable Priority Selector */}
                  {userRole.canAddMetadata ? (
                    <select
                      value={fix.priority || 'medium'}
                      onChange={(e) => {
                        const newPriority = e.target.value as 'low' | 'medium' | 'high';
                        setTables(prev => prev.map(x => x.id === t.id ? {
                          ...x,
                          fixes: ((x as any).fixes || []).map((f: any) => f.id === fix.id ? { ...f, priority: newPriority } : f)
                        } as any : x));
                        push({ title: "Priority updated", type: "success" });
                      }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border-none outline-none cursor-pointer ${
                        fix.priority === 'high' ? 'bg-red-500/20 text-red-400' : fix.priority === 'low' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                      }`}
                      style={{ 
                        background: fix.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : fix.priority === 'low' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      }}
                    >
                      <option value="low" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', color: isDarkMode ? '#4ade80' : '#16a34a' }}>low</option>
                      <option value="medium" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', color: isDarkMode ? '#fbbf24' : '#d97706' }}>medium</option>
                      <option value="high" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', color: isDarkMode ? '#f87171' : '#dc2626' }}>high</option>
                    </select>
                  ) : (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${fix.priority === 'high' ? 'bg-red-500/20 text-red-400' : fix.priority === 'low' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {fix.priority || 'medium'}
                    </span>
                  )}
                </div>
                <p className="mt-1" style={{ color: isDarkMode ? '#e2e8f0' : '#334155' }}>{fix.content}</p>
                <p className="text-[9px] mt-1" style={{ color: isDarkMode ? '#64748b' : '#94a3b8' }}>
                  {fix.author_email?.split('@')[0]}
                </p>
              </div>
            ))}
            {userRole.canAddMetadata && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="fix-input"
                    placeholder="Add a fix..."
                    className={`flex-1 px-3 py-2 rounded-lg text-xs border outline-none ${isDarkMode ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                        const prioritySelect = document.getElementById('fix-priority-select') as HTMLSelectElement;
                        const priority = prioritySelect?.value || 'medium';
                        const fix = { id: generateId(), content: (e.target as HTMLInputElement).value.trim(), author_id: user.id, author_email: user.email || '', created_at: new Date().toISOString(), priority };
                        setTables(prev => prev.map(x => x.id === t.id ? { ...x, fixes: [...((x as any).fixes || []), fix] } as any : x));
                        (e.target as HTMLInputElement).value = '';
                        push({ title: "Fix added", type: "success" });
                      }
                    }}
                  />
                  <select
                    id="fix-priority-select"
                    defaultValue="medium"
                    className={`px-2 py-2 rounded-lg text-xs border outline-none ${isDarkMode ? "bg-slate-950 border-slate-700 text-slate-100" : "bg-white border-slate-300 text-slate-900"}`}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Color Picker - Only editable by users with canEdit permission */}
        {userRole.canEdit && (
          <CollapsibleSection
            title="Table Color"
            icon={<Palette size={14} />}
            defaultOpen={true}
            isDarkMode={isDarkMode}
          >
            <ColorPicker
              color={t.color || "#64748b"}
              onChange={(newColor) => {
                if (!isLocked && userRole.canEdit) {
                  setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, color: newColor } : x)));
                }
              }}
              onBlur={() => pushHistory()}
              disabled={isLocked || !userRole.canEdit}
              isDarkMode={isDarkMode}
            />
          </CollapsibleSection>
        )}

        {/* Columns - Only editable by users with canEdit permission */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              Columns
            </label>
            {userRole.canEdit && (
              <button
                onClick={() => {
                  if (!isLocked && userRole.canEdit) {
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
                disabled={isLocked || !userRole.canEdit}
                className={`text-indigo-500 text-[10px] font-bold hover:underline hover:text-indigo-600 transition-colors duration-200 ${(isLocked || !userRole.canEdit) ? "opacity-50 cursor-not-allowed" : ""}`}
                onMouseUp={() => pushHistory()}
              >
                + Add column
              </button>
            )}
          </div>

          {t.columns.map((col) => (
            <div
              key={col.id}
              className={`p-3 rounded-xl border space-y-2 transition-all duration-200 ${
                isDarkMode ? "bg-slate-950 border-slate-700 hover:bg-slate-900 hover:border-slate-600" : "bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-300"
              } ${(isLocked || !userRole.canEdit) ? "opacity-60" : ""}`}
            >
              <div className="flex gap-2">
                <input
                  className={`bg-transparent text-xs w-full outline-none font-bold transition-colors duration-200 ${
                    isDarkMode ? "text-slate-100" : "text-slate-900"
                  } ${(isLocked || !userRole.canEdit) ? "cursor-not-allowed" : ""}`}
                  value={col.name}
                  onChange={(e) =>
                    userRole.canEdit && !isLocked && setTables((prev) =>
                      prev.map((x) =>
                        x.id === t.id
                          ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, name: e.target.value } : c)) }
                          : x
                      )
                    )
                  }
                  onBlur={() => pushHistory()}
                  disabled={isLocked || !userRole.canEdit}
                />
                {userRole.canEdit && (
                  <button
                    className={`transition-colors duration-200 ${isDarkMode ? "text-slate-500 hover:text-red-500" : "text-slate-600 hover:text-red-600"} ${(isLocked || !userRole.canEdit) ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => {
                      if (!isLocked && userRole.canEdit) {
                        setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, columns: x.columns.filter((c) => c.id !== col.id) } : x)));
                      }
                    }}
                    disabled={isLocked || !userRole.canEdit}
                    onMouseUp={() => pushHistory()}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {userRole.canEdit && (
                <div className="flex gap-3">
                  <label className="flex items-center text-[10px] gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.isPk}
                      onChange={(e) =>
                        userRole.canEdit && !isLocked && setTables((prev) =>
                          prev.map((x) =>
                            x.id === t.id
                              ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, isPk: e.target.checked } : c)) }
                              : x
                          )
                        )
                      }
                      disabled={isLocked || !userRole.canEdit}
                      onMouseUp={() => pushHistory()}
                    />{" "}
                    PK
                  </label>

                  <label className="flex items-center text-[10px] gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={col.isFk}
                      onChange={(e) =>
                        userRole.canEdit && !isLocked && setTables((prev) =>
                          prev.map((x) =>
                            x.id === t.id
                              ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, isFk: e.target.checked } : c)) }
                              : x
                          )
                        )
                      }
                      disabled={isLocked || !userRole.canEdit}
                      onMouseUp={() => pushHistory()}
                    />{" "}
                    FK
                  </label>

                  <select
                    className={`text-[10px] outline-none ml-auto transition-colors duration-200 rounded px-1 py-0.5 ${(isLocked || !userRole.canEdit) ? "opacity-50 cursor-not-allowed" : ""}`}
                    style={{
                      background: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)',
                      color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(222 47% 11%)',
                      border: `1px solid ${isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)'}`,
                    }}
                    value={col.type}
                    onChange={(e) =>
                      userRole.canEdit && !isLocked && setTables((prev) =>
                        prev.map((x) =>
                          x.id === t.id
                            ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, type: e.target.value } : c)) }
                            : x
                        )
                      )
                    }
                    disabled={isLocked || !userRole.canEdit}
                    onMouseUp={() => pushHistory()}
                  >
                    <option style={{ background: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)', color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(222 47% 11%)' }}>INT</option>
                    <option style={{ background: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)', color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(222 47% 11%)' }}>UUID</option>
                    <option style={{ background: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)', color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(222 47% 11%)' }}>VARCHAR</option>
                    <option style={{ background: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)', color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(222 47% 11%)' }}>TEXT</option>
                    <option style={{ background: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)', color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(222 47% 11%)' }}>BOOL</option>
                  </select>
                </div>
              )}
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

        {/* Feature 5: Sample Data - (Comments section moved under Description) */}

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
            ) : diagramType === 'uml-class' && selectedUmlClassId ? (
              (() => {
                const selectedClass = umlClasses.find(c => c.id === selectedUmlClassId);
                if (!selectedClass) return null;
                return (
                  <UMLClassEditor
                    umlClass={selectedClass}
                    isLocked={effectiveIsLocked}
                    onUpdate={(updates) => {
                      setUmlClasses(prev => prev.map(c => 
                        c.id === selectedUmlClassId ? { ...c, ...updates } : c
                      ));
                    }}
                    onDelete={() => {
                      setUmlClasses(prev => prev.filter(c => c.id !== selectedUmlClassId));
                      setUmlRelations(prev => prev.filter(r => 
                        r.sourceClassId !== selectedUmlClassId && r.targetClassId !== selectedUmlClassId
                      ));
                      setSelectedUmlClassId(null);
                      push({ title: "Class deleted", type: "info" });
                    }}
                  />
                );
              })()
            ) : diagramType === 'flowchart' && selectedFlowchartConnectionId ? (
              (() => {
                const selectedConn = flowchartConnections.find(c => c.id === selectedFlowchartConnectionId);
                if (!selectedConn) return null;
                return (
                  <FlowchartConnectionEditor
                    connection={selectedConn}
                    isLocked={effectiveIsLocked}
                    nodes={flowchartNodes}
                    onUpdate={(updates) => {
                      setFlowchartConnections(prev => prev.map(c => 
                        c.id === selectedFlowchartConnectionId ? { ...c, ...updates } : c
                      ));
                    }}
                    onDelete={() => {
                      setFlowchartConnections(prev => prev.filter(c => c.id !== selectedFlowchartConnectionId));
                      setSelectedFlowchartConnectionId(null);
                      push({ title: "Connection deleted", type: "info" });
                    }}
                  />
                );
              })()
            ) : diagramType === 'flowchart' && selectedFlowchartNodeId ? (
              (() => {
                const selectedNode = flowchartNodes.find(n => n.id === selectedFlowchartNodeId);
                if (!selectedNode) return null;
                return (
                  <FlowchartNodeEditor
                    node={selectedNode}
                    isLocked={effectiveIsLocked}
                    onUpdate={(updates) => {
                      setFlowchartNodes(prev => prev.map(n => 
                        n.id === selectedFlowchartNodeId ? { ...n, ...updates } : n
                      ));
                    }}
                    onDelete={() => {
                      setFlowchartNodes(prev => prev.filter(n => n.id !== selectedFlowchartNodeId));
                      setFlowchartConnections(prev => prev.filter(c => 
                        c.sourceNodeId !== selectedFlowchartNodeId && c.targetNodeId !== selectedFlowchartNodeId
                      ));
                      setSelectedFlowchartNodeId(null);
                      push({ title: "Node deleted", type: "info" });
                    }}
                  />
                );
              })()
            ) : diagramType === 'uml-class' ? (
              <div className={`space-y-5`}>
                <div className={`h-full flex flex-col items-center justify-center text-center select-none transition-colors duration-300 ${isDarkMode ? "text-slate-700" : "text-slate-400"}`}>
                  <MousePointer2 size={40} className="mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">
                    Select a class to edit
                    <br />
                    or add a new one
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    const center = getCanvasCenterWorld();
                    const newClass: UMLClass = {
                      id: generateId(),
                      name: 'NewClass',
                      stereotype: undefined,
                      x: center.x,
                      y: center.y,
                      attributes: [],
                      methods: [],
                    };
                    setUmlClasses(prev => [...prev, newClass]);
                    setSelectedUmlClassId(newClass.id);
                    push({ title: "Class added", type: "success" });
                  }}
                  disabled={effectiveIsLocked}
                  className={`w-full py-3 rounded-lg text-xs font-bold border transition-all duration-200 ${
                    effectiveIsLocked 
                      ? "opacity-50 cursor-not-allowed border-slate-700 text-slate-500"
                      : "bg-indigo-500/10 border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white"
                  }`}
                >
                  + Add UML Class
                </button>

                {/* UML Relation Drawing Tool */}
                <div className="space-y-2">
                  <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Draw Relationship
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['inheritance', 'composition', 'aggregation', 'association'] as UMLRelationType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          setIsDrawingUmlRelation(true);
                          setPendingUmlRelationType(type);
                          setUmlRelationSource(null);
                          push({ title: `Select source class for ${type}`, type: "info" });
                        }}
                        disabled={effectiveIsLocked || umlClasses.length < 2}
                        className={`py-2 px-2 rounded-lg text-[10px] font-medium border transition-all ${
                          isDrawingUmlRelation && pendingUmlRelationType === type
                            ? "bg-indigo-500 text-white border-indigo-500"
                            : isDarkMode
                            ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                            : "border-slate-300 text-slate-600 hover:bg-slate-100"
                        } ${effectiveIsLocked || umlClasses.length < 2 ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                  {isDrawingUmlRelation && (
                    <div className={`text-[10px] p-2 rounded-lg ${isDarkMode ? "bg-indigo-500/10 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                      {umlRelationSource ? "Now click target class" : "Click on source class"}
                      <button
                        onClick={() => {
                          setIsDrawingUmlRelation(false);
                          setUmlRelationSource(null);
                        }}
                        className="ml-2 underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : diagramType === 'flowchart' ? (
              <div className={`space-y-5`}>
                <div className={`h-full flex flex-col items-center justify-center text-center select-none transition-colors duration-300 ${isDarkMode ? "text-slate-700" : "text-slate-400"}`}>
                  <MousePointer2 size={40} className="mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest">
                    Select a node to edit
                    <br />
                    or use the toolbox below
                  </p>
                </div>

                {/* Connection drawing tool */}
                <div className="space-y-2">
                  <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                    Draw Connection
                  </label>
                  <button
                    onClick={() => {
                      setIsDrawingConnection(true);
                      setConnectionSource(null);
                      push({ title: "Click on source node", type: "info" });
                    }}
                    disabled={effectiveIsLocked || flowchartNodes.length < 2}
                    className={`w-full py-2 rounded-lg text-xs font-medium border transition-all ${
                      isDrawingConnection
                        ? "bg-indigo-500 text-white border-indigo-500"
                        : isDarkMode
                        ? "border-slate-700 text-slate-400 hover:bg-slate-800"
                        : "border-slate-300 text-slate-600 hover:bg-slate-100"
                    } ${effectiveIsLocked || flowchartNodes.length < 2 ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isDrawingConnection ? "Drawing..." : "+ Connect Nodes"}
                  </button>
                  {isDrawingConnection && (
                    <div className={`text-[10px] p-2 rounded-lg ${isDarkMode ? "bg-indigo-500/10 text-indigo-300" : "bg-indigo-50 text-indigo-700"}`}>
                      {connectionSource ? "Now click target node" : "Click on source node"}
                      <button
                        onClick={() => {
                          setIsDrawingConnection(false);
                          setConnectionSource(null);
                        }}
                        className="ml-2 underline"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : diagramType === 'sequence' ? (
              // Sequence Diagram Panel
              <SequenceEditor
                participants={sequenceParticipants}
                messages={sequenceMessages}
                selectedParticipantId={selectedParticipantId}
                selectedMessageId={selectedMessageId}
                isLocked={effectiveIsLocked}
                isDarkMode={isDarkMode}
                onAddParticipant={(type) => {
                  const newParticipant: SequenceParticipant = {
                    id: generateId(),
                    name: type === 'actor' ? 'Actor' : type.charAt(0).toUpperCase() + type.slice(1),
                    type,
                    x: 100 + sequenceParticipants.length * 150,
                  };
                  setSequenceParticipants(prev => [...prev, newParticipant]);
                  setSelectedParticipantId(newParticipant.id);
                  push({ title: "Participant added", type: "success" });
                }}
                onUpdateParticipant={(id, updates) => {
                  setSequenceParticipants(prev => prev.map(p => 
                    p.id === id ? { ...p, ...updates } : p
                  ));
                }}
                onDeleteParticipant={(id) => {
                  setSequenceParticipants(prev => prev.filter(p => p.id !== id));
                  setSequenceMessages(prev => prev.filter(m => m.fromId !== id && m.toId !== id));
                  setSelectedParticipantId(null);
                  push({ title: "Participant deleted", type: "info" });
                }}
                onAddMessage={(fromId, toId, label, type) => {
                  const newMessage: SequenceMessage = {
                    id: generateId(),
                    fromId,
                    toId,
                    label,
                    type,
                    order: sequenceMessages.length,
                  };
                  setSequenceMessages(prev => [...prev, newMessage]);
                  push({ title: "Message added", type: "success" });
                }}
                onUpdateMessage={(id, updates) => {
                  setSequenceMessages(prev => prev.map(m => 
                    m.id === id ? { ...m, ...updates } : m
                  ));
                }}
                onDeleteMessage={(id) => {
                  setSequenceMessages(prev => prev.filter(m => m.id !== id));
                  setSelectedMessageId(null);
                  push({ title: "Message deleted", type: "info" });
                }}
              />
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
        </ResizablePanel>
      </div>

      {/* Minimap with collapse support - updates based on diagram type */}
      <Minimap
        tables={tables}
        umlClasses={umlClasses}
        flowchartNodes={flowchartNodes}
        diagramType={diagramType}
        viewport={viewport}
        canvasWidth={typeof window !== 'undefined' ? window.innerWidth - 380 : 1000}
        canvasHeight={typeof window !== 'undefined' ? window.innerHeight - 60 : 800}
        onViewportChange={(x, y) => setViewport((prev) => ({ ...prev, x, y }))}
        isDarkMode={isDarkMode}
        onCollapse={setIsMinimapCollapsed}
      />

      {/* Keyboard Shortcuts Overlay */}
      <KeyboardShortcutsOverlay
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
        isDarkMode={isDarkMode}
      />

      {/* Designer Sidebar Popup Modal */}
      {_isSidebarPopup && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) _setIsSidebarPopup(false);
          }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Modal */}
          <div 
            className={`relative w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in ${
              isDarkMode ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"
            }`}
          >
            {/* Modal Header */}
            <div className={`p-4 border-b flex items-center justify-between flex-shrink-0 ${
              isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"
            }`}>
              <h2 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                <Settings size={18} className="text-indigo-500" /> Designer Panel
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold opacity-40 uppercase">Saved</span>
                <span className="text-[10px] font-mono text-indigo-400">{lastSaved || "..."}</span>
                <button
                  onClick={() => _setIsSidebarPopup(false)}
                  className={`p-2 rounded-lg transition-colors ${
                    isDarkMode ? "hover:bg-slate-700 text-slate-400 hover:text-slate-200" : "hover:bg-slate-200 text-slate-500 hover:text-slate-700"
                  }`}
                  title="Close popup"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedTableId ? (
                (() => {
                  const t = tables.find((x) => x.id === selectedTableId)!;
                  if (!t) return <div className={`text-center py-8 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>Table not found</div>;
                  
                  return (
                    <div className="space-y-6">
                      {/* Table Name */}
                      <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          Table name
                        </label>
                        <input
                          className={`w-full rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-indigo-500 outline-none border transition-all ${
                            isDarkMode
                              ? "bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500"
                              : "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-400"
                          } ${(effectiveIsLocked || !userRole.canEdit) ? "opacity-60 cursor-not-allowed" : ""}`}
                          value={t.name}
                          onChange={(e) => userRole.canEdit && !effectiveIsLocked && setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
                          onBlur={() => pushHistory()}
                          disabled={effectiveIsLocked || !userRole.canEdit}
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                          Description
                        </label>
                        <textarea
                          className={`w-full rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none border transition-all resize-none ${
                            isDarkMode
                              ? "bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500"
                              : "bg-slate-50 border-slate-300 text-slate-900 focus:border-indigo-400"
                          } ${(effectiveIsLocked || !userRole.canEdit) ? "opacity-60 cursor-not-allowed" : ""}`}
                          rows={3}
                          placeholder="Add notes about this table..."
                          value={t.description || ""}
                          onChange={(e) => userRole.canEdit && !effectiveIsLocked && setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, description: e.target.value } : x)))}
                          onBlur={() => pushHistory()}
                          disabled={effectiveIsLocked || !userRole.canEdit}
                        />
                      </div>

                      {/* Two Column Layout for Color and Columns */}
                      <div className="grid grid-cols-2 gap-6">
                        {/* Color */}
                        {userRole.canEdit && (
                          <div className="space-y-2">
                            <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                              Color
                            </label>
                            <ColorPicker
                              color={t.color || "#64748b"}
                              onChange={(newColor) => {
                                if (!effectiveIsLocked && userRole.canEdit) {
                                  setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, color: newColor } : x)));
                                }
                              }}
                              onBlur={() => pushHistory()}
                              disabled={effectiveIsLocked || !userRole.canEdit}
                              isDarkMode={isDarkMode}
                            />
                          </div>
                        )}

                        {/* Columns */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                              Columns ({t.columns.length})
                            </label>
                          </div>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {t.columns.map((col) => (
                              <div
                                key={col.id}
                                className={`p-2 rounded-lg border ${
                                  isDarkMode ? "bg-slate-950 border-slate-700" : "bg-slate-50 border-slate-200"
                                }`}
                              >
                                <div className={`font-bold text-xs ${isDarkMode ? "text-slate-200" : "text-slate-800"}`}>
                                  {col.name}
                                </div>
                                <div className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-slate-500"}`}>
                                  {col.type} {col.isPk && "• PK"} {col.isFk && "• FK"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Metadata Sections Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Comments */}
                        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={14} className="text-indigo-500" />
                            <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                              Comments ({selectedTableComments.length})
                            </label>
                          </div>
                          {selectedTableComments.length > 0 ? (
                            <div className="space-y-2 max-h-32 overflow-y-auto">
                              {selectedTableComments.slice(0, 3).map((comment: TableComment) => (
                                <div key={comment.id} className={`p-2 rounded-lg text-xs ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
                                  <span className="font-bold text-indigo-400">{comment.author_email?.split('@')[0]}:</span> {comment.content}
                                </div>
                              ))}
                              {selectedTableComments.length > 3 && (
                                <div className={`text-[10px] ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>+{selectedTableComments.length - 3} more</div>
                              )}
                            </div>
                          ) : (
                            <div className={`text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No comments</div>
                          )}
                          {userRole.canAddMetadata && (
                            <input
                              type="text"
                              placeholder="Add comment..."
                              className={`w-full mt-2 px-2 py-1.5 rounded text-xs border outline-none ${
                                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                              }`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                  handleAddComment((e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                          )}
                        </div>

                        {/* Notes */}
                        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <StickyNote size={14} className="text-amber-500" />
                            <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                              Notes ({((t as any).notes || []).length})
                            </label>
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {((t as any).notes || []).slice(0, 3).map((note: any) => (
                              <div key={note.id} className={`p-2 rounded-lg text-xs ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
                                {note.content}
                              </div>
                            ))}
                            {((t as any).notes || []).length === 0 && (
                              <div className={`text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No notes</div>
                            )}
                          </div>
                          {userRole.canAddMetadata && (
                            <input
                              type="text"
                              placeholder="Add note..."
                              className={`w-full mt-2 px-2 py-1.5 rounded text-xs border outline-none ${
                                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                              }`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                  const note = { id: generateId(), content: (e.target as HTMLInputElement).value.trim(), author_id: user.id, author_email: user.email || '', created_at: new Date().toISOString() };
                                  setTables(prev => prev.map(x => x.id === t.id ? { ...x, notes: [...((x as any).notes || []), note] } as any : x));
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                          )}
                        </div>

                        {/* Questions */}
                        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <HelpCircle size={14} className="text-cyan-500" />
                            <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                              Questions ({((t as any).questions || []).length})
                            </label>
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {((t as any).questions || []).slice(0, 3).map((q: any) => (
                              <div key={q.id} className={`p-2 rounded-lg text-xs ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
                                {q.content}
                              </div>
                            ))}
                            {((t as any).questions || []).length === 0 && (
                              <div className={`text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No questions</div>
                            )}
                          </div>
                          {userRole.canAddMetadata && (
                            <input
                              type="text"
                              placeholder="Add question..."
                              className={`w-full mt-2 px-2 py-1.5 rounded text-xs border outline-none ${
                                isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                              }`}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                  const question = { id: generateId(), content: (e.target as HTMLInputElement).value.trim(), author_id: user.id, author_email: user.email || '', created_at: new Date().toISOString() };
                                  setTables(prev => prev.map(x => x.id === t.id ? { ...x, questions: [...((x as any).questions || []), question] } as any : x));
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                          )}
                        </div>

                        {/* Fixes */}
                        <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <Wrench size={14} className="text-emerald-500" />
                            <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                              Fixes ({((t as any).fixes || []).length})
                            </label>
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {((t as any).fixes || []).slice(0, 3).map((fix: any) => (
                              <div key={fix.id} className={`p-2 rounded-lg text-xs flex items-center gap-2 ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
                                {userRole.canAddMetadata ? (
                                  <select
                                    value={fix.priority || 'medium'}
                                    onChange={(e) => {
                                      const newPriority = e.target.value as 'low' | 'medium' | 'high';
                                      setTables(prev => prev.map(x => x.id === t.id ? {
                                        ...x,
                                        fixes: ((x as any).fixes || []).map((f: any) => f.id === fix.id ? { ...f, priority: newPriority } : f)
                                      } as any : x));
                                    }}
                                    className={`px-1 py-0.5 rounded text-[9px] font-bold border-none outline-none cursor-pointer ${
                                      fix.priority === 'high' ? 'bg-red-500/20 text-red-400' : fix.priority === 'low' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                    }`}
                                    style={{ 
                                      background: fix.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : fix.priority === 'low' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                    }}
                                  >
                                    <option value="low" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', color: isDarkMode ? '#4ade80' : '#16a34a' }}>low</option>
                                    <option value="medium" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', color: isDarkMode ? '#fbbf24' : '#d97706' }}>medium</option>
                                    <option value="high" style={{ backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', color: isDarkMode ? '#f87171' : '#dc2626' }}>high</option>
                                  </select>
                                ) : (
                                  <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                                    fix.priority === 'high' ? 'bg-red-500/20 text-red-400' : fix.priority === 'low' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'
                                  }`}>{fix.priority || 'medium'}</span>
                                )}
                                <span className="flex-1">{fix.content}</span>
                              </div>
                            ))}
                            {((t as any).fixes || []).length === 0 && (
                              <div className={`text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No fixes</div>
                            )}
                          </div>
                          {userRole.canAddMetadata && (
                            <div className="flex gap-2 mt-2">
                              <input
                                type="text"
                                id="modal-fix-input"
                                placeholder="Add fix..."
                                className={`flex-1 px-2 py-1.5 rounded text-xs border outline-none ${
                                  isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                                }`}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                    const prioritySelect = document.getElementById('modal-fix-priority') as HTMLSelectElement;
                                    const priority = prioritySelect?.value || 'medium';
                                    const fix = { id: generateId(), content: (e.target as HTMLInputElement).value.trim(), author_id: user.id, author_email: user.email || '', created_at: new Date().toISOString(), priority };
                                    setTables(prev => prev.map(x => x.id === t.id ? { ...x, fixes: [...((x as any).fixes || []), fix] } as any : x));
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }}
                              />
                              <select
                                id="modal-fix-priority"
                                defaultValue="medium"
                                className={`px-2 py-1.5 rounded text-xs border outline-none ${
                                  isDarkMode ? "bg-slate-900 border-slate-700 text-slate-200" : "bg-white border-slate-300 text-slate-800"
                                }`}
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Relationships */}
                      <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <LinkIcon size={14} className="text-indigo-500" />
                          <label className={`text-xs font-bold uppercase ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                            Relationships ({relations.filter(r => r.sourceTableId === t.id || r.targetTableId === t.id).length})
                          </label>
                        </div>
                        <div className="space-y-2">
                          {relations.filter(r => r.sourceTableId === t.id || r.targetTableId === t.id).map((rel) => {
                            const isSource = rel.sourceTableId === t.id;
                            const otherTable = tables.find(x => x.id === (isSource ? rel.targetTableId : rel.sourceTableId));
                            return (
                              <div key={rel.id} className={`flex items-center justify-between p-2 rounded-lg ${isDarkMode ? "bg-slate-900" : "bg-white"}`}>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-mono ${isDarkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                                    {isSource ? "→" : "←"} {otherTable?.name || "Unknown"}
                                  </span>
                                  {rel.label && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDarkMode ? "bg-slate-800 text-slate-400" : "bg-slate-200 text-slate-600"}`}>
                                      {rel.label}
                                    </span>
                                  )}
                                </div>
                                <span className={`text-[9px] uppercase ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                                  {rel.lineType} {rel.isDashed && "• dashed"}
                                </span>
                              </div>
                            );
                          })}
                          {relations.filter(r => r.sourceTableId === t.id || r.targetTableId === t.id).length === 0 && (
                            <div className={`text-xs ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>No relationships</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : selectedEdgeId ? (
                <div className={`text-center py-8 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                  Edge editing - use the sidebar for edge controls
                </div>
              ) : (
                <div className={`text-center py-12 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                  <MousePointer2 size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-sm font-bold uppercase tracking-widest">
                    Select a table to view details
                  </p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className={`p-4 border-t flex items-center justify-end gap-3 flex-shrink-0 ${
              isDarkMode ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"
            }`}>
              <button
                onClick={() => _setIsSidebarPopup(false)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isDarkMode 
                    ? "bg-slate-700 hover:bg-slate-600 text-slate-200" 
                    : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 flex flex-col gap-2 z-[60]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-2 rounded-lg shadow-lg backdrop-blur-md border text-sm animate-fade-in transition-all ${
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
    fetchDiagrams,
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
        onCreate={async (diagramType, diagramName) => {
          const name = diagramName || 'New Diagram';
          const type = diagramType || 'erd';
          const newDiagram = await createDiagram(name, type);
          if (newDiagram) {
            setSelectedDiagram(newDiagram);
            setShowSelector(false);
          }
        }}
        onDelete={async (id) => {
          await deleteDiagram(id);
        }}
        onRename={async (id, name) => {
          await saveDiagram(id, { name } as any);
          // Refresh diagrams
          if (teamId) {
            fetchDiagrams(teamId);
          }
        }}
        onLogout={handleLogout}
        onTeamSwitch={(newTeamId) => {
          // Team switch handled by refresh in DiagramSelector
          console.log('Switching to team:', newTeamId);
        }}
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
      teamId={teamId}
    />
  );
}
