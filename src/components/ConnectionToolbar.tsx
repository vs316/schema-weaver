import { motion, AnimatePresence } from 'framer-motion';
import { Link2, X, ArrowRight, ArrowUpRight, ArrowLeftRight, CornerUpLeft } from 'lucide-react';
import type { FlowchartConnectionType, UMLRelationType } from '../types/uml';
import { FLOWCHART_CONNECTION_LABELS, UML_RELATION_LABELS } from '../types/uml';
import { DraggableToolbar } from './DraggableToolbar';

interface ConnectionToolbarProps {
  isVisible: boolean;
  isDrawing: boolean;
  diagramType: 'uml-class' | 'flowchart';
  selectedRelationType?: UMLRelationType;
  selectedConnectionType?: FlowchartConnectionType;
  onStartConnection: () => void;
  onCancelConnection: () => void;
  onSelectRelationType?: (type: UMLRelationType) => void;
  onSelectConnectionType?: (type: FlowchartConnectionType) => void;
  isDarkMode: boolean;
}

const UML_RELATION_ICONS: Record<UMLRelationType, React.ReactNode> = {
  association: <div className="w-4 h-0.5 bg-current rounded-full" />,
  directed: <ArrowRight size={14} />,
  dependency: <div className="w-4 h-0.5" style={{ borderTop: '2px dashed currentColor' }} />,
  aggregation: <div className="w-2.5 h-2.5 border-2 border-current rotate-45" />,
  composition: <div className="w-2.5 h-2.5 bg-current rotate-45" />,
  inheritance: <ArrowUpRight size={14} />,
  realization: <div className="w-4 h-0.5" style={{ borderTop: '2px dashed currentColor' }} />,
};

const FLOWCHART_CONNECTION_ICONS: Record<FlowchartConnectionType, React.ReactNode> = {
  arrow: <ArrowRight size={14} />,
  dashed: <div className="w-4 h-0.5" style={{ borderTop: '2px dashed currentColor' }} />,
  dotted: <div className="w-4 h-0.5" style={{ borderTop: '2px dotted currentColor' }} />,
  bidirectional: <ArrowLeftRight size={14} />,
  'loop-back': <CornerUpLeft size={14} />,
  'conditional-yes': <div className="text-[10px] font-bold">Y</div>,
  'conditional-no': <div className="text-[10px] font-bold">N</div>,
};

export function ConnectionToolbar({
  isVisible,
  isDrawing,
  diagramType,
  selectedRelationType = 'association',
  selectedConnectionType = 'arrow',
  onStartConnection,
  onCancelConnection,
  onSelectRelationType,
  onSelectConnectionType,
  isDarkMode,
}: ConnectionToolbarProps) {
  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <DraggableToolbar
        isDarkMode={isDarkMode}
        label="Connect"
        className="top-6 left-1/2 -translate-x-1/2"
        isCollapsible={false}
      >
        {!isDrawing ? (
          <div className="flex items-center gap-2">
            {diagramType === 'uml-class' && onSelectRelationType && (
              <div className="flex items-center gap-1">
                {(Object.keys(UML_RELATION_LABELS) as UMLRelationType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => onSelectRelationType(type)}
                    className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                      selectedRelationType === type ? 'ring-2 ring-primary scale-110' : 'hover:scale-105'
                    }`}
                    style={{
                      background: selectedRelationType === type 
                        ? 'hsl(var(--primary) / 0.2)' 
                        : 'hsl(var(--muted) / 0.5)',
                      color: selectedRelationType === type
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--muted-foreground))',
                    }}
                    title={UML_RELATION_LABELS[type]}
                  >
                    {UML_RELATION_ICONS[type]}
                  </button>
                ))}
              </div>
            )}

            {diagramType === 'flowchart' && onSelectConnectionType && (
              <div className="flex items-center gap-1">
                {([
                  'arrow',
                  'dashed',
                  'dotted',
                  'bidirectional',
                  'loop-back',
                ] as FlowchartConnectionType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => onSelectConnectionType(type)}
                    className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all ${
                      selectedConnectionType === type ? 'ring-2 ring-primary scale-110' : 'hover:scale-105'
                    }`}
                    style={{
                      background:
                        selectedConnectionType === type
                          ? 'hsl(var(--primary) / 0.15)'
                          : 'hsl(var(--muted) / 0.5)',
                      color:
                        selectedConnectionType === type
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--muted-foreground))',
                    }}
                    title={FLOWCHART_CONNECTION_LABELS[type]}
                  >
                    {FLOWCHART_CONNECTION_ICONS[type]}
                  </button>
                ))}
              </div>
            )}

            <div className="w-px h-6 bg-border" />

            <motion.button
              onClick={onStartConnection}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs"
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link2 size={14} />
              Start {diagramType === 'uml-class' ? 'Relation' : 'Connection'}
            </motion.button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div 
              className="flex items-center gap-2"
              style={{ color: 'hsl(var(--primary))' }}
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Link2 size={16} />
              </motion.div>
              <span className="text-xs font-medium">
                Click target {diagramType === 'uml-class' ? 'class' : 'node'}...
              </span>
            </div>

            <motion.button
              onClick={onCancelConnection}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: 'hsl(var(--destructive) / 0.1)',
                color: 'hsl(var(--destructive))',
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={12} />
              Cancel
            </motion.button>
          </div>
        )}
      </DraggableToolbar>
    </AnimatePresence>
  );
}
