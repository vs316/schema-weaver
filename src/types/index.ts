export type Column = {
  id: string;
  name: string;
  type: string;
  isPk: boolean;
  isFk: boolean;
};

export type TableNote = {
  id: string;
  content: string;
  author_id: string;
  author_email: string;
  created_at: string;
};

export type TableQuestion = {
  id: string;
  content: string;
  author_id: string;
  author_email: string;
  created_at: string;
  resolved?: boolean;
};

export type TableChange = {
  id: string;
  content: string;
  author_id: string;
  author_email: string;
  created_at: string;
  type: 'added' | 'modified' | 'removed';
};

export type TableFix = {
  id: string;
  content: string;
  author_id: string;
  author_email: string;
  created_at: string;
  priority: 'low' | 'medium' | 'high';
};

export type TableComment = {
  id: string;
  diagram_id?: string;
  table_id?: string;
  author_id: string;
  author_email: string;
  content: string;
  created_at: string;
  updated_at?: string;
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
  notes?: TableNote[];
  questions?: TableQuestion[];
  changes?: TableChange[];
  fixes?: TableFix[];
};

export type TeamRole = 'owner' | 'admin' | 'member' | 'dev' | 'reader' | 'viewer';

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
