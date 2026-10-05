export type NodeType = 'room' | 'junction' | 'exit';

export interface GNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
}

export interface GEdge {
  id: string;
  from: string;
  to: string;
  cost: number; // undirected, positive integer
}

export interface HazardState {
  blockedNodes: string[];
  blockedEdges: string[];
  closedExits: string[];
}

export interface Building {
  name: string;
  nodes: GNode[];
  edges: GEdge[];
  initial: HazardState;
}

export interface Session {
  startId: string | null;
  hazards: HazardState;
}

export type RouteResult =
  | { status: 'idle' }
  | { status: 'start_blocked'; startId: string }
  | { status: 'no_route'; startId: string }
  | {
      status: 'route';
      startId: string;
      exitId: string;
      cost: number;
      nodePath: string[]; // sequence of node ids, e.g. ['R1', 'C1', 'C2', 'E1']
      edgePath: string[]; // sequence of edge ids, for highlighting
    };

export interface ValidationIssue {
  code: string;
  path?: string;
  params?: Record<string, string | number>;
}

export interface RawBuildingJson {
  building?: unknown;
  nodes?: unknown;
  edges?: unknown;
  initial_state?: unknown;
  [key: string]: unknown;
}
