// import React, { useState, useRef, useEffect, useMemo } from "react";
// import {
//   Plus,
//   X,
//   Save,
//   Database,
//   GripHorizontal,
//   Key,
//   Link as LinkIcon,
//   Settings,
//   Download,
//   Sun,
//   Moon,
//   MousePointer2,
//   Upload,
//   CheckCircle2,
//   Maximize,
//   LogOut,
//   ChevronRight,
//   ChevronLeft,
// } from "lucide-react";
// import html2canvas from "html2canvas";

// /** --- TYPES --- **/
// type Column = { id: string; name: string; type: string; isPk: boolean; isFk: boolean };
// type Table = { id: string; name: string; x: number; y: number; columns: Column[]; color?: string };

// type Relation = {
//   id: string;
//   sourceTableId: string;
//   targetTableId: string;
//   label?: string;
//   isDashed: boolean;
//   lineType: "curved" | "straight";
//   bend?: { x: number; y: number };
// };

// declare global {
//   interface Window {
//     netlifyIdentity?: any;
//   }
// }

// type NetlifyUser = {
//   email: string;
//   [key: string]: any;
// };

// const generateId = () => Math.random().toString(36).substr(2, 9);

// const TABLE_W = 224;
// const HEADER_H = 40;
// const ANCHOR_X = TABLE_W / 2;
// const ANCHOR_Y = 20;

// function clamp(n: number, min: number, max: number) {
//   return Math.min(Math.max(n, min), max);
// }

// function LoginScreen() {
//   return (
//     <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 to-slate-900">
//       <div className="text-center space-y-6">
//         <div className="flex justify-center mb-4">
//           <Database size={48} className="text-indigo-500" />
//         </div>
//         <h1 className="text-3xl font-bold text-white">ERD Builder</h1>
//         <p className="text-slate-400 text-sm">Sign in to access your diagrams</p>
//         <button
//           onClick={() => window.netlifyIdentity?.open()}
//           className="px-6 py-3 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20"
//         >
//           Sign in with Netlify Identity
//         </button>
//       </div>
//     </div>
//   );
// }

// function ERDBuilder({ user }: { user: NetlifyUser }) {
//   // --- STATE ---
//   const [tables, setTables] = useState<Table[]>([]);
//   const [relations, setRelations] = useState<Relation[]>([]);
//   const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
//   const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
//   const [isDarkMode, setIsDarkMode] = useState(true);
//   const [lastSaved, setLastSaved] = useState<string>("");
//   const [isSaving, setIsSaving] = useState(false);

//   const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
//   const [isPanning, setIsPanning] = useState(false);

//   const [isDragging, setIsDragging] = useState(false);
//   const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
//   const [draggedTableId, setDraggedTableId] = useState<string | null>(null);

//   const [multiSelectedTableIds, setMultiSelectedTableIds] = useState<Set<string>>(new Set());

//   const [isLassoing, setIsLassoing] = useState(false);
//   const [lassoStart, setLassoStart] = useState<{ x: number; y: number } | null>(null);
//   const [lassoRect, setLassoRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

//   const [isDraggingEdge, setIsDraggingEdge] = useState(false);
//   const [draggedEdgeId, setDraggedEdgeId] = useState<string | null>(null);
//   const [edgeDragStart, setEdgeDragStart] = useState<{ x: number; y: number } | null>(null);
//   const [edgeDragStartBend, setEdgeDragStartBend] = useState<{ x: number; y: number } | null>(null);

//   const canvasRef = useRef<HTMLDivElement>(null);

//   const toWorld = (clientX: number, clientY: number) => {
//     if (!canvasRef.current) return { x: 0, y: 0 };
//     const rect = canvasRef.current.getBoundingClientRect();
//     const x = (clientX - rect.left - viewport.x) / viewport.zoom;
//     const y = (clientY - rect.top - viewport.y) / viewport.zoom;
//     return { x, y };
//   };
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [connectTableSearch, setConnectTableSearch] = useState<string>("");
//   const [showCommandTips, setShowCommandTips] = useState(false);

//   // --- PERSISTENCE (LOAD & AUTO-SAVE) ---
//   const isInitialLoad = useRef(true);

//   useEffect(() => {
//     const saved = localStorage.getItem("erd-data");
//     if (saved && isInitialLoad.current) {
//       isInitialLoad.current = false;
//       try {
//         const { t, r, dark, time } = JSON.parse(saved);
//         setTables(t || []);
//         setRelations(r || []);
//         setIsDarkMode(dark ?? true);
//         setLastSaved(time || "Never");
//       } catch (e) {
//         console.error("Failed to load data", e);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     if (tables.length === 0 && relations.length === 0) return;
    
//     const timeout = setTimeout(() => {
//       setIsSaving(true);
//       const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
//       localStorage.setItem(
//         "erd-data",
//         JSON.stringify({
//           t: tables,
//           r: relations,
//           dark: isDarkMode,
//           time: now,
//         })
//       );
//       setLastSaved(now);
//       setIsSaving(false);
//     }, 800);
//     return () => clearTimeout(timeout);
//   }, [tables, relations, isDarkMode]);

//   const handleWheel = (e: React.WheelEvent) => {
//     const zoomSpeed = 0.001;
//     const minZoom = 0.2;
//     const maxZoom = 3;
//     const delta = -e.deltaY * zoomSpeed;
//     const newZoom = clamp(viewport.zoom + delta, minZoom, maxZoom);
//     setViewport((prev) => ({ ...prev, zoom: newZoom }));
//   };

//   const resetViewport = () => {
//     setViewport({ x: 0, y: 0, zoom: 0.5 });
//   };

//   const activeSelectedTableIds = useMemo(() => {
//     if (multiSelectedTableIds.size > 0) return new Set(multiSelectedTableIds);
//     if (selectedTableId) return new Set([selectedTableId]);
//     return new Set<string>();
//   }, [multiSelectedTableIds, selectedTableId]);

//   const connected = useMemo(() => {
//     const selectedTables = activeSelectedTableIds;
//     const connectedTableIds = new Set<string>();
//     const connectedEdgeIds = new Set<string>();

//     if (selectedTables.size === 0) return { connectedTableIds, connectedEdgeIds };

//     for (const r of relations) {
//       const sSel = selectedTables.has(r.sourceTableId);
//       const tSel = selectedTables.has(r.targetTableId);

//       if (sSel || tSel) {
//         connectedEdgeIds.add(r.id);
//         connectedTableIds.add(r.sourceTableId);
//         connectedTableIds.add(r.targetTableId);
//       }
//     }

//     return { connectedTableIds, connectedEdgeIds };
//   }, [relations, activeSelectedTableIds]);

//   const isTablePrimarySelected = (id: string) => activeSelectedTableIds.has(id);
//   const isTableConnected = (id: string) => connected.connectedTableIds.has(id);
//   const isEdgeConnected = (id: string) => connected.connectedEdgeIds.has(id);

//   const handleTableMouseDown = (e: React.MouseEvent, tableId: string) => {
//     if (e.button !== 0) return;
//     e.stopPropagation();

//     const table = tables.find((t) => t.id === tableId);
//     if (!table || !canvasRef.current) return;

//     if (!e.shiftKey) {
//       if (!multiSelectedTableIds.has(tableId)) {
//         setMultiSelectedTableIds(new Set([tableId]));
//       }
//       setSelectedTableId(tableId);
//       setConnectTableSearch("");
//     } else {
//       setMultiSelectedTableIds((prev) => {
//         const next = new Set(prev);
//         if (next.has(tableId)) next.delete(tableId);
//         else next.add(tableId);
//         return next;
//       });
//       setSelectedTableId(tableId);
//       setConnectTableSearch("");
//     }

//     setSelectedEdgeId(null);

//     const world = toWorld(e.clientX, e.clientY);
//     setDragOffset({
//       x: world.x - table.x,
//       y: world.y - table.y,
//     });

//     setDraggedTableId(tableId);
//     setIsDragging(true);
//   };

//   const handleEdgeClick = (e: React.MouseEvent, edgeId: string) => {
//     e.stopPropagation();
//     setSelectedEdgeId(edgeId);
//     setSelectedTableId(null);
//     setMultiSelectedTableIds(new Set());
//   };

//   const handleEdgeHandleMouseDown = (e: React.MouseEvent, edgeId: string) => {
//     if (e.button !== 0) return;
//     e.stopPropagation();
//     const r = relations.find((x) => x.id === edgeId);
//     if (!r) return;

//     setSelectedEdgeId(edgeId);
//     setSelectedTableId(null);
//     setMultiSelectedTableIds(new Set());

//     setIsDraggingEdge(true);
//     setDraggedEdgeId(edgeId);

//     const world = toWorld(e.clientX, e.clientY);
//     setEdgeDragStart(world);

//     const currentBend = r.bend ?? { x: 0, y: 0 };
//     setEdgeDragStartBend(currentBend);
//   };

//   const handleCanvasMouseDown = (e: React.MouseEvent) => {
//     if (e.button === 2) {
//       e.preventDefault();
//       setIsPanning(true);
//       setDragOffset({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
//       return;
//     }

//     if (e.button === 0) {
//       if (e.target === e.currentTarget) {
//         const world = toWorld(e.clientX, e.clientY);
//         setIsLassoing(true);
//         setLassoStart(world);
//         setLassoRect({ x: world.x, y: world.y, w: 0, h: 0 });

//         setSelectedEdgeId(null);
//         if (!e.shiftKey) {
//           setSelectedTableId(null);
//           setMultiSelectedTableIds(new Set());
//         }
//       }
//     }
//   };

//   const handleMouseMove = (e: React.MouseEvent) => {
//     if (isPanning) {
//       setViewport((prev) => ({
//         ...prev,
//         x: e.clientX - dragOffset.x,
//         y: e.clientY - dragOffset.y,
//       }));
//       return;
//     }

//     if (isDraggingEdge && draggedEdgeId && edgeDragStart && edgeDragStartBend) {
//       const world = toWorld(e.clientX, e.clientY);
//       const dx = world.x - edgeDragStart.x;
//       const dy = world.y - edgeDragStart.y;

//       setRelations((prev) =>
//         prev.map((r) =>
//           r.id === draggedEdgeId
//             ? {
//                 ...r,
//                 bend: {
//                   x: edgeDragStartBend.x + dx,
//                   y: edgeDragStartBend.y + dy,
//                 },
//               }
//             : r
//         )
//       );
//       return;
//     }

//     if (isDragging && draggedTableId) {
//       const world = toWorld(e.clientX, e.clientY);
//       const anchorTable = tables.find((t) => t.id === draggedTableId);
//       if (!anchorTable) return;

//       const newX = world.x - dragOffset.x;
//       const newY = world.y - dragOffset.y;

//       const selectedIds = multiSelectedTableIds.size > 0 ? multiSelectedTableIds : new Set([draggedTableId]);

//       const dx = newX - anchorTable.x;
//       const dy = newY - anchorTable.y;

//       setTables((prev) =>
//         prev.map((t) => {
//           if (!selectedIds.has(t.id)) return t;
//           return { ...t, x: t.x + dx, y: t.y + dy };
//         })
//       );
//       return;
//     }

//     if (isLassoing && lassoStart) {
//       const world = toWorld(e.clientX, e.clientY);
//       const x1 = lassoStart.x;
//       const y1 = lassoStart.y;
//       const x2 = world.x;
//       const y2 = world.y;

//       const rx = Math.min(x1, x2);
//       const ry = Math.min(y1, y2);
//       const rw = Math.abs(x2 - x1);
//       const rh = Math.abs(y2 - y1);

//       setLassoRect({ x: rx, y: ry, w: rw, h: rh });
//     }
//   };

//   const finalizeLassoSelection = (shiftKey: boolean) => {
//     if (!lassoRect) return;

//     const { x, y, w, h } = lassoRect;
//     const rectRight = x + w;
//     const rectBottom = y + h;

//     const hits = new Set<string>();
//     for (const t of tables) {
//       const tLeft = t.x;
//       const tTop = t.y;
//       const tRight = t.x + TABLE_W;
//       const tBottom = t.y + HEADER_H + 20 + t.columns.length * 16;

//       const intersects = !(tRight < x || tLeft > rectRight || tBottom < y || tTop > rectBottom);

//       if (intersects) hits.add(t.id);
//     }

//     setMultiSelectedTableIds((prev) => {
//       if (shiftKey) {
//         const next = new Set(prev);
//         for (const id of hits) next.add(id);
//         return next;
//       }
//       return hits;
//     });

//     const first = Array.from(hits)[0];
//     setSelectedTableId(first ?? null);
//     setSelectedEdgeId(null);
//   };

//   const handleMouseUp = (e?: React.MouseEvent) => {
//     setIsDragging(false);
//     setIsPanning(false);

//     if (isDraggingEdge) {
//       setIsDraggingEdge(false);
//       setDraggedEdgeId(null);
//       setEdgeDragStart(null);
//       setEdgeDragStartBend(null);
//     }

//     if (isLassoing) {
//       setIsLassoing(false);
//       setLassoStart(null);
//       finalizeLassoSelection(!!e?.shiftKey);
//       setLassoRect(null);
//     }

//     setDraggedTableId(null);
//   };

//   const addTable = () => {
//     const newTable: Table = {
//       id: generateId(),
//       name: "New_Table",
//       x: (window.innerWidth / 2 - viewport.x) / viewport.zoom,
//       y: (window.innerHeight / 2 - viewport.y) / viewport.zoom,
//       columns: [{ id: generateId(), name: "id", type: "INT", isPk: true, isFk: false }],
//     };
//     setTables([...tables, newTable]);
//     setSelectedTableId(newTable.id);
//     setSelectedEdgeId(null);
//     setMultiSelectedTableIds(new Set([newTable.id]));
//   };

//   const toggleRelation = (sourceId: string, targetId: string) => {
//     if (sourceId === targetId) return;
//     const existing = relations.find((r) => r.sourceTableId === sourceId && r.targetTableId === targetId);
    
//     if (existing) {
//       // Remove relation if it exists
//       setRelations(relations.filter((r) => r.id !== existing.id));
//     } else {
//       // Add relation if it doesn't exist
//       setRelations([
//         ...relations,
//         {
//           id: generateId(),
//           sourceTableId: sourceId,
//           targetTableId: targetId,
//           isDashed: false,
//           lineType: "curved",
//           bend: { x: 0, y: 0 },
//         },
//       ]);
//     }
//   };

//   const exportJSON = () => {
//     const data = JSON.stringify({ tables, relations });
//     const blob = new Blob([data], { type: "application/json" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = `schema-backup-${new Date().toISOString().slice(0, 10)}.json`;
//     link.click();
//   };

//   const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = (evt) => {
//       try {
//         const { tables: t, relations: r } = JSON.parse(evt.target?.result as string);
//         setTables(t);
//         setRelations(
//           (r as Relation[]).map((x) => ({
//             ...x,
//             bend: x.bend ?? { x: 0, y: 0 },
//           }))
//         );
//         setSelectedTableId(null);
//         setSelectedEdgeId(null);
//         setMultiSelectedTableIds(new Set());
//       } catch {
//         alert("Invalid JSON file");
//       }
//     };
//     reader.readAsText(file);
//   };

//   const exportPNG = async () => {
//     if (!canvasRef.current) return;
//     const canvas = await html2canvas(canvasRef.current, {
//       backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
//       scale: 2,
//     });
//     const link = document.createElement("a");
//     link.download = "erd-diagram.png";
//     link.href = canvas.toDataURL();
//     link.click();
//   };

//   const getAnchors = (r: Relation) => {
//     const s = tables.find((t) => t.id === r.sourceTableId);
//     const t = tables.find((t) => t.id === r.targetTableId);
//     if (!s || !t) return null;

//     const sx = s.x + ANCHOR_X;
//     const sy = s.y + ANCHOR_Y;
//     const tx = t.x + ANCHOR_X;
//     const ty = t.y + ANCHOR_Y;

//     const mx = (sx + tx) / 2;
//     const my = (sy + ty) / 2;
//     const bend = r.bend ?? { x: 0, y: 0 };
//     const cx = mx + bend.x;
//     const cy = my + bend.y;

//     return { sx, sy, tx, ty, cx, cy, mx, my };
//   };

//   const getPath = (r: Relation) => {
//     const a = getAnchors(r);
//     if (!a) return "";

//     const { sx, sy, tx, ty, cx, cy } = a;

//     if (r.lineType === "straight") {
//       return `M ${sx} ${sy} L ${cx} ${cy} L ${tx} ${ty}`;
//     }

//     return `M ${sx} ${sy} Q ${cx} ${cy} ${tx} ${ty}`;
//   };

//   const getLabelPos = (r: Relation) => {
//     const a = getAnchors(r);
//     if (!a) return null;

//     const { sx, sy, tx, ty, cx, cy } = a;
//     const t = 0.5;
//     const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx;
//     const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ty;
//     return { x, y };
//   };

//   const clearAllSelections = () => {
//     setSelectedTableId(null);
//     setSelectedEdgeId(null);
//     setMultiSelectedTableIds(new Set());
//   };

//   const edgeStroke = (r: Relation) => {
//     const isSelected = selectedEdgeId === r.id;
//     const connectedEdge = isEdgeConnected(r.id);
//     const anySelection = activeSelectedTableIds.size > 0 || !!selectedEdgeId;

//     if (isSelected) return "#6366f1";
//     if (connectedEdge && anySelection) return "#a5b4fc";
//     return isDarkMode ? "#475569" : "#94a3b8";
//   };

//   const edgeWidth = (r: Relation) => {
//     const isSelected = selectedEdgeId === r.id;
//     const connectedEdge = isEdgeConnected(r.id);
//     if (isSelected) return 3.5;
//     if (connectedEdge && (activeSelectedTableIds.size > 0 || !!selectedEdgeId)) return 3;
//     return 2;
//   };

//   const labelFill = (r: Relation) => {
//     const isSelected = selectedEdgeId === r.id;
//     const connectedEdge = isEdgeConnected(r.id);
//     if (isSelected) return isDarkMode ? "#e0e7ff" : "#1e1b4b";
//     if (connectedEdge && activeSelectedTableIds.size > 0) return isDarkMode ? "#c7d2fe" : "#312e81";
//     return isDarkMode ? "#94a3b8" : "#475569";
//   };

//   return (
//     <div className={`flex h-screen overflow-hidden flex-col ${isDarkMode ? "bg-slate-950 text-slate-50" : "bg-white text-slate-900"}`}>
//       {/* Header with logout */}
//       <div
//         className={`z-50 flex items-center justify-between px-4 py-3 border-b ${
//           isDarkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
//         }`}
//       >
//         <div className="flex items-center gap-2">
//           <Database size={24} className="text-indigo-500" />
//           <h1 className="text-xl font-bold">ERD Builder</h1>
//         </div>
//         <div className="flex items-center gap-4">
//           <span className="text-xs opacity-60">{user.email}</span>
//           <button
//             onClick={() => window.netlifyIdentity?.logout()}
//             className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-semibold"
//           >
//             <LogOut size={16} />
//             Logout
//           </button>
//         </div>
//       </div>

//       {/* Main content */}
//       <div className="flex flex-1 overflow-hidden">
//         {/* SIDEBAR TOOLBAR */}
//         <div
//           className={`w-16 border-r flex flex-col items-center py-4 space-y-3 shadow-sm z-30 transition-colors duration-300 ${
//             isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
//           }`}
//         >
//           <div className="p-2 bg-indigo-600 rounded-xl text-white mb-1 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-shadow duration-300">
//             <Database size={24} />
//           </div>

//           <button
//             onClick={addTable}
//             title="Add Table"
//             className="p-2.5 hover:bg-indigo-500/15 rounded-xl text-indigo-500 transition-all duration-200 active:scale-95 hover:scale-110"
//           >
//             <Plus size={22} />
//           </button>

//           <button
//             onClick={resetViewport}
//             title="Reset Zoom"
//             className="p-2.5 hover:bg-slate-500/15 rounded-xl text-slate-500 transition-all duration-200 active:scale-95 hover:scale-110"
//           >
//             <Maximize size={20} />
//           </button>

//           <button
//             onClick={() => setIsDarkMode(!isDarkMode)}
//             title="Toggle Theme"
//             className="p-2.5 hover:bg-amber-500/15 rounded-xl text-amber-500 transition-all duration-200 active:scale-95 hover:scale-110"
//           >
//             {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
//           </button>

//           <div className={`border-t w-8 my-2 transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-slate-300"}`}></div>

//           <button onClick={exportJSON} title="Download JSON Backup" className="p-2.5 hover:bg-emerald-500/15 rounded-xl text-emerald-500 transition-all duration-200 active:scale-95 hover:scale-110">
//             <Save size={20} />
//           </button>

//           <label className="p-2.5 hover:bg-blue-500/15 rounded-xl text-blue-500 cursor-pointer transition-all duration-200 active:scale-95 hover:scale-110 inline-block" title="Import Schema">
//             <Upload size={20} />
//             <input type="file" className="hidden" onChange={importJSON} accept=".json" />
//           </label>

//           <button onClick={exportPNG} title="Export PNG Image" className="p-2.5 hover:bg-purple-500/15 rounded-xl text-purple-500 transition-all duration-200 active:scale-95 hover:scale-110">
//             <Download size={20} />
//           </button>

//           <div className="flex-1" />

//           <button
//             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//             title={isSidebarOpen ? "Collapse Designer Panel" : "Open Designer Panel"}
//             className="p-2.5 hover:bg-slate-700/40 rounded-xl text-slate-400 hover:text-slate-200 transition-all duration-200 active:scale-95 hover:scale-110"
//           >
//             <ChevronLeft size={20} />
//           </button>

//           <div className="flex flex-col items-center gap-1 mb-2">
//             <div className={`transition-all duration-500 ${isSaving ? "text-indigo-500 animate-pulse" : isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
//               <CheckCircle2 size={16} />
//             </div>
//             <span
//               className={`text-[8px] font-bold uppercase vertical-text tracking-widest leading-none transition-colors duration-300 ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}
//               style={{ writingMode: "vertical-rl" }}
//             >
//               {isSaving ? "Saving..." : "Autosave ON"}
//             </span>
//           </div>
//         </div>

//         {/* CANVAS */}
//         <div
//           ref={canvasRef}
//           className="relative flex-1 overflow-hidden cursor-crosshair user-select-none"
//           onWheel={handleWheel}
//           onMouseDown={handleCanvasMouseDown}
//           onMouseMove={handleMouseMove}
//           onMouseUp={(e) => handleMouseUp(e)}
//           onMouseLeave={() => handleMouseUp()}
//           onContextMenu={(e) => e.preventDefault()}
//           onClick={(e) => {
//             if (e.target === e.currentTarget) clearAllSelections();
//           }}
//           style={{
//             backgroundImage: isDarkMode ? "radial-gradient(#1e293b 1px, transparent 1px)" : "radial-gradient(#cbd5e1 1px, transparent 1px)",
//             backgroundSize: `${30 * viewport.zoom}px ${30 * viewport.zoom}px`,
//             backgroundPosition: `${viewport.x}px ${viewport.y}px`,
//           }}
//         >
//           <div
//             style={{
//               transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
//               transformOrigin: "0 0",
//               transition: isPanning ? "none" : "transform 0.1s ease-out",
//             }}
//           >
//             <svg className="absolute inset-0 pointer-events-none overflow-visible w-[5000px] h-[5000px]">
//               {relations.map((r) => {
//                 const path = getPath(r);
//                 if (!path) return null;

//                 const isSelected = selectedEdgeId === r.id;
//                 const connectedEdge = isEdgeConnected(r.id);
//                 const showHandle = isSelected;
//                 const labelPos = r.label ? getLabelPos(r) : null;

//                 return (
//                   <g key={r.id} className="pointer-events-auto cursor-pointer">
//                     <path
//                       d={path}
//                       fill="none"
//                       stroke="transparent"
//                       strokeWidth="22"
//                       onClick={(e) => handleEdgeClick(e as any, r.id)}
//                     />

//                     <path
//                       d={path}
//                       fill="none"
//                       stroke={edgeStroke(r)}
//                       strokeWidth={edgeWidth(r)}
//                       strokeDasharray={r.isDashed ? "5,5" : "0"}
//                       className="transition-all"
//                       onClick={(e) => handleEdgeClick(e as any, r.id)}
//                     />

//                     {r.label && labelPos && (
//                       <text
//                         x={labelPos.x}
//                         y={labelPos.y - 6}
//                         fill={labelFill(r)}
//                         fontSize="11"
//                         fontWeight="800"
//                         textAnchor="middle"
//                         className="select-none"
//                         style={{
//                           paintOrder: "stroke",
//                           stroke: isDarkMode ? "rgba(2,6,23,0.65)" : "rgba(248,250,252,0.85)",
//                           strokeWidth: connectedEdge ? 3 : 2,
//                         }}
//                         onClick={(e) => handleEdgeClick(e as any, r.id)}
//                       >
//                         {r.label}
//                       </text>
//                     )}

//                     {showHandle && (() => {
//                       const a = getAnchors(r);
//                       if (!a) return null;
//                       const { cx, cy } = a;

//                       return (
//                         <g>
//                           <circle
//                             cx={cx}
//                             cy={cy}
//                             r={7}
//                             fill={isDarkMode ? "#0f172a" : "#ffffff"}
//                             stroke="#6366f1"
//                             strokeWidth="2"
//                             className="cursor-grab active:cursor-grabbing"
//                             onMouseDown={(e) => handleEdgeHandleMouseDown(e as any, r.id)}
//                           />
//                           <circle
//                             cx={cx}
//                             cy={cy}
//                             r={16}
//                             fill="transparent"
//                             className="cursor-grab active:cursor-grabbing"
//                             onMouseDown={(e) => handleEdgeHandleMouseDown(e as any, r.id)}
//                           />
//                         </g>
//                       );
//                     })()}
//                   </g>
//                 );
//               })}
//             </svg>

//             {tables.map((table) => {
//               const primary = isTablePrimarySelected(table.id);
//               const connectedTbl = isTableConnected(table.id);
//               const anySel = activeSelectedTableIds.size > 0 || !!selectedEdgeId;
//               const dimUnconnected = anySel && !primary && !connectedTbl;

//               const borderClass = primary
//                 ? isDarkMode
//                   ? "border-indigo-500 shadow-lg shadow-indigo-500/30"
//                   : "border-indigo-400 shadow-lg shadow-indigo-400/25"
//                 : connectedTbl && anySel
//                 ? isDarkMode
//                   ? "border-indigo-300/60 shadow-indigo-500/10"
//                   : "border-indigo-300 shadow-indigo-300/15"
//                 : isDarkMode
//                 ? "border-slate-800 shadow-lg shadow-slate-950/30"
//                 : "border-slate-300 shadow-md shadow-slate-400/15";

//               return (
//                 <div
//                   key={table.id}
//                   className={`absolute w-56 rounded-xl border-2 transition-all duration-300 select-none user-select-none hover:shadow-xl
//                     ${isDarkMode ? "bg-slate-900 text-slate-200" : "bg-white text-slate-800"}
//                     ${borderClass}
//                     ${dimUnconnected ? "opacity-30 scale-95" : ""}
//                   `}
//                   style={{
//                     left: table.x,
//                     top: table.y,
//                     zIndex: primary ? 30 : connectedTbl ? 20 : 10,
//                   }}
//                   onMouseDown={e => {
//                     e.preventDefault();
//                     handleTableMouseDown(e, table.id);
//                   }}
//                   onContextMenu={e => e.preventDefault()}
//                 >
//                   <div
//                     className={`p-3 rounded-t-xl cursor-grab active:cursor-grabbing border-b flex items-center justify-between min-w-0 user-select-none transition-colors duration-200
//                       ${isDarkMode ? "bg-slate-800/70 border-slate-700 hover:bg-slate-800" : "bg-slate-100 border-slate-200 hover:bg-slate-150"}`}
//                   >
//                     <span className={`font-black text-[10px] uppercase tracking-widest opacity-70 truncate ${primary ? "text-indigo-200" : ""}`}>
//                       {table.name}
//                     </span>
//                     <GripHorizontal size={14} className="opacity-30 flex-shrink-0" />
//                   </div>

//                   <div className="p-2.5 space-y-1.5">
//                     {table.columns.map((col) => (
//                       <div key={col.id} className={`flex items-center text-[11px] justify-between px-1 py-1 rounded transition-colors duration-150 ${isDarkMode ? "hover:bg-slate-700/30" : "hover:bg-slate-100"}`}>
//                         <div className="flex items-center gap-1.5 overflow-hidden">
//                           {col.isPk && <Key size={10} className="text-amber-500 flex-shrink-0" />}
//                           {col.isFk && <LinkIcon size={10} className="text-indigo-500 flex-shrink-0" />}
//                           <span className={`truncate ${col.isPk ? "font-bold" : ""} ${isDarkMode ? col.isPk ? "text-indigo-300" : "text-slate-300" : col.isPk ? "text-indigo-700" : "text-slate-700"}`}>{col.name}</span>
//                         </div>
//                         <span className={`text-[9px] font-mono flex-shrink-0 ml-1 ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>{col.type}</span>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               );
//             })}
//           </div>

//           {lassoRect && (() => {
//             const left = lassoRect.x * viewport.zoom + viewport.x;
//             const top = lassoRect.y * viewport.zoom + viewport.y;
//             const width = lassoRect.w * viewport.zoom;
//             const height = lassoRect.h * viewport.zoom;

//             return (
//               <div
//                 className="absolute pointer-events-none"
//                 style={{
//                   left,
//                   top,
//                   width,
//                   height,
//                   border: "2px solid rgba(99,102,241,0.75)",
//                   background: "rgba(99,102,241,0.12)",
//                   borderRadius: 10,
//                 }}
//               />
//             );
//           })()}

//           <div className={`absolute bottom-6 left-6 px-4 py-2 backdrop-blur-xl border rounded-full text-[10px] font-bold uppercase tracking-widest pointer-events-none transition-all duration-200 ${
//             isDarkMode 
//               ? "bg-slate-900/60 border-slate-700 text-slate-300 shadow-lg shadow-slate-950/40" 
//               : "bg-white/70 border-slate-200 text-slate-700 shadow-md shadow-slate-400/10"
//           }`}>
//             Zoom: {Math.round(viewport.zoom * 100)}%
//           </div>

//           <button
//             onClick={() => setShowCommandTips(!showCommandTips)}
//             className={`absolute bottom-6 right-6 px-4 py-2 backdrop-blur-xl border rounded-full text-[10px] font-bold uppercase tracking-widest transition-all duration-300 cursor-pointer hover:scale-105 active:scale-95 ${
//               isDarkMode 
//                 ? "bg-slate-900/60 border-slate-700 text-slate-300 shadow-lg shadow-slate-950/40 hover:bg-slate-800/60 hover:border-slate-600" 
//                 : "bg-white/70 border-slate-200 text-slate-700 shadow-md shadow-slate-400/10 hover:bg-white/80 hover:border-slate-300"
//             }`}
//           >
//             {showCommandTips ? (
//               <div className="flex flex-col gap-2">
//                 <div className="text-[9px]">Keyboard & Mouse</div>
//                 <div className="space-y-1 text-[9px] font-normal opacity-90">
//                   <div>Shift+Click: multi-select</div>
//                   <div>Drag empty: lasso select</div>
//                   <div>Right-drag: pan canvas</div>
//                   <div>Click edge: bend line</div>
//                 </div>
//               </div>
//             ) : (
//               <div className="flex items-center gap-1">
//                 <span>?</span>
//                 <span>Commands</span>
//               </div>
//             )}
//           </button>
//         </div>

//         {/* EDITOR SIDEBAR */}
//         {/* <div className={`w-80 border-l shadow-2xl z-30 flex flex-col ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
//           <div className="p-4 border-b flex items-center justify-between">
//             <h3 className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
//               <Settings size={16} className="text-indigo-500" /> Designer
//             </h3>
//             <div className="flex flex-col items-end">
//               <span className="text-[9px] font-bold opacity-40 uppercase">Last Saved</span>
//               <span className="text-[10px] font-mono text-indigo-400">{lastSaved || "..."}</span>
//             </div>
//           </div> */}
//         <div 
//   className={`border-l shadow-2xl z-30 flex flex-col transition-all duration-300 overflow-hidden ${
//     isSidebarOpen ? 'w-80' : 'w-0'
//   } ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
// >
//   {/* Header with toggle button */}
//   <div className={`p-4 border-b flex items-center justify-between whitespace-nowrap transition-colors duration-300 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
//     <h3 className="font-bold text-xs uppercase tracking-widest flex items-center gap-2">
//       <Settings size={16} className="text-indigo-500" /> Designer
//     </h3>
//     <button
//       onClick={() => setIsSidebarOpen(false)}
//       className="p-1 hover:bg-slate-800/50 rounded text-slate-400 hover:text-slate-200 flex-shrink-0"
//       title="Collapse sidebar"
//     >
//       <ChevronRight size={16} />
//     </button>
//   </div>
//           <div className={`p-5 space-y-6 overflow-y-auto flex-1 transition-colors duration-300`}>
//             {selectedTableId ? (
//               (() => {
//                 const t = tables.find((x) => x.id === selectedTableId)!;
//                 return (
//                   <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
//                     <div className="space-y-2">
//                       <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Table Name</label>
//                       <input
//                         className={`w-full rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none border transition-all duration-200 ${
//                           isDarkMode ? "bg-slate-950 border-slate-700 text-slate-100 focus:border-indigo-500 focus:bg-slate-900" : "bg-white border-slate-300 text-slate-900 focus:border-indigo-400 focus:bg-slate-50"
//                         }`}
//                         value={t.name}
//                         onChange={(e) => setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
//                       />
//                     </div>

//                     <div className="space-y-3">
//                       <div className="flex items-center justify-between">
//                         <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Columns</label>
//                         <button
//                           onClick={() =>
//                             setTables((prev) =>
//                               prev.map((x) =>
//                                 x.id === t.id
//                                   ? {
//                                       ...x,
//                                       columns: [...x.columns, { id: generateId(), name: "new_col", type: "VARCHAR", isPk: false, isFk: false }],
//                                     }
//                                   : x
//                               )
//                             )
//                           }
//                           className="text-indigo-500 text-[10px] font-bold hover:underline hover:text-indigo-600 transition-colors duration-200"
//                         >
//                           + ADD COLUMN
//                         </button>
//                       </div>

//                       {t.columns.map((col) => (
//                         <div key={col.id} className={`p-3 rounded-xl border space-y-2 transition-all duration-200 ${isDarkMode ? "bg-slate-950 border-slate-700 hover:bg-slate-900 hover:border-slate-600" : "bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-300"}`}>
//                           <div className="flex gap-2">
//                             <input
//                               className={`bg-transparent text-xs w-full outline-none font-bold transition-colors duration-200 ${isDarkMode ? "text-slate-100" : "text-slate-900"}`}
//                               value={col.name}
//                               onChange={(e) =>
//                                 setTables((prev) =>
//                                   prev.map((x) =>
//                                     x.id === t.id
//                                       ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, name: e.target.value } : c)) }
//                                       : x
//                                   )
//                                 )
//                               }
//                             />
//                             <button
//                               className={`transition-colors duration-200 ${isDarkMode ? "text-slate-500 hover:text-red-500" : "text-slate-600 hover:text-red-600"}`}
//                               onClick={() => setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, columns: x.columns.filter((c) => c.id !== col.id) } : x)))}
//                             >
//                               <X size={14} />
//                             </button>
//                           </div>

//                           <div className="flex gap-3">
//                             <label className="flex items-center text-[10px] gap-1 cursor-pointer">
//                               <input
//                                 type="checkbox"
//                                 checked={col.isPk}
//                                 onChange={(e) =>
//                                   setTables((prev) =>
//                                     prev.map((x) =>
//                                       x.id === t.id
//                                         ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, isPk: e.target.checked } : c)) }
//                                         : x
//                                     )
//                                   )
//                                 }
//                               />{" "}
//                               PK
//                             </label>

//                             <label className="flex items-center text-[10px] gap-1 cursor-pointer">
//                               <input
//                                 type="checkbox"
//                                 checked={col.isFk}
//                                 onChange={(e) =>
//                                   setTables((prev) =>
//                                     prev.map((x) =>
//                                       x.id === t.id
//                                         ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, isFk: e.target.checked } : c)) }
//                                         : x
//                                     )
//                                   )
//                                 }
//                               />{" "}
//                               FK
//                             </label>

//                             <select
//                               className={`bg-transparent text-[10px] outline-none ml-auto transition-colors duration-200 ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}
//                               value={col.type}
//                               onChange={(e) =>
//                                 setTables((prev) =>
//                                   prev.map((x) =>
//                                     x.id === t.id
//                                       ? { ...x, columns: x.columns.map((c) => (c.id === col.id ? { ...c, type: e.target.value } : c)) }
//                                       : x
//                                   )
//                                 )
//                               }
//                             >
//                               <option>INT</option>
//                               <option>UUID</option>
//                               <option>VARCHAR</option>
//                               <option>TEXT</option>
//                               <option>BOOL</option>
//                             </select>
//                           </div>
//                         </div>
//                       ))}
//                     </div>

//                     <div className={`pt-4 border-t transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
//                       <label className={`text-[10px] font-bold uppercase block mb-3 transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Connect to Table</label>
//                       <input
//                         type="text"
//                         placeholder="Search tables..."
//                         value={connectTableSearch}
//                         onChange={(e) => setConnectTableSearch(e.target.value)}
//                         className={`w-full px-3 py-2 rounded-lg text-xs mb-3 border outline-none transition-all duration-200 ${
//                           isDarkMode
//                             ? "bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
//                             : "bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
//                         }`}
//                       />
//                       <div className="grid grid-cols-1 gap-2">
//                         {tables
//                           .filter((x) => x.id !== t.id && x.name.toLowerCase().includes(connectTableSearch.toLowerCase()))
//                           .map((target) => {
//                             const isLinked = relations.some((r) => (r.sourceTableId === t.id && r.targetTableId === target.id) || (r.sourceTableId === target.id && r.targetTableId === t.id));
//                             return (
//                             <button
//                               key={target.id}
//                               onClick={() => toggleRelation(t.id, target.id)}
//                               className={`text-left px-3 py-2 rounded-lg text-xs border transition-all duration-200 ${
//                                 isLinked
//                                   ? isDarkMode
//                                     ? "bg-indigo-900/40 border-indigo-600 text-indigo-200 hover:bg-indigo-900/60"
//                                     : "bg-indigo-100 border-indigo-400 text-indigo-900 hover:bg-indigo-200"
//                                   : isDarkMode
//                                   ? "border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
//                                   : "border-slate-300 text-slate-900 hover:bg-slate-100 hover:border-slate-400"
//                               }`}
//                             >
//                               {isLinked ? "✓ " : ""}Link to {target.name}
//                             </button>
//                           );
//                           })}
//                         {tables.filter((x) => x.id !== t.id && x.name.toLowerCase().includes(connectTableSearch.toLowerCase())).length === 0 && (
//                           <div className={`text-xs py-3 text-center transition-colors duration-200 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
//                             {connectTableSearch.length > 0 ? "No tables found" : "No other tables available"}
//                           </div>
//                         )}
//                       </div>
//                     </div>

//                     <button
//                       onClick={() => {
//                         setTables(tables.filter((x) => x.id !== t.id));
//                         setRelations(relations.filter((r) => r.sourceTableId !== t.id && r.targetTableId !== t.id));
//                         setSelectedTableId(null);
//                         setMultiSelectedTableIds(new Set());
//                       }}
//                       className="w-full py-2 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg hover:bg-red-500 hover:text-white transition-all duration-200"
//                     >
//                       Delete Table
//                     </button>
//                   </div>
//                 );
//               })()
//             ) : selectedEdgeId ? (
//               (() => {
//                 const r = relations.find((x) => x.id === selectedEdgeId)!;
//                 return (
//                   <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
//                     <div className="space-y-2">
//                       <label className={`text-[10px] font-bold uppercase transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Edge Label</label>
//                       <input
//                         className={`w-full rounded-lg px-3 py-2 text-sm outline-none border focus:ring-2 focus:ring-indigo-500 transition-all duration-200 ${
//                           isDarkMode ? "bg-slate-950 border-slate-700 text-slate-100 focus:bg-slate-900 focus:border-indigo-500" : "bg-white border-slate-300 text-slate-900 focus:bg-slate-50 focus:border-indigo-400"
//                         }`}
//                         placeholder="e.g. user_id"
//                         value={r.label || ""}
//                         onChange={(e) => setRelations((prev) => prev.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))}
//                       />
//                     </div>

//                     <div className="space-y-3">
//                       <label className={`text-[10px] font-bold uppercase block transition-colors duration-200 ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Line Style</label>
//                       <div className="flex gap-2">
//                         <button
//                           onClick={() => setRelations((prev) => prev.map((x) => (x.id === r.id ? { ...x, isDashed: !x.isDashed } : x)))}
//                           className={`flex-1 py-2 rounded-lg text-xs border transition-all ${
//                             r.isDashed ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20" : isDarkMode ? "border-slate-700 text-slate-400" : "border-slate-200"
//                           }`}
//                         >
//                           Dotted
//                         </button>

//                         <button
//                           onClick={() =>
//                             setRelations((prev) =>
//                               prev.map((x) => (x.id === r.id ? { ...x, lineType: x.lineType === "curved" ? "straight" : "curved" } : x))
//                             )
//                           }
//                           className={`flex-1 py-2 rounded-lg text-xs border transition-all duration-200 ${
//                             r.lineType === "straight"
//                               ? "bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20"
//                               : isDarkMode
//                               ? "border-slate-700 text-slate-400 hover:bg-slate-800"
//                               : "border-slate-300 text-slate-600 hover:bg-slate-100"
//                           }`}
//                         >
//                           Straight
//                         </button>
//                       </div>

//                       <div className={`text-[11px] leading-relaxed transition-colors duration-200 ${isDarkMode ? "text-slate-500" : "text-slate-600"}`}>
//                         Tip: Click an edge to select it, then drag the small handle to bend/route it.
//                       </div>
//                     </div>

//                     <button
//                       onClick={() => {
//                         setRelations(relations.filter((x) => x.id !== r.id));
//                         setSelectedEdgeId(null);
//                       }}
//                       className="w-full py-2 bg-red-500/10 text-red-500 text-xs font-bold rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200"
//                     >
//                       Remove Connection
//                     </button>
//                   </div>
//                 );
//               })()
//             ) : (
//               <div className={`h-full flex flex-col items-center justify-center text-center select-none transition-colors duration-300 ${isDarkMode ? "text-slate-700" : "text-slate-400"}`}>
//                 <MousePointer2 size={40} className="mb-4" />
//                 <p className="text-xs font-bold uppercase tracking-widest">
//                   Select an element
//                   <br />
//                   to edit settings
//                 </p>
//               </div>
//             )}
//           </div>

//           <div className={`p-4 border-t transition-colors duration-300 ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
//             <button
//               onClick={clearAllSelections}
//               className={`w-full py-2 rounded-lg text-xs font-bold border transition-all duration-200 ${
//                 isDarkMode ? "border-slate-700 hover:bg-slate-800 hover:border-slate-600 text-slate-300" : "border-slate-300 hover:bg-slate-100 hover:border-slate-400 text-slate-700"
//               }`}
//             >
//               Clear Selection
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function App() {
//   const [user, setUser] = useState<NetlifyUser | null>(null);

//   useEffect(() => {
//   if (!window.netlifyIdentity) return;

//   // 1. Listen for the 'init' event
//   window.netlifyIdentity.on("init", (u: NetlifyUser | null) => {
//     setUser(u);
    
//     // NEW: If the URL contains an invite_token, 
//     // force the widget to open so the user can set their password.
//     if (window.location.hash.includes("invite_token")) {
//       window.netlifyIdentity.open("signup"); 
//     }
//   });

//   window.netlifyIdentity.on("login", (u: NetlifyUser) => {
//     setUser(u);
//     window.netlifyIdentity.close(); // Close modal after success
//   });

//   window.netlifyIdentity.on("logout", () => {
//     setUser(null);
//   });

//   window.netlifyIdentity.init();
// }, []);

//   if (!user) {
//     return <LoginScreen />;
//   }

//   return <ERDBuilder user={user} />;
// }