import { motion } from "framer-motion";
import {
  Database,
  Plus,
  Maximize,
  Sun,
  Moon,
  Save,
  Upload,
  Download,
  FileText,
  Grid3x3,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Undo2,
  Redo2,
  Keyboard,
  BoxSelect,
  GitBranch,
  Link2,
  Trash2,
  Copy,
} from "lucide-react";
import type { DiagramType } from "../../types/uml";
import type { FlowchartNodeType } from "../../types/uml";
import { FLOWCHART_NODE_LABELS } from "../../types/uml";

interface LeftSidebarProps {
  isDarkMode: boolean;
  isGridSnap: boolean;
  isSidebarOpen: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  diagramType: DiagramType;
  isLocked?: boolean;
  onAddTable: () => void;
  onAddUmlClass?: () => void;
  onAddFlowchartNode?: (type: FlowchartNodeType) => void;
  onResetViewport: () => void;
  onToggleTheme: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPNG: () => void;
  onExportSQL: () => void;
  onExportSVG?: () => void;
  onToggleGridSnap: () => void;
  onToggleSidebar: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShowShortcuts: () => void;
  onStartConnection?: () => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
}

const NODE_ICONS: Record<FlowchartNodeType, React.ReactNode> = {
  'start-end': <div className="w-3 h-2 rounded-full border-2 border-current" />,
  'process': <div className="w-3 h-2 border-2 border-current rounded-sm" />,
  'decision': <div className="w-3 h-3 border-2 border-current rotate-45" />,
  'input-output': <div className="w-3 h-2 border-2 border-current skew-x-12" />,
  'document': <FileText size={14} />,
  'data': <Database size={14} />,
  'connector': <div className="w-2 h-2 rounded-full border-2 border-current" />,
};

export function LeftSidebar({
  isDarkMode,
  isGridSnap,
  isSidebarOpen,
  isSaving,
  canUndo,
  canRedo,
  diagramType,
  isLocked = false,
  onAddTable,
  onAddUmlClass,
  onAddFlowchartNode,
  onResetViewport,
  onToggleTheme,
  onExportJSON,
  onImportJSON,
  onExportPNG,
  onExportSQL,
  onExportSVG,
  onToggleGridSnap,
  onToggleSidebar,
  onUndo,
  onRedo,
  onShowShortcuts,
  onStartConnection,
  onDeleteSelected,
  onDuplicateSelected,
}: LeftSidebarProps) {
  const buttonClass = "p-2.5 rounded-xl transition-all duration-200 active:scale-95 hover:scale-105";
  
  // Get the appropriate icon for the current diagram type
  const getDiagramIcon = () => {
    switch (diagramType) {
      case 'uml-class':
        return <BoxSelect size={22} />;
      case 'flowchart':
        return <GitBranch size={22} />;
      default:
        return <Database size={22} />;
    }
  };

  // Render ERD-specific tools
  const renderERDTools = () => (
    <>
      {/* Add Table */}
      <button
        onClick={onAddTable}
        title="Add Table (N)"
        disabled={isLocked}
        className={`${buttonClass} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/15'} text-primary`}
      >
        <Plus size={20} />
      </button>

      <div className="w-8 h-px bg-border my-1" />

      {/* Export SQL */}
      <button
        onClick={onExportSQL}
        title="Export SQL DDL"
        className={`${buttonClass} hover:bg-primary/15 text-primary`}
      >
        <FileText size={18} />
      </button>
    </>
  );

  // Render UML-specific tools
  const renderUMLTools = () => (
    <>
      {/* Add Class */}
      <button
        onClick={onAddUmlClass}
        title="Add Class (N)"
        disabled={isLocked}
        className={`${buttonClass} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/15'} text-primary`}
      >
        <Plus size={20} />
      </button>

      {/* Add Relationship */}
      {onStartConnection && (
        <button
          onClick={onStartConnection}
          title="Add Relationship (R)"
          disabled={isLocked}
          className={`${buttonClass} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary/15'} text-secondary-foreground`}
        >
          <Link2 size={18} />
        </button>
      )}

      <div className="w-8 h-px bg-border my-1" />

      {/* Duplicate Selected */}
      {onDuplicateSelected && (
        <button
          onClick={onDuplicateSelected}
          title="Duplicate (Ctrl+D)"
          disabled={isLocked}
          className={`${buttonClass} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'} text-muted-foreground hover:text-foreground`}
        >
          <Copy size={18} />
        </button>
      )}

      {/* Delete Selected */}
      {onDeleteSelected && (
        <button
          onClick={onDeleteSelected}
          title="Delete (Del)"
          disabled={isLocked}
          className={`${buttonClass} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-destructive/15'} text-destructive`}
        >
          <Trash2 size={18} />
        </button>
      )}
    </>
  );

  // Render Flowchart-specific tools
  const renderFlowchartTools = () => (
    <>
      {/* Flowchart Node Types */}
      {onAddFlowchartNode && (Object.keys(FLOWCHART_NODE_LABELS) as FlowchartNodeType[]).slice(0, 4).map((type) => (
        <button
          key={type}
          onClick={() => onAddFlowchartNode(type)}
          title={`Add ${FLOWCHART_NODE_LABELS[type]}`}
          disabled={isLocked}
          className={`${buttonClass} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/15'} text-primary`}
        >
          {NODE_ICONS[type]}
        </button>
      ))}

      <div className="w-8 h-px bg-border my-1" />

      {/* Delete Selected */}
      {onDeleteSelected && (
        <button
          onClick={onDeleteSelected}
          title="Delete (Del)"
          disabled={isLocked}
          className={`${buttonClass} ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-destructive/15'} text-destructive`}
        >
          <Trash2 size={18} />
        </button>
      )}
    </>
  );

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-16 h-full border-r border-sidebar-border flex flex-col items-center bg-sidebar z-30 overflow-hidden"
    >
      {/* Scrollable content area */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden py-4 space-y-2 flex flex-col items-center no-scrollbar">
        {/* Logo - changes based on diagram type */}
        <div className="p-2.5 bg-primary rounded-xl text-primary-foreground mb-2 shadow-glow">
          {getDiagramIcon()}
        </div>

        {/* Diagram-specific tools */}
        {diagramType === 'erd' && renderERDTools()}
        {diagramType === 'uml-class' && renderUMLTools()}
        {diagramType === 'flowchart' && renderFlowchartTools()}

        <div className="w-8 h-px bg-border my-1" />

        {/* Undo/Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className={`${buttonClass} ${canUndo ? "hover:bg-muted text-muted-foreground hover:text-foreground" : "opacity-30 cursor-not-allowed text-muted-foreground"}`}
        >
          <Undo2 size={18} />
        </button>
        
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className={`${buttonClass} ${canRedo ? "hover:bg-muted text-muted-foreground hover:text-foreground" : "opacity-30 cursor-not-allowed text-muted-foreground"}`}
        >
          <Redo2 size={18} />
        </button>

        <div className="w-8 h-px bg-border my-1" />

        {/* Reset Viewport */}
        <button
          onClick={onResetViewport}
          title="Fit to Screen"
          className={`${buttonClass} hover:bg-muted text-muted-foreground hover:text-foreground`}
        >
          <Maximize size={18} />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          title="Toggle Theme"
          className={`${buttonClass} hover:bg-warning/15 text-warning`}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Grid Snap */}
        <button
          onClick={onToggleGridSnap}
          title={`Grid Snap ${isGridSnap ? "ON" : "OFF"} (Ctrl+G)`}
          className={`${buttonClass} ${isGridSnap ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
        >
          <Grid3x3 size={18} />
        </button>

        <div className="w-8 h-px bg-border my-1" />

        {/* Export/Import - Common across all diagram types */}
        <button
          onClick={onExportJSON}
          title="Export JSON (Ctrl+S)"
          className={`${buttonClass} hover:bg-success/15 text-success`}
        >
          <Save size={18} />
        </button>

        <label
          className={`${buttonClass} hover:bg-primary/15 text-primary cursor-pointer`}
          title="Import JSON"
        >
          <Upload size={18} />
          <input type="file" className="hidden" onChange={onImportJSON} accept=".json" />
        </label>

        <button
          onClick={onExportPNG}
          title="Export PNG (Ctrl+P)"
          className={`${buttonClass} hover:bg-secondary text-muted-foreground hover:text-foreground`}
        >
          <Download size={18} />
        </button>

        {/* SVG Export for UML/Flowchart */}
        {(diagramType === 'uml-class' || diagramType === 'flowchart') && onExportSVG && (
          <button
            onClick={onExportSVG}
            title="Export SVG"
            className={`${buttonClass} hover:bg-secondary text-muted-foreground hover:text-foreground`}
          >
            <FileText size={18} />
          </button>
        )}
      </div>

      {/* Fixed bottom section */}
      <div className="w-full flex flex-col items-center py-4 space-y-2 border-t border-sidebar-border bg-sidebar">
        {/* Keyboard Shortcuts */}
        <button
          onClick={onShowShortcuts}
          title="Keyboard Shortcuts (?)"
          className={`${buttonClass} hover:bg-muted text-muted-foreground hover:text-foreground`}
        >
          <Keyboard size={18} />
        </button>

        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          title={isSidebarOpen ? "Collapse Panel" : "Expand Panel"}
          className={`${buttonClass} hover:bg-muted text-muted-foreground hover:text-foreground`}
        >
          {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        {/* Save Status */}
        <div className="flex flex-col items-center gap-1">
          <div className={`transition-all duration-500 ${isSaving ? "text-primary animate-pulse" : "text-muted-foreground/50"}`}>
            <CheckCircle2 size={14} />
          </div>
          <span
            className="text-[7px] font-bold uppercase tracking-widest text-muted-foreground/50"
            style={{ writingMode: "vertical-rl" }}
          >
            {isSaving ? "Saving..." : "Auto"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}