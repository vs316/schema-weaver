export type Column = {
  id: string;
  name: string;
  type: string;
  isPk: boolean;
  isFk: boolean;
};

export type TableComment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
};

export type Table = {
  id: string;
  name: string;
  x: number;
  y: number;
  columns: Column[];
  color?: string;
  description?: string;
  comments?: TableComment[];
};

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: TeamRole;
  display_name?: string;
  email?: string;
}

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
