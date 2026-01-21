import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database, BoxSelect, GitBranch, MessageSquare, Plus } from 'lucide-react';
import type { DiagramType } from '../types/uml';
import { FEATURE_FLAGS } from '../config/featureFlags';

interface NewDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateDiagram: (type: DiagramType, name: string) => void;
  isDarkMode: boolean;
}

const DIAGRAM_TYPE_OPTIONS: { 
  type: DiagramType; 
  label: string; 
  description: string; 
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    type: 'erd',
    label: 'Entity Relationship Diagram',
    description: 'Database schema design with tables, columns, and relationships',
    icon: <Database size={24} />,
    color: 'hsl(239 84% 67%)',
  },
  {
    type: 'uml-class',
    label: 'UML Class Diagram',
    description: 'Object-oriented design with classes, attributes, and methods',
    icon: <BoxSelect size={24} />,
    color: 'hsl(262 83% 58%)',
  },
  {
    type: 'flowchart',
    label: 'Flowchart',
    description: 'Process flows with decision points, actions, and connectors',
    icon: <GitBranch size={24} />,
    color: 'hsl(142 76% 36%)',
  },
  {
    type: 'sequence',
    label: 'Sequence Diagram',
    description: 'Object interactions over time with messages and lifelines',
    icon: <MessageSquare size={24} />,
    color: 'hsl(38 92% 50%)',
  },
];

export function NewDiagramModal({
  isOpen,
  onClose,
  onCreateDiagram,
  isDarkMode,
}: NewDiagramModalProps) {
  const [selectedType, setSelectedType] = useState<DiagramType>('erd');
  const [diagramName, setDiagramName] = useState('');

  // Filter options based on feature flags
  const availableOptions = DIAGRAM_TYPE_OPTIONS.filter(option => {
    if (option.type === 'erd') return true;
    if (option.type === 'uml-class') return FEATURE_FLAGS.ENABLE_UML_DIAGRAMS;
    if (option.type === 'flowchart') return FEATURE_FLAGS.ENABLE_FLOWCHART_DIAGRAMS;
    if (option.type === 'sequence') return FEATURE_FLAGS.ENABLE_SEQUENCE_DIAGRAMS;
    return false;
  });

  const handleCreate = () => {
    const name = diagramName.trim() || `New ${selectedType === 'erd' ? 'ERD' : selectedType === 'uml-class' ? 'UML Class' : selectedType === 'flowchart' ? 'Flowchart' : 'Sequence'} Diagram`;
    onCreateDiagram(selectedType, name);
    setDiagramName('');
    setSelectedType('erd');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg rounded-2xl border overflow-hidden"
            style={{
              background: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)',
              borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-4 border-b"
              style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}
            >
              <h2 
                className="text-lg font-bold"
                style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}
              >
                Create New Diagram
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-colors hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Diagram Name Input */}
              <div className="space-y-2">
                <label 
                  className="text-xs font-medium"
                  style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}
                >
                  Diagram Name (optional)
                </label>
                <input
                  type="text"
                  value={diagramName}
                  onChange={(e) => setDiagramName(e.target.value)}
                  placeholder="Enter diagram name..."
                  className="w-full px-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                  style={{
                    background: isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(220 14% 96%)',
                    borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
                    color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)',
                  }}
                />
              </div>

              {/* Diagram Type Selection */}
              <div className="space-y-2">
                <label 
                  className="text-xs font-medium"
                  style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}
                >
                  Select Diagram Type
                </label>
                <div className="grid gap-2">
                  {availableOptions.map(option => (
                    <button
                      key={option.type}
                      onClick={() => setSelectedType(option.type)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        selectedType === option.type ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                      }`}
                      style={{
                        background: selectedType === option.type 
                          ? `${option.color}15`
                          : isDarkMode ? 'hsl(222 47% 8%)' : 'hsl(220 14% 96%)',
                        borderColor: selectedType === option.type 
                          ? option.color
                          : isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
                      }}
                    >
                      <div 
                        className="p-2 rounded-lg"
                        style={{ background: `${option.color}20`, color: option.color }}
                      >
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <div 
                          className="font-semibold text-sm"
                          style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}
                        >
                          {option.label}
                        </div>
                        <div 
                          className="text-xs mt-0.5"
                          style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}
                        >
                          {option.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div 
              className="flex justify-end gap-3 p-4 border-t"
              style={{ borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)' }}
            >
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
                  color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                style={{
                  background: DIAGRAM_TYPE_OPTIONS.find(o => o.type === selectedType)?.color || 'hsl(239 84% 67%)',
                  color: 'white',
                }}
              >
                <Plus size={16} />
                Create Diagram
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
