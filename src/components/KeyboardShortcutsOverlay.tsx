import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
}

const shortcuts = [
  { category: 'General', items: [
    { keys: ['Ctrl', '/'], description: 'Show keyboard shortcuts' },
    { keys: ['Ctrl', 'Z'], description: 'Undo' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
    { keys: ['Ctrl', 'S'], description: 'Export JSON' },
    { keys: ['Ctrl', 'P'], description: 'Export PNG' },
  ]},
  { category: 'Canvas', items: [
    { keys: ['+'], description: 'Zoom in' },
    { keys: ['-'], description: 'Zoom out' },
    { keys: ['Ctrl', '0'], description: 'Reset viewport' },
    { keys: ['Shift', 'P'], description: 'Toggle pan mode' },
    { keys: ['Ctrl', 'G'], description: 'Toggle grid snapping' },
  ]},
  { category: 'Tables', items: [
    { keys: ['N'], description: 'Add new table' },
    { keys: ['Ctrl', 'D'], description: 'Duplicate selected table' },
    { keys: ['Delete'], description: 'Delete selected table/edge' },
    { keys: ['Shift', 'Click'], description: 'Multi-select tables' },
    { keys: ['Drag empty'], description: 'Lasso select' },
  ]},
  { category: 'Diagram', items: [
    { keys: ['Ctrl', 'L'], description: 'Lock/unlock diagram' },
  ]},
];

export function KeyboardShortcutsOverlay({ isOpen, onClose, isDarkMode }: KeyboardShortcutsOverlayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-2xl border shadow-2xl ${
              isDarkMode 
                ? 'bg-slate-900 border-slate-700' 
                : 'bg-white border-slate-200'
            }`}
          >
            {/* Header */}
            <div className={`sticky top-0 flex items-center justify-between p-4 border-b ${
              isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                  <Keyboard size={20} className="text-indigo-500" />
                </div>
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  Keyboard Shortcuts
                </h2>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {shortcuts.map((section) => (
                <div key={section.category}>
                  <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {section.category}
                  </h3>
                  <div className="space-y-2">
                    {section.items.map((shortcut) => (
                      <div
                        key={shortcut.description}
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'
                        }`}
                      >
                        <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {shortcut.description}
                        </span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, idx) => (
                            <span key={idx} className="flex items-center gap-1">
                              {idx > 0 && (
                                <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>+</span>
                              )}
                              <kbd
                                className={`px-2 py-1 text-xs font-mono font-bold rounded border shadow-sm ${
                                  isDarkMode
                                    ? 'bg-slate-700 border-slate-600 text-slate-200'
                                    : 'bg-white border-slate-300 text-slate-700'
                                }`}
                              >
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className={`p-4 border-t text-center ${
              isDarkMode ? 'border-slate-700' : 'border-slate-200'
            }`}>
              <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Press <kbd className={`px-1.5 py-0.5 rounded border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>Esc</kbd> or <kbd className={`px-1.5 py-0.5 rounded border font-mono ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>Ctrl + /</kbd> to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}