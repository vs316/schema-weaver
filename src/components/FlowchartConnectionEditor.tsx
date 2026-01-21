import React, { useMemo } from "react";
import type { FlowchartConnection, FlowchartConnectionType } from "@/types/uml";

interface FlowchartConnectionEditorProps {
  connection: FlowchartConnection;
  isLocked: boolean;
  onUpdate: (updates: Partial<FlowchartConnection>) => void;
  onDelete: () => void;
}

const CONNECTION_TYPE_OPTIONS: Array<{ value: FlowchartConnectionType; label: string }> = [
  { value: "arrow", label: "Arrow" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "bidirectional", label: "Bidirectional" },
  { value: "loop-back", label: "Loop-back" },
];

export function FlowchartConnectionEditor({
  connection,
  isLocked,
  onUpdate,
  onDelete,
}: FlowchartConnectionEditorProps) {
  const connectionType = useMemo<FlowchartConnectionType>(() => {
    return (connection.connectionType ?? "arrow") as FlowchartConnectionType;
  }, [connection.connectionType]);

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
