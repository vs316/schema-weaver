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
} from "lucide-react";

interface LeftSidebarProps {
  isDarkMode: boolean;
  isGridSnap: boolean;
  isSidebarOpen: boolean;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onAddTable: () => void;
  onResetViewport: () => void;
  onToggleTheme: () => void;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportPNG: () => void;
  onExportSQL: () => void;
  onToggleGridSnap: () => void;
  onToggleSidebar: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onShowShortcuts: () => void;
}

export function LeftSidebar({
  isDarkMode,
  isGridSnap,
  isSidebarOpen,
  isSaving,
  canUndo,
  canRedo,
  onAddTable,
  onResetViewport,
  onToggleTheme,
  onExportJSON,
  onImportJSON,
  onExportPNG,
  onExportSQL,
  onToggleGridSnap,
  onToggleSidebar,
  onUndo,
  onRedo,
  onShowShortcuts,
}: LeftSidebarProps) {
  const buttonClass = "p-2.5 rounded-xl transition-all duration-200 active:scale-95 hover:scale-105";
  
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-16 border-r border-sidebar-border flex flex-col items-center py-4 space-y-2 bg-sidebar z-30"
    >
      {/* Logo */}
      <div className="p-2.5 bg-primary rounded-xl text-primary-foreground mb-2 shadow-glow">
        <Database size={22} />
      </div>

      {/* Add Table */}
      <button
        onClick={onAddTable}
        title="Add Table (N)"
        className={`${buttonClass} hover:bg-primary/15 text-primary`}
      >
        <Plus size={20} />
      </button>

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

      {/* Export/Import */}
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

      <button
        onClick={onExportSQL}
        title="Export SQL DDL"
        className={`${buttonClass} hover:bg-primary/15 text-primary`}
      >
        <FileText size={18} />
      </button>

      <div className="flex-1" />

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
      <div className="flex flex-col items-center gap-1 mb-2">
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
    </motion.div>
  );
}
