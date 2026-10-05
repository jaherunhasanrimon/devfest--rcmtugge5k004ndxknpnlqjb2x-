import { Building, GEdge, GNode, HazardState } from './types';

export interface GraphNeighbor {
  nodeId: string;
  edgeId: string;
  cost: number;
}

export interface UsableGraph {
  activeNodeIds: Set<string>;
  activeNodes: Map<string, GNode>;
  activeEdges: Map<string, GEdge>;
  adjacency: Map<string, GraphNeighbor[]>;
  openExitIds: Set<string>;
}

/**
 * Builds the usable graph by removing:
 * - nodes in blockedNodes and all incident edges
 * - edges in blockedEdges
 * - exits in closedExits (neither destinations nor intermediate nodes)
 */
export function buildUsableGraph(building: Building, hazards: HazardState): UsableGraph {
  const blockedNodeSet = new Set(hazards.blockedNodes);
  const blockedEdgeSet = new Set(hazards.blockedEdges);
  const closedExitSet = new Set(hazards.closedExits);

  const activeNodeIds = new Set<string>();
  const activeNodes = new Map<string, GNode>();
  const openExitIds = new Set<string>();

  for (const node of building.nodes) {
    if (blockedNodeSet.has(node.id)) {
      continue;
    }
    if (node.type === 'exit') {
      if (closedExitSet.has(node.id)) {
        continue;
      }
      openExitIds.add(node.id);
    }
    activeNodeIds.add(node.id);
    activeNodes.set(node.id, node);
  }

  const activeEdges = new Map<string, GEdge>();
  const adjacency = new Map<string, GraphNeighbor[]>();

  for (const nodeId of activeNodeIds) {
    adjacency.set(nodeId, []);
  }

  for (const edge of building.edges) {
    if (blockedEdgeSet.has(edge.id)) {
      continue;
    }
    // Both endpoints must be active
    if (!activeNodeIds.has(edge.from) || !activeNodeIds.has(edge.to)) {
      continue;
    }

    activeEdges.set(edge.id, edge);

    adjacency.get(edge.from)!.push({
      nodeId: edge.to,
      edgeId: edge.id,
      cost: edge.cost,
    });

    adjacency.get(edge.to)!.push({
      nodeId: edge.from,
      edgeId: edge.id,
      cost: edge.cost,
    });
  }

  return {
    activeNodeIds,
    activeNodes,
    activeEdges,
    adjacency,
    openExitIds,
  };
}
