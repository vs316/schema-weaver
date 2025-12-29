import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  FileText, 
  Trash2, 
  Clock, 
  Users, 
  Cloud,
  Loader2,
  FolderOpen
} from 'lucide-react';
import type { ERDDiagram } from '../hooks/useCloudSync';

interface DiagramSelectorProps {
  diagrams: ERDDiagram[];
  loading: boolean;
  onSelect: (diagram: ERDDiagram) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function DiagramSelector({
  diagrams,
  loading,
  onSelect,
  onCreate,
  onDelete,
}: DiagramSelectorProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen p-6" style={{ background: 'hsl(222 47% 4%)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'hsl(210 40% 98%)' }}>
              <Cloud size={28} style={{ color: 'hsl(239 84% 67%)' }} />
              Your Diagrams
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'hsl(215 20% 65%)' }}>
              Select a diagram to continue or create a new one
            </p>
          </div>
          
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
        </div>

        {/* Diagrams Grid */}
        {diagrams.length === 0 ? (
          <div 
            className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed"
            style={{ borderColor: 'hsl(217 33% 17%)' }}
          >
            <FolderOpen size={48} className="mb-4" style={{ color: 'hsl(217 33% 25%)' }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'hsl(210 40% 98%)' }}>
              No diagrams yet
            </h2>
            <p className="text-sm mb-6" style={{ color: 'hsl(215 20% 65%)' }}>
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
                  className="group relative rounded-xl border cursor-pointer transition-all duration-200 hover:border-opacity-60"
                  style={{
                    background: 'hsl(222 47% 6%)',
                    borderColor: 'hsl(217 33% 17%)',
                  }}
                  onClick={() => onSelect(diagram)}
                >
                  {/* Preview area */}
                  <div 
                    className="h-32 rounded-t-xl flex items-center justify-center"
                    style={{ background: 'hsl(222 47% 8%)' }}
                  >
                    <FileText size={32} style={{ color: 'hsl(217 33% 25%)' }} />
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold truncate" style={{ color: 'hsl(210 40% 98%)' }}>
                      {diagram.name}
                    </h3>
                    
                    <div className="mt-2 flex items-center gap-4 text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(diagram.updated_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        Team
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'hsl(215 20% 65%)' }}>
                      <span className="px-2 py-1 rounded" style={{ background: 'hsl(217 33% 17%)' }}>
                        {(diagram.tables as unknown[])?.length || 0} tables
                      </span>
                      <span className="px-2 py-1 rounded" style={{ background: 'hsl(217 33% 17%)' }}>
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
      </AnimatePresence>
    </div>
  );
}
