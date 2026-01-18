import React from 'react';
import { motion } from 'framer-motion';
import type { FlowchartNode as FlowchartNodeType, FlowchartNodeType as NodeType } from '../types/uml';

interface FlowchartNodeProps {
  node: FlowchartNodeType;
  isSelected: boolean;
  isDarkMode: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

const getNodeShape = (type: NodeType, isDarkMode: boolean, color?: string): React.CSSProperties => {
  const baseColor = color || 'hsl(239 84% 67%)';
  const bgColor = isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)';
  
  const baseStyle: React.CSSProperties = {
    background: bgColor,
    borderColor: baseColor,
    borderWidth: 2,
    borderStyle: 'solid',
  };

  switch (type) {
    case 'start-end':
      return {
        ...baseStyle,
        borderRadius: '9999px',
        minWidth: 100,
        minHeight: 40,
      };
    case 'process':
      return {
        ...baseStyle,
        borderRadius: 4,
        minWidth: 120,
        minHeight: 50,
      };
    case 'decision':
      return {
        ...baseStyle,
        transform: 'rotate(45deg)',
        minWidth: 60,
        minHeight: 60,
        borderRadius: 4,
      };
    case 'input-output':
      return {
        ...baseStyle,
        clipPath: 'polygon(10% 0%, 100% 0%, 90% 100%, 0% 100%)',
        minWidth: 120,
        minHeight: 50,
      };
    case 'document':
      return {
        ...baseStyle,
        borderRadius: '0 0 40% 40% / 0 0 20% 20%',
        minWidth: 100,
        minHeight: 60,
      };
    case 'data':
      return {
        ...baseStyle,
        clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)',
        minWidth: 100,
        minHeight: 50,
      };
    case 'connector':
      return {
        ...baseStyle,
        borderRadius: '50%',
        width: 40,
        height: 40,
      };
    default:
      return baseStyle;
  }
};

export function FlowchartNode({
  node,
  isSelected,
  isDarkMode,
  onSelect,
  onDragStart,
}: FlowchartNodeProps) {
  const nodeStyle = getNodeShape(node.type, isDarkMode, node.color);
  
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute select-none flex items-center justify-center"
      style={{
        left: node.x,
        top: node.y,
        zIndex: isSelected ? 100 : 10,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={onDragStart}
    >
      <div
        className={`flex items-center justify-center px-4 py-2 transition-all duration-200 ${
          isSelected ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
        }`}
        style={{
          ...nodeStyle,
          boxShadow: isSelected ? `0 0 20px ${node.color || 'hsl(239 84% 67%)'}40` : undefined,
        }}
      >
        <span
          className={`text-xs font-medium text-center ${node.type === 'decision' ? 'transform -rotate-45' : ''}`}
          style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}
        >
          {node.label}
        </span>
      </div>
    </motion.div>
  );
}
