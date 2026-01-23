import { Trash2, ArrowUp, ArrowDown, RotateCcw, Wand2 } from 'lucide-react';
import type { FlowchartConnection } from '../types/uml';

interface WaypointListEditorProps {
  connection: FlowchartConnection;
  isLocked: boolean;
  onUpdateWaypoints: (waypoints: Array<{ x: number; y: number }>) => void;
  onAutoRoute: () => void;
}

export function WaypointListEditor({
  connection,
  isLocked,
  onUpdateWaypoints,
  onAutoRoute,
}: WaypointListEditorProps) {
  const waypoints = connection.waypoints ?? [];

  const handleMoveUp = (index: number) => {
    if (index === 0 || isLocked) return;
    const newWaypoints = [...waypoints];
    [newWaypoints[index - 1], newWaypoints[index]] = [newWaypoints[index], newWaypoints[index - 1]];
    onUpdateWaypoints(newWaypoints);
  };

  const handleMoveDown = (index: number) => {
    if (index === waypoints.length - 1 || isLocked) return;
    const newWaypoints = [...waypoints];
    [newWaypoints[index], newWaypoints[index + 1]] = [newWaypoints[index + 1], newWaypoints[index]];
    onUpdateWaypoints(newWaypoints);
  };

  const handleDelete = (index: number) => {
    if (isLocked) return;
    const newWaypoints = waypoints.filter((_, i) => i !== index);
    onUpdateWaypoints(newWaypoints);
  };

  const handleCoordinateChange = (index: number, axis: 'x' | 'y', value: string) => {
    if (isLocked) return;
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    const newWaypoints = waypoints.map((wp, i) =>
      i === index ? { ...wp, [axis]: numValue } : wp
    );
    onUpdateWaypoints(newWaypoints);
  };

  const handleReset = () => {
    if (isLocked) return;
    onUpdateWaypoints([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label 
          className="text-xs font-medium"
          style={{ color: 'hsl(var(--muted-foreground))' }}
        >
          Waypoints ({waypoints.length})
        </label>
        <div className="flex gap-1">
          <button
            onClick={onAutoRoute}
            disabled={isLocked}
            className="p-1.5 rounded-lg text-xs transition-colors hover:bg-primary/10 disabled:opacity-50"
            style={{ color: 'hsl(var(--primary))' }}
            title="Auto-route around nodes"
          >
            <Wand2 size={14} />
          </button>
          {waypoints.length > 0 && (
            <button
              onClick={handleReset}
              disabled={isLocked}
              className="p-1.5 rounded-lg text-xs transition-colors hover:bg-destructive/10 disabled:opacity-50"
              style={{ color: 'hsl(var(--destructive))' }}
              title="Reset all waypoints"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {waypoints.length === 0 ? (
        <div 
          className="text-xs text-center py-3 rounded-lg border border-dashed"
          style={{ 
            color: 'hsl(var(--muted-foreground))',
            borderColor: 'hsl(var(--border))',
          }}
        >
          No waypoints. Shift+click on connection to add.
        </div>
      ) : (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {waypoints.map((wp, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg border"
              style={{
                background: 'hsl(var(--card))',
                borderColor: 'hsl(var(--border))',
              }}
            >
              <span 
                className="text-[10px] font-bold w-4"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {index + 1}
              </span>
              
              <div className="flex items-center gap-1 flex-1">
                <label className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>X</label>
                <input
                  type="number"
                  value={Math.round(wp.x)}
                  onChange={(e) => handleCoordinateChange(index, 'x', e.target.value)}
                  disabled={isLocked}
                  className="w-16 px-2 py-1 rounded text-xs border disabled:opacity-50"
                  style={{
                    background: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <label className="text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>Y</label>
                <input
                  type="number"
                  value={Math.round(wp.y)}
                  onChange={(e) => handleCoordinateChange(index, 'y', e.target.value)}
                  disabled={isLocked}
                  className="w-16 px-2 py-1 rounded text-xs border disabled:opacity-50"
                  style={{
                    background: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                  }}
                />
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={isLocked || index === 0}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={isLocked || index === waypoints.length - 1}
                  className="p-1 rounded hover:bg-muted disabled:opacity-30"
                  style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  disabled={isLocked}
                  className="p-1 rounded hover:bg-destructive/10 disabled:opacity-50"
                  style={{ color: 'hsl(var(--destructive))' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p 
        className="text-[10px] leading-relaxed"
        style={{ color: 'hsl(var(--muted-foreground))' }}
      >
        <strong>Shift+click</strong> on connection to add waypoint.
        <br />
        <strong>Alt+click</strong> on waypoint to remove it.
        <br />
        <strong>Drag</strong> waypoint handles to reposition.
      </p>
    </div>
  );
}
