// UML Diagram Types

export type DiagramType = 'erd' | 'uml-class' | 'flowchart' | 'sequence';

// UML Class Diagram Types
export type Visibility = '+' | '-' | '#' | '~'; // public, private, protected, package

export interface UMLAttribute {
  id: string;
  visibility: Visibility;
  name: string;
  type: string;
  isStatic?: boolean;
}

export interface UMLMethod {
  id: string;
  visibility: Visibility;
  name: string;
  parameters: string;
  returnType: string;
  isStatic?: boolean;
  isAbstract?: boolean;
}

export interface UMLClass {
  id: string;
  name: string;
  stereotype?: string; // interface, abstract, enum, etc.
  x: number;
  y: number;
  attributes: UMLAttribute[];
  methods: UMLMethod[];
  color?: string;
  description?: string;
}

export type UMLRelationType = 
  | 'association'      // solid line, no arrow
  | 'directed'         // solid line with arrow
  | 'dependency'       // dashed line with arrow
  | 'aggregation'      // solid line with hollow diamond
  | 'composition'      // solid line with filled diamond
  | 'inheritance'      // solid line with hollow triangle
  | 'realization';     // dashed line with hollow triangle (implements)

export interface UMLRelation {
  id: string;
  sourceClassId: string;
  targetClassId: string;
  type: UMLRelationType;
  sourceLabel?: string;     // multiplicity like "1", "*", "0..1"
  targetLabel?: string;
  label?: string;           // relationship name
  bend?: { x: number; y: number };
}

// Flowchart Types
export type FlowchartNodeType = 
  | 'start-end'     // oval/rounded rectangle
  | 'process'       // rectangle
  | 'decision'      // diamond
  | 'input-output'  // parallelogram
  | 'document'      // document shape
  | 'data'          // parallelogram for data
  | 'connector';    // circle

export interface FlowchartNode {
  id: string;
  type: FlowchartNodeType;
  label: string;
  x: number;
  y: number;
  color?: string;
}

export interface FlowchartConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;      // like "Yes", "No" for decisions
  lineType: 'straight' | 'curved';
}

// Sequence Diagram Types (future expansion)
export interface SequenceParticipant {
  id: string;
  name: string;
  type: 'actor' | 'object' | 'boundary' | 'control' | 'entity';
  x: number;
}

export interface SequenceMessage {
  id: string;
  fromId: string;
  toId: string;
  label: string;
  type: 'sync' | 'async' | 'return' | 'create' | 'destroy';
  order: number;
}

// Generic diagram wrapper
export interface GenericDiagram {
  id: string;
  name: string;
  type: DiagramType;
  created_at: string;
  updated_at: string;
  team_id: string | null;
  
  // ERD specific
  tables?: unknown[];
  relations?: unknown[];
  
  // UML Class specific
  classes?: UMLClass[];
  umlRelations?: UMLRelation[];
  
  // Flowchart specific
  nodes?: FlowchartNode[];
  connections?: FlowchartConnection[];
  
  // Sequence specific
  participants?: SequenceParticipant[];
  messages?: SequenceMessage[];
  
  viewport: { x: number; y: number; zoom: number };
  is_dark_mode: boolean;
  is_locked: boolean;
}

// Visibility symbol helpers
export const VISIBILITY_SYMBOLS: Record<Visibility, string> = {
  '+': 'public',
  '-': 'private',
  '#': 'protected',
  '~': 'package',
};

export const UML_RELATION_LABELS: Record<UMLRelationType, string> = {
  association: 'Association',
  directed: 'Directed Association',
  dependency: 'Dependency',
  aggregation: 'Aggregation',
  composition: 'Composition',
  inheritance: 'Inheritance (extends)',
  realization: 'Realization (implements)',
};

export const FLOWCHART_NODE_LABELS: Record<FlowchartNodeType, string> = {
  'start-end': 'Start/End',
  'process': 'Process',
  'decision': 'Decision',
  'input-output': 'Input/Output',
  'document': 'Document',
  'data': 'Data',
  'connector': 'Connector',
};
