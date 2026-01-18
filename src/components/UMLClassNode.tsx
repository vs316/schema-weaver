import React from 'react';
import { motion } from 'framer-motion';
import type { UMLClass, Visibility } from '../types/uml';

interface UMLClassNodeProps {
  umlClass: UMLClass;
  isSelected: boolean;
  isDarkMode: boolean;
  zoom: number;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

const VisibilityIcon: React.FC<{ visibility: Visibility }> = ({ visibility }) => {
  const colors: Record<Visibility, string> = {
    '+': 'hsl(142 76% 36%)',  // green - public
    '-': 'hsl(0 84% 60%)',    // red - private
    '#': 'hsl(38 92% 50%)',   // yellow - protected
    '~': 'hsl(239 84% 67%)',  // indigo - package
  };
  
  return (
    <span 
      className="font-mono text-[10px] w-3 inline-block"
      style={{ color: colors[visibility] }}
    >
      {visibility}
    </span>
  );
};

export function UMLClassNode({
  umlClass,
  isSelected,
  isDarkMode,
  zoom,
  onSelect,
  onDragStart,
}: UMLClassNodeProps) {
  const bgColor = umlClass.color || (isDarkMode ? 'hsl(239 84% 67%)' : 'hsl(239 84% 60%)');
  
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="absolute select-none"
      style={{
        left: umlClass.x,
        top: umlClass.y,
        minWidth: 180 / zoom,
        zIndex: isSelected ? 100 : 10,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={onDragStart}
    >
      <div
        className={`rounded-lg overflow-hidden transition-all duration-200 ${
          isSelected ? 'ring-2 ring-offset-2 ring-indigo-500' : ''
        }`}
        style={{
          background: isDarkMode ? 'hsl(222 47% 11%)' : 'hsl(0 0% 100%)',
          border: `2px solid ${isSelected ? bgColor : isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)'}`,
          boxShadow: isSelected ? `0 0 20px ${bgColor}40` : undefined,
        }}
      >
        {/* Header with class name */}
        <div
          className="px-3 py-2 text-center font-bold text-xs border-b"
          style={{
            background: bgColor,
            color: 'white',
            borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
          }}
        >
          {/* Stereotype */}
          {umlClass.stereotype && (
            <div className="text-[9px] font-normal opacity-80 mb-0.5">
              «{umlClass.stereotype}»
            </div>
          )}
          <div className={umlClass.stereotype === 'abstract' ? 'italic' : ''}>
            {umlClass.name}
          </div>
        </div>

        {/* Attributes section */}
        <div
          className="px-2 py-1.5 border-b min-h-[24px]"
          style={{
            borderColor: isDarkMode ? 'hsl(217 33% 17%)' : 'hsl(220 13% 91%)',
          }}
        >
          {umlClass.attributes.length === 0 ? (
            <div className="text-[9px] opacity-50" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
              No attributes
            </div>
          ) : (
            umlClass.attributes.map((attr) => (
              <div
                key={attr.id}
                className={`text-[10px] font-mono truncate ${attr.isStatic ? 'underline' : ''}`}
                style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}
              >
                <VisibilityIcon visibility={attr.visibility} />
                <span>{attr.name}</span>
                <span className="opacity-60">: {attr.type}</span>
              </div>
            ))
          )}
        </div>

        {/* Methods section */}
        <div className="px-2 py-1.5 min-h-[24px]">
          {umlClass.methods.length === 0 ? (
            <div className="text-[9px] opacity-50" style={{ color: isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)' }}>
              No methods
            </div>
          ) : (
            umlClass.methods.map((method) => (
              <div
                key={method.id}
                className={`text-[10px] font-mono truncate ${method.isStatic ? 'underline' : ''} ${method.isAbstract ? 'italic' : ''}`}
                style={{ color: isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)' }}
              >
                <VisibilityIcon visibility={method.visibility} />
                <span>{method.name}</span>
                <span className="opacity-60">({method.parameters})</span>
                <span className="opacity-60">: {method.returnType}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
