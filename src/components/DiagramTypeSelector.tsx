import React from 'react';
import { motion } from 'framer-motion';
import { Database, BoxSelect, GitBranch, MessageSquare } from 'lucide-react';
import type { DiagramType } from '../types/uml';

interface DiagramTypeSelectorProps {
  currentType: DiagramType;
  onTypeChange: (type: DiagramType) => void;
  isDarkMode: boolean;
}

const DIAGRAM_TYPES: { type: DiagramType; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    type: 'erd', 
    label: 'ERD', 
    icon: <Database size={16} />, 
    description: 'Entity Relationship Diagram' 
  },
  { 
    type: 'uml-class', 
    label: 'UML Class', 
    icon: <BoxSelect size={16} />, 
    description: 'UML Class Diagram' 
  },
  { 
    type: 'flowchart', 
    label: 'Flowchart', 
    icon: <GitBranch size={16} />, 
    description: 'Process Flowchart' 
  },
  { 
    type: 'sequence', 
    label: 'Sequence', 
    icon: <MessageSquare size={16} />, 
    description: 'Sequence Diagram (Coming Soon)',
  },
];

export function DiagramTypeSelector({
  currentType,
  onTypeChange,
  isDarkMode,
}: DiagramTypeSelectorProps) {
  return (
    <div 
      className="flex items-center gap-1 p-1 rounded-lg transition-colors"
      style={{ 
        background: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(220 14% 96%)',
        border: `1px solid ${isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)'}`,
      }}
    >
      {DIAGRAM_TYPES.map(({ type, label, icon, description }) => {
        const isActive = currentType === type;
        const isDisabled = type === 'sequence';
        
        return (
          <motion.button
            key={type}
            onClick={() => !isDisabled && onTypeChange(type)}
            disabled={isDisabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{
              background: isActive 
                ? 'hsl(239 84% 67%)' 
                : 'transparent',
              color: isActive 
                ? 'white' 
                : isDarkMode 
                  ? 'hsl(215 20% 65%)' 
                  : 'hsl(215 16% 47%)',
            }}
            whileHover={!isDisabled && !isActive ? { 
              backgroundColor: isDarkMode ? 'hsl(222 47% 15%)' : 'hsl(220 14% 90%)' 
            } : undefined}
            whileTap={!isDisabled ? { scale: 0.98 } : undefined}
            title={description}
          >
            {icon}
            <span>{label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
