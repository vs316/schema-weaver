
import { motion, AnimatePresence } from 'framer-motion';

interface WaypointDragHUDProps {
  visible: boolean;
  position: { x: number; y: number };
  worldPosition: { x: number; y: number };
  isSnapped: boolean;
  isAvoiding: boolean;
  viewport: { x: number; y: number; zoom: number };
}

export function WaypointDragHUD({
  visible,
  position,
  worldPosition,
  isSnapped,
  isAvoiding,
}: WaypointDragHUDProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.1 }}
          className="fixed pointer-events-none z-50"
          style={{
            left: position.x + 20,
            top: position.y - 40,
          }}
        >
          <div
            className="px-2.5 py-1.5 rounded-lg shadow-lg border backdrop-blur-sm"
            style={{
              background: 'hsl(222 47% 11% / 0.95)',
              borderColor: 'hsl(var(--border))',
            }}
          >
            <div className="flex items-center gap-3">
              {/* Coordinates */}
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>X:</span>
                <span style={{ color: 'hsl(var(--foreground))' }}>{Math.round(worldPosition.x)}</span>
                <span style={{ color: 'hsl(var(--muted-foreground))' }}>Y:</span>
                <span style={{ color: 'hsl(var(--foreground))' }}>{Math.round(worldPosition.y)}</span>
              </div>

              {/* Status indicators */}
              <div className="flex items-center gap-1.5">
                {isSnapped && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                    style={{
                      background: 'hsl(var(--primary) / 0.2)',
                      color: 'hsl(var(--primary))',
                    }}
                  >
                    SNAP
                  </span>
                )}
                {isAvoiding && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                    style={{
                      background: 'hsl(var(--warning) / 0.2)',
                      color: 'hsl(var(--warning))',
                    }}
                  >
                    AVOID
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
