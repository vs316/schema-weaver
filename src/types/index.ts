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

export type Toast = {
  id: string;
  title: string;
  description?: string;
  type?: "success" | "error" | "info";
};

export type Viewport = {
  x: number;
  y: number;
  zoom: number;
};

export type Snapshot = {
  tables: Table[];
  relations: Relation[];
  viewport: Viewport;
};

export type SchemaTemplate = {
  name: string;
  description: string;
  tables: Table[];
  relations: Relation[];
};
