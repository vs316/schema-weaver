import { useMemo } from "react";
import type { FlowchartConnection, FlowchartConnectionType, FlowchartNode } from "../types/uml";
import { WaypointListEditor } from "./WaypointListEditor";

interface FlowchartConnectionEditorProps {
  connection: FlowchartConnection;
  isLocked: boolean;
  nodes?: FlowchartNode[];
  onUpdate: (updates: Partial<FlowchartConnection>) => void;
  onDelete: () => void;
}

const CONNECTION_TYPE_OPTIONS: Array<{ value: FlowchartConnectionType; label: string }> = [
  { value: "arrow", label: "Arrow" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "bidirectional", label: "Bidirectional" },
  { value: "conditional-yes", label: "Yes (Decision)" },
  { value: "conditional-no", label: "No (Decision)" },
  { value: "loop-back", label: "Loop-back" },
];

export function FlowchartConnectionEditor({
  connection,
  isLocked,
  nodes = [],
  onUpdate,
  onDelete,
}: FlowchartConnectionEditorProps) {
  const connectionType = useMemo<FlowchartConnectionType>(() => {
    return (connection.connectionType ?? "arrow") as FlowchartConnectionType;
  }, [connection.connectionType]);

  // Auto-route: Generate waypoints to route around intersecting nodes
  const handleAutoRoute = () => {
    if (isLocked) return;
    
    const sourceNode = nodes.find(n => n.id === connection.sourceNodeId);
    const targetNode = nodes.find(n => n.id === connection.targetNodeId);
    if (!sourceNode || !targetNode) return;

    const sx = sourceNode.x + 60; // center of node (assuming 120 width)
    const sy = sourceNode.y + 30; // center of node (assuming 60 height)
    const tx = targetNode.x + 60;
    const ty = targetNode.y + 30;

    // Find nodes that might intersect the straight line path
    const padding = 30;
    const intersectingNodes = nodes.filter(n => {
      if (n.id === connection.sourceNodeId || n.id === connection.targetNodeId) return false;
      
      const nx = n.x;
      const ny = n.y;
      const nw = 120;
      const nh = 60;
      
      // Check if node bbox intersects with line bounding box
      const minX = Math.min(sx, tx) - padding;
      const maxX = Math.max(sx, tx) + padding;
      const minY = Math.min(sy, ty) - padding;
      const maxY = Math.max(sy, ty) + padding;
      
      return !(nx + nw < minX || nx > maxX || ny + nh < minY || ny > maxY);
    });

    if (intersectingNodes.length === 0) {
      // No obstructions, clear waypoints
      onUpdate({ waypoints: [] });
      return;
    }

    // Generate waypoints to route around nodes
    const newWaypoints: Array<{ x: number; y: number }> = [];
    
    // Simple routing: go around the first intersecting node
    for (const node of intersectingNodes) {
      const ncx = node.x + 60;
      const ncy = node.y + 30;
      
      // Determine which side to route around
      const goRight = sx < ncx;
      const goDown = sy < ncy;
      
      const routeX = goRight ? node.x + 120 + padding : node.x - padding;
      const routeY = goDown ? node.y + 60 + padding : node.y - padding;
      
      // Add waypoints to go around
      if (Math.abs(sx - tx) > Math.abs(sy - ty)) {
        // Mostly horizontal - route vertically around
        newWaypoints.push({ x: ncx, y: routeY });
      } else {
        // Mostly vertical - route horizontally around
        newWaypoints.push({ x: routeX, y: ncy });
      }
    }

    onUpdate({ waypoints: newWaypoints });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
          Label
        </label>
        <input
          type="text"
          value={connection.label ?? ""}
          onChange={(e) => onUpdate({ label: e.target.value })}
          disabled={isLocked}
          className="w-full px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
          style={{
            background: "hsl(var(--background))",
            borderColor: "hsl(var(--border))",
            color: "hsl(var(--foreground))",
          }}
          placeholder="Optional label..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
            Type
          </label>
          <select
            value={connectionType}
            onChange={(e) => onUpdate({ connectionType: e.target.value as FlowchartConnectionType })}
            disabled={isLocked}
            className="w-full px-2 py-2 rounded-lg border text-xs disabled:opacity-50"
            style={{
              background: "hsl(var(--background))",
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--foreground))",
            }}
          >
            {CONNECTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
            Curvature
          </label>
          <select
            value={connection.lineType}
            onChange={(e) => onUpdate({ lineType: e.target.value as FlowchartConnection["lineType"] })}
            disabled={isLocked || connectionType === "loop-back"}
            className="w-full px-2 py-2 rounded-lg border text-xs disabled:opacity-50"
            style={{
              background: "hsl(var(--background))",
              borderColor: "hsl(var(--border))",
              color: "hsl(var(--foreground))",
            }}
          >
            <option value="curved">Curved</option>
            <option value="straight">Straight</option>
          </select>
        </div>
      </div>

      {/* Waypoint List Editor */}
      <WaypointListEditor
        connection={connection}
        isLocked={isLocked}
        onUpdateWaypoints={(waypoints) => onUpdate({ waypoints })}
        onAutoRoute={handleAutoRoute}
      />

      {!isLocked && (
        <button
          onClick={onDelete}
          className="w-full py-2 rounded-lg text-xs font-medium transition-colors bg-destructive/10 text-destructive hover:bg-destructive/20"
        >
          Delete Connection
        </button>
      )}
    </div>
  );
}
