import React from 'react';
import { motion } from 'framer-motion';
import { Database, BoxSelect, GitBranch, MessageSquare } from 'lucide-react';
import type { DiagramType } from '../types/uml';
import { isDiagramTypeEnabled } from '../config/featureFlags';

interface DiagramTypeSelectorProps {
  currentType: DiagramType;
  onTypeChange: (type: DiagramType) => void;
  isDarkMode: boolean;
}

interface DiagramTypeConfig {
  type: DiagramType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const DIAGRAM_TYPES: DiagramTypeConfig[] = [
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
    description: 'UML Class Diagram',
  },
  { 
    type: 'flowchart', 
    label: 'Flowchart', 
    icon: <GitBranch size={16} />, 
    description: 'Process Flowchart',
  },
  { 
    type: 'sequence', 
    label: 'Sequence', 
    icon: <MessageSquare size={16} />, 
    description: 'Sequence Diagram',
  },
];

export function DiagramTypeSelector({
  currentType,
  onTypeChange,
  isDarkMode,
}: DiagramTypeSelectorProps) {
  // Filter to only show enabled diagram types
  const enabledTypes = DIAGRAM_TYPES.filter(dt => isDiagramTypeEnabled(dt.type));
  
  // If only ERD is enabled, don't show the selector
  if (enabledTypes.length <= 1) {
    return null;
  }

  return (
    <div 
      className="flex items-center gap-1 p-1 rounded-lg transition-colors"
      style={{ 
        background: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(220 14% 96%)',
        border: `1px solid ${isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)'}`,
      }}
    >
      {enabledTypes.map(({ type, label, icon, description }) => {
        const isActive = currentType === type;
        
        return (
          <motion.button
            key={type}
            onClick={() => onTypeChange(type)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
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
            whileHover={!isActive ? { 
              backgroundColor: isDarkMode ? 'hsl(222 47% 15%)' : 'hsl(220 14% 90%)' 
            } : undefined}
            whileTap={{ scale: 0.98 }}
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
