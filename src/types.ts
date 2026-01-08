// Updated src/types.ts with new features

export type Column = {
  id: string;
  name: string;
  type: string;
  isPk: boolean;
  isFk: boolean;
};

export type Table = {
  id: string;
  name: string;
  x: number;
  y: number;
  columns: Column[];
  color?: string;
  description?: string; // Feature 3: Table description
};

export type Relation = {
  id: string;
  sourceTableId: string;
  targetTableId: string;
  label?: string;
  isDashed: boolean;
  lineType: "curved" | "straight";
  bend?: { x: number; y: number };
};

export type TableComment = {
  id: string;
  diagram_id: string;
  table_id: string;
  author_id: string;
  author_email: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type DiagramLockState = {
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
};