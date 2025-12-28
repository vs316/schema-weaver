export const TABLE_WIDTH = 224;
export const HEADER_HEIGHT = 40;
export const ANCHOR_X = TABLE_WIDTH / 2;
export const ANCHOR_Y = 20;
export const GRID_SIZE = 12;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 3;
export const ZOOM_SPEED = 0.001;

export const COLUMN_TYPES = ["INT", "UUID", "VARCHAR", "TEXT", "BOOL", "DATETIME", "DECIMAL"] as const;

export const TABLE_COLORS = [
  "#64748b", // slate
  "#6366f1", // indigo
  "#60a5fa", // blue
  "#34d399", // emerald
  "#f59e0b", // amber
  "#a78bfa", // violet
  "#ef4444", // red
  "#f472b6", // pink
] as const;
