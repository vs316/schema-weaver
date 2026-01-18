import type { UMLRelation, UMLRelationType, UMLClass } from '../types/uml';

interface UMLRelationLineProps {
  relation: UMLRelation;
  sourceClass: UMLClass | undefined;
  targetClass: UMLClass | undefined;
  isDarkMode: boolean;
  isSelected: boolean;
}

const getRelationStyle = (type: UMLRelationType): { strokeDasharray?: string; markerEnd: string; markerStart?: string } => {
  switch (type) {
    case 'association':
      return { markerEnd: 'none' };
    case 'directed':
      return { markerEnd: 'url(#arrow)' };
    case 'dependency':
      return { strokeDasharray: '5,5', markerEnd: 'url(#arrow)' };
    case 'aggregation':
      return { markerEnd: 'url(#diamond-hollow)' };
    case 'composition':
      return { markerEnd: 'url(#diamond-filled)' };
    case 'inheritance':
      return { markerEnd: 'url(#triangle-hollow)' };
    case 'realization':
      return { strokeDasharray: '5,5', markerEnd: 'url(#triangle-hollow)' };
    default:
      return { markerEnd: 'url(#arrow)' };
  }
};

export function UMLRelationLine({
  relation,
  sourceClass,
  targetClass,
  isDarkMode,
  isSelected,
}: UMLRelationLineProps) {
  if (!sourceClass || !targetClass) return null;

  // Calculate connection points (center of classes)
  const sourceX = sourceClass.x + 90; // Approximate center
  const sourceY = sourceClass.y + 40;
  const targetX = targetClass.x + 90;
  const targetY = targetClass.y + 40;

  const style = getRelationStyle(relation.type);
  const lineColor = isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)';
  const selectedColor = 'hsl(239 84% 67%)';

  // Calculate path with optional bend point
  let pathD: string;
  if (relation.bend) {
    pathD = `M ${sourceX} ${sourceY} Q ${relation.bend.x} ${relation.bend.y} ${targetX} ${targetY}`;
  } else {
    pathD = `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }

  // Calculate midpoint for label
  const midX = relation.bend ? relation.bend.x : (sourceX + targetX) / 2;
  const midY = relation.bend ? relation.bend.y : (sourceY + targetY) / 2;

  return (
    <g>
      {/* Main line */}
      <path
        d={pathD}
        fill="none"
        stroke={isSelected ? selectedColor : lineColor}
        strokeWidth={isSelected ? 2 : 1.5}
        strokeDasharray={style.strokeDasharray}
        markerEnd={style.markerEnd}
        markerStart={style.markerStart}
        className="transition-all duration-200"
      />

      {/* Relationship label */}
      {relation.label && (
        <text
          x={midX}
          y={midY - 8}
          textAnchor="middle"
          className="text-[10px] font-medium"
          fill={isDarkMode ? 'hsl(210 40% 98%)' : 'hsl(222 47% 11%)'}
        >
          {relation.label}
        </text>
      )}

      {/* Source multiplicity label */}
      {relation.sourceLabel && (
        <text
          x={sourceX + (targetX > sourceX ? 15 : -15)}
          y={sourceY + (targetY > sourceY ? 15 : -15)}
          textAnchor="middle"
          className="text-[9px] font-mono"
          fill={isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)'}
        >
          {relation.sourceLabel}
        </text>
      )}

      {/* Target multiplicity label */}
      {relation.targetLabel && (
        <text
          x={targetX + (sourceX > targetX ? 15 : -15)}
          y={targetY + (sourceY > targetY ? 15 : -15)}
          textAnchor="middle"
          className="text-[9px] font-mono"
          fill={isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)'}
        >
          {relation.targetLabel}
        </text>
      )}
    </g>
  );
}

// SVG Marker Definitions component
export function UMLMarkerDefs({ isDarkMode }: { isDarkMode: boolean }) {
  const color = isDarkMode ? 'hsl(215 20% 65%)' : 'hsl(215 16% 47%)';
  
  return (
    <defs>
      {/* Arrow marker */}
      <marker
        id="arrow"
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" fill={color} />
      </marker>

      {/* Hollow diamond (aggregation) */}
      <marker
        id="diamond-hollow"
        markerWidth="12"
        markerHeight="12"
        refX="12"
        refY="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path
          d="M0,6 L6,0 L12,6 L6,12 z"
          fill={isDarkMode ? 'hsl(222 47% 11%)' : 'white'}
          stroke={color}
          strokeWidth="1"
        />
      </marker>

      {/* Filled diamond (composition) */}
      <marker
        id="diamond-filled"
        markerWidth="12"
        markerHeight="12"
        refX="12"
        refY="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,6 L6,0 L12,6 L6,12 z" fill={color} />
      </marker>

      {/* Hollow triangle (inheritance/realization) */}
      <marker
        id="triangle-hollow"
        markerWidth="12"
        markerHeight="12"
        refX="12"
        refY="6"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path
          d="M0,0 L0,12 L12,6 z"
          fill={isDarkMode ? 'hsl(222 47% 11%)' : 'white'}
          stroke={color}
          strokeWidth="1"
        />
      </marker>
    </defs>
  );
}
