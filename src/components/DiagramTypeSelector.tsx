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
}: DiagramTypeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'hsl(var(--muted))' }}>
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
              background: isActive ? 'hsl(var(--primary))' : 'transparent',
              color: isActive ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
            }}
            whileHover={!isDisabled ? { scale: 1.02 } : undefined}
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
