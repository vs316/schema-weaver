import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Users,
  Cloud,
  Loader2,
  FolderOpen,
  LogOut,
  Edit2,
  Check,
  X,
  Shield,
  Sun,
  Moon,
} from 'lucide-react';
import type { ERDDiagram } from '../hooks/useCloudSync';
import { TeamManagement } from './TeamManagement';
import { DiagramPreview } from './DiagramPreview';
import { TeamWorkspaceSwitcher } from './TeamWorkspaceSwitcher';
import { supabase } from '../integrations/supabase/safeClient';

const THEME_KEY = "erd-theme";

interface DiagramSelectorProps {
  diagrams: ERDDiagram[];
  loading: boolean;
  error?: string | null;
  teamId: string | null;
  onSelect: (diagram: ERDDiagram) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onLogout: () => void;
  onTeamSwitch?: (teamId: string) => void;
}

export function DiagramSelector({
  diagrams,
  loading,
  error,
  teamId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onLogout,
  onTeamSwitch,
}: DiagramSelectorProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [editingDiagramId, setEditingDiagramId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(THEME_KEY);
      return stored !== "light";
    }
    return true;
  });
  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove("light");
      root.classList.add("dark");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem(THEME_KEY, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  useEffect(() => {
    // Check if user is admin
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        setIsAdmin(!!data);
      }
    };
    checkAdmin();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'hsl(222 47% 4%)' }}>
        <div className="text-center max-w-md">
          <div 
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'hsl(0 84% 60% / 0.1)' }}
          >
            <Cloud size={32} style={{ color: 'hsl(0 84% 60%)' }} />
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'hsl(210 40% 98%)' }}>
            Something went wrong
          </h2>
          <p className="text-sm mb-4" style={{ color: 'hsl(215 20% 65%)' }}>
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg font-medium text-sm"
            style={{
              background: 'hsl(239 84% 67%)',
              color: 'hsl(0 0% 100%)',
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(222 47% 4%)' }}>
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4" style={{ color: 'hsl(239 84% 67%)' }} />
          <p style={{ color: 'hsl(215 20% 65%)' }}>Loading diagrams...</p>
        </div>
      </div>
    );
  }

  // Show team setup if no teamId
  if (!teamId) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center" style={{ background: 'hsl(222 47% 4%)' }}>
        <div className="max-w-md w-full">
          <TeamManagement teamId={null} onTeamJoined={() => window.location.reload()} />
          <div className="mt-4 text-center">
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors hover:bg-red-500/10"
              style={{ color: 'hsl(0 84% 60%)' }}
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 transition-colors duration-300" style={{ background: isDarkMode ? 'hsl(222 47% 4%)' : 'hsl(0 0% 96%)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3 transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
                <Cloud size={28} style={{ color: 'hsl(239 84% 67%)' }} />
                Your Diagrams
              </h1>
              <p className="mt-1 text-sm transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
                Select a diagram to continue or create a new one
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Team Workspace Switcher */}
            <TeamWorkspaceSwitcher
              currentTeamId={teamId}
              onTeamSwitch={(newTeamId) => {
                onTeamSwitch?.(newTeamId);
                window.location.reload();
              }}
              onOpenSettings={() => setShowTeamSettings(true)}
            />

            {/* Admin Button */}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                style={{
                  background: 'hsl(38 92% 50% / 0.1)',
                  color: 'hsl(38 92% 50%)',
                }}
                title="Admin Panel"
              >
                <Shield size={16} />
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-lg transition-all ${
                isDarkMode ? "hover:bg-white/5 text-slate-400" : "hover:bg-slate-200 text-slate-600"
              }`}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* New Diagram Button */}
            <button
              onClick={onCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105"
              style={{
                background: 'hsl(239 84% 67%)',
                color: 'hsl(0 0% 100%)',
              }}
            >
              <Plus size={18} />
              New Diagram
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                background: 'hsl(0 84% 60% / 0.1)',
                color: 'hsl(0 84% 60%)',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Diagrams Grid */}
        {diagrams.length === 0 ? (
          <div 
            className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed transition-colors duration-300"
            style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}
          >
            <FolderOpen size={48} className="mb-4" style={{ color: isDarkMode ? 'hsl(217 33% 25%)' : 'hsl(215 16% 47%)' }} />
            <h2 className="text-lg font-semibold mb-2 transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
              No diagrams yet
            </h2>
            <p className="text-sm mb-6 transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
              Create your first diagram to get started
            </p>
            <button
              onClick={onCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
              style={{
                background: 'hsl(239 84% 67%)',
                color: 'hsl(0 0% 100%)',
              }}
            >
              <Plus size={18} />
              Create Diagram
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {diagrams.map((diagram) => (
                <motion.div
                  key={diagram.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative rounded-xl border cursor-pointer transition-all duration-200 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10"
                  style={{
                    background: isDarkMode ? 'hsl(222 47% 6%)' : 'hsl(0 0% 100%)',
                    borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
                  }}
                  onClick={() => !editingDiagramId && onSelect(diagram)}
                >
                  {/* Preview area with diagram preview on hover */}
                  <div 
                    className="h-32 rounded-t-xl flex items-center justify-center overflow-hidden relative transition-colors duration-300"
                    style={{ background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(0 0% 96%)' }}
                  >
                    <DiagramPreview 
                      tables={diagram.tables} 
                      relations={diagram.relations}
                      isDarkMode={isDarkMode}
                    />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    {editingDiagramId === diagram.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 rounded text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
                          style={{
                            background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(0 0% 100%)',
                            borderColor: isDarkMode ? 'hsl(217 33% 25%)' : 'hsl(220 13% 91%)',
                            color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)',
                          }}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onRename(diagram.id, editName);
                              setEditingDiagramId(null);
                            } else if (e.key === 'Escape') {
                              setEditingDiagramId(null);
                            }
                          }}
                        />
                        <button
                          onClick={() => {
                            onRename(diagram.id, editName);
                            setEditingDiagramId(null);
                          }}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/20 transition-colors"
                        >
                          <Check size={14} style={{ color: 'hsl(142 76% 36%)' }} />
                        </button>
                        <button
                          onClick={() => setEditingDiagramId(null)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <X size={14} style={{ color: 'hsl(0 84% 60%)' }} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate flex-1 transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}>
                          {diagram.name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditName(diagram.name);
                            setEditingDiagramId(diagram.id);
                          }}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-all ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                          title="Rename diagram"
                        >
                          <Edit2 size={12} style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }} />
                        </button>
                      </div>
                    )}
                    
                    <div className="mt-2 flex items-center gap-4 text-xs transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(diagram.updated_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        Team
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs transition-colors duration-300" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
                      <span className="px-2 py-1 rounded transition-colors duration-300" style={{ background: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}>
                        {(diagram.tables as unknown[])?.length || 0} tables
                      </span>
                      <span className="px-2 py-1 rounded transition-colors duration-300" style={{ background: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}>
                        {(diagram.relations as unknown[])?.length || 0} relations
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(diagram.id);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'hsl(0 84% 60% / 0.1)' }}
                  >
                    <Trash2 size={16} style={{ color: 'hsl(0 84% 60%)' }} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="rounded-xl p-6 max-w-sm w-full"
              style={{ 
                background: 'hsl(222 47% 6%)',
                border: '1px solid hsl(217 33% 17%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(210 40% 98%)' }}>
                Delete Diagram?
              </h3>
              <p className="text-sm mb-6" style={{ color: 'hsl(215 20% 65%)' }}>
                This action cannot be undone. The diagram will be permanently deleted for all team members.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 rounded-lg font-medium text-sm"
                  style={{
                    background: 'hsl(217 33% 17%)',
                    color: 'hsl(210 40% 98%)',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDelete(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 py-2 rounded-lg font-medium text-sm"
                  style={{
                    background: 'hsl(0 84% 60%)',
                    color: 'hsl(0 0% 100%)',
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Team Settings Modal */}
        {showTeamSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => setShowTeamSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <TeamManagement 
                teamId={teamId} 
                onClose={() => setShowTeamSettings(false)} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
