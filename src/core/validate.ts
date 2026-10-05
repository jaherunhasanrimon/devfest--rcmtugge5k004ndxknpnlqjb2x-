import { Building, GEdge, GNode, HazardState, NodeType, RawBuildingJson, ValidationIssue } from './types';

export type ValidationResult =
  | { valid: true; building: Building }
  | { valid: false; issues: ValidationIssue[] };

export function validateBuilding(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  let data: RawBuildingJson;
  if (typeof input === 'string') {
    try {
      data = JSON.parse(input);
    } catch {
      return {
        valid: false,
        issues: [{ code: 'INVALID_JSON', path: '$', params: {} }],
      };
    }
  } else {
    data = input as RawBuildingJson;
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {
      valid: false,
      issues: [{ code: 'ROOT_NOT_OBJECT', path: '$', params: {} }],
    };
  }

  // 1. Building name
  if (typeof data.building !== 'string' || data.building.trim().length === 0) {
    issues.push({
      code: 'BUILDING_NAME_REQUIRED',
      path: 'building',
    });
  }

  // 2. Nodes
  const nodeMap = new Map<string, GNode>();
  let hasRoomOrJunction = false;
  let hasExit = false;

  if (!Array.isArray(data.nodes)) {
    issues.push({
      code: 'NODES_NOT_ARRAY',
      path: 'nodes',
    });
  } else {
    const nodesCount = data.nodes.length;
    if (nodesCount < 2 || nodesCount > 60) {
      issues.push({
        code: 'NODES_COUNT_INVALID',
        path: 'nodes',
        params: { count: nodesCount, min: 2, max: 60 },
      });
    }

    const seenNodeIds = new Set<string>();

    data.nodes.forEach((rawNode, index) => {
      const nodePath = `nodes[${index}]`;
      if (!rawNode || typeof rawNode !== 'object' || Array.isArray(rawNode)) {
        issues.push({
          code: 'NODE_INVALID',
          path: nodePath,
        });
        return;
      }

      const nodeObj = rawNode as Record<string, unknown>;

      // Node ID
      const id = nodeObj.id;
      let validId: string | null = null;
      if (typeof id !== 'string' || id.trim().length === 0) {
        issues.push({
          code: 'NODE_ID_REQUIRED',
          path: `${nodePath}.id`,
        });
      } else {
        if (seenNodeIds.has(id)) {
          issues.push({
            code: 'NODE_ID_DUPLICATE',
            path: `${nodePath}.id`,
            params: { id },
          });
        } else {
          seenNodeIds.add(id);
          validId = id;
        }
      }

      // Label
      const label = nodeObj.label;
      if (typeof label !== 'string' || label.trim().length === 0) {
        issues.push({
          code: 'NODE_LABEL_REQUIRED',
          path: `${nodePath}.label`,
          params: { id: typeof id === 'string' ? id : `index_${index}` },
        });
      }

      // Type
      const type = nodeObj.type;
      const validTypes: NodeType[] = ['room', 'junction', 'exit'];
      let validType: NodeType | null = null;
      if (typeof type !== 'string' || !validTypes.includes(type as NodeType)) {
        issues.push({
          code: 'NODE_TYPE_INVALID',
          path: `${nodePath}.type`,
          params: { id: typeof id === 'string' ? id : `index_${index}`, type: String(type) },
        });
      } else {
        validType = type as NodeType;
        if (validType === 'room' || validType === 'junction') {
          hasRoomOrJunction = true;
        } else if (validType === 'exit') {
          hasExit = true;
        }
      }

      // Coordinates
      const x = nodeObj.x;
      const y = nodeObj.y;
      if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) {
        issues.push({
          code: 'NODE_COORDINATES_INVALID',
          path: `${nodePath}.coordinates`,
          params: { id: typeof id === 'string' ? id : `index_${index}` },
        });
      }

      if (
        validId &&
        typeof label === 'string' &&
        label.trim().length > 0 &&
        validType &&
        typeof x === 'number' &&
        Number.isFinite(x) &&
        typeof y === 'number' &&
        Number.isFinite(y)
      ) {
        nodeMap.set(validId, {
          id: validId,
          label: label.trim(),
          type: validType,
          x,
          y,
        });
      }
    });

    if (Array.isArray(data.nodes) && data.nodes.length >= 2) {
      if (!hasRoomOrJunction) {
        issues.push({
          code: 'NO_ROOM_OR_JUNCTION',
          path: 'nodes',
        });
      }
      if (!hasExit) {
        issues.push({
          code: 'NO_EXIT',
          path: 'nodes',
        });
      }
    }
  }

  // 3. Edges
  const edgeList: GEdge[] = [];
  const edgeMap = new Map<string, GEdge>();
  const seenNodePairs = new Set<string>();

  if (!Array.isArray(data.edges)) {
    issues.push({
      code: 'EDGES_NOT_ARRAY',
      path: 'edges',
    });
  } else {
    const edgesCount = data.edges.length;
    if (edgesCount < 1 || edgesCount > 150) {
      issues.push({
        code: 'EDGES_COUNT_INVALID',
        path: 'edges',
        params: { count: edgesCount, min: 1, max: 150 },
      });
    }

    const seenEdgeIds = new Set<string>();

    data.edges.forEach((rawEdge, index) => {
      const edgePath = `edges[${index}]`;
      if (!rawEdge || typeof rawEdge !== 'object' || Array.isArray(rawEdge)) {
        issues.push({
          code: 'EDGE_INVALID',
          path: edgePath,
        });
        return;
      }

      const edgeObj = rawEdge as Record<string, unknown>;

      // Edge ID
      const id = edgeObj.id;
      let validEdgeId: string | null = null;
      if (typeof id !== 'string' || id.trim().length === 0) {
        issues.push({
          code: 'EDGE_ID_REQUIRED',
          path: `${edgePath}.id`,
        });
      } else {
        if (seenEdgeIds.has(id)) {
          issues.push({
            code: 'EDGE_ID_DUPLICATE',
            path: `${edgePath}.id`,
            params: { id },
          });
        } else {
          seenEdgeIds.add(id);
          validEdgeId = id;
        }
      }

      // from & to
      const from = edgeObj.from;
      const to = edgeObj.to;
      let hasValidFrom = false;
      let hasValidTo = false;

      if (typeof from !== 'string' || !nodeMap.has(from)) {
        issues.push({
          code: 'EDGE_FROM_INVALID',
          path: `${edgePath}.from`,
          params: { id: typeof id === 'string' ? id : `index_${index}`, from: String(from) },
        });
      } else {
        hasValidFrom = true;
      }

      if (typeof to !== 'string' || !nodeMap.has(to)) {
        issues.push({
          code: 'EDGE_TO_INVALID',
          path: `${edgePath}.to`,
          params: { id: typeof id === 'string' ? id : `index_${index}`, to: String(to) },
        });
      } else {
        hasValidTo = true;
      }

      if (hasValidFrom && hasValidTo) {
        if (from === to) {
          issues.push({
            code: 'EDGE_SELF_LOOP',
            path: edgePath,
            params: { id: typeof id === 'string' ? id : `index_${index}`, node: from as string },
          });
        } else {
          // Unordered pair check
          const pairKey = (from as string) < (to as string)
            ? `${from}:${to}`
            : `${to}:${from}`;
          if (seenNodePairs.has(pairKey)) {
            issues.push({
              code: 'EDGE_DUPLICATE_PAIR',
              path: edgePath,
              params: { id: typeof id === 'string' ? id : `index_${index}`, from: String(from), to: String(to) },
            });
          } else {
            seenNodePairs.add(pairKey);
          }
        }
      }

      // Cost (positive integer)
      const cost = edgeObj.cost;
      let validCost: number | null = null;
      if (typeof cost !== 'number' || !Number.isInteger(cost) || cost <= 0) {
        issues.push({
          code: 'EDGE_COST_INVALID',
          path: `${edgePath}.cost`,
          params: { id: typeof id === 'string' ? id : `index_${index}`, cost: String(cost) },
        });
      } else {
        validCost = cost;
      }

      if (validEdgeId && hasValidFrom && hasValidTo && from !== to && validCost !== null) {
        const edge: GEdge = {
          id: validEdgeId,
          from: from as string,
          to: to as string,
          cost: validCost,
        };
        edgeList.push(edge);
        edgeMap.set(validEdgeId, edge);
      }
    });
  }

  // 4. Initial state
  let initialHazardState: HazardState = {
    blockedNodes: [],
    blockedEdges: [],
    closedExits: [],
  };

  if (!data.initial_state || typeof data.initial_state !== 'object' || Array.isArray(data.initial_state)) {
    issues.push({
      code: 'INITIAL_STATE_REQUIRED',
      path: 'initial_state',
    });
  } else {
    const rawInit = data.initial_state as Record<string, unknown>;

    // blocked_nodes
    if (!Array.isArray(rawInit.blocked_nodes)) {
      issues.push({
        code: 'BLOCKED_NODES_NOT_ARRAY',
        path: 'initial_state.blocked_nodes',
      });
    } else {
      const deDupedNodes = Array.from(new Set(rawInit.blocked_nodes.map(String)));
      for (const nid of deDupedNodes) {
        const node = nodeMap.get(nid);
        if (!node) {
          issues.push({
            code: 'BLOCKED_NODE_NOT_FOUND',
            path: 'initial_state.blocked_nodes',
            params: { id: nid },
          });
        } else if (node.type === 'exit') {
          issues.push({
            code: 'BLOCKED_NODE_NOT_ROOM_OR_JUNCTION',
            path: 'initial_state.blocked_nodes',
            params: { id: nid },
          });
        }
      }
      initialHazardState.blockedNodes = deDupedNodes;
    }

    // blocked_edges
    if (!Array.isArray(rawInit.blocked_edges)) {
      issues.push({
        code: 'BLOCKED_EDGES_NOT_ARRAY',
        path: 'initial_state.blocked_edges',
      });
    } else {
      const deDupedEdges = Array.from(new Set(rawInit.blocked_edges.map(String)));
      for (const eid of deDupedEdges) {
        if (!edgeMap.has(eid)) {
          issues.push({
            code: 'BLOCKED_EDGE_NOT_FOUND',
            path: 'initial_state.blocked_edges',
            params: { id: eid },
          });
        }
      }
      initialHazardState.blockedEdges = deDupedEdges;
    }

    // closed_exits
    if (!Array.isArray(rawInit.closed_exits)) {
      issues.push({
        code: 'CLOSED_EXITS_NOT_ARRAY',
        path: 'initial_state.closed_exits',
      });
    } else {
      const deDupedExits = Array.from(new Set(rawInit.closed_exits.map(String)));
      for (const eid of deDupedExits) {
        const node = nodeMap.get(eid);
        if (!node) {
          issues.push({
            code: 'CLOSED_EXIT_NOT_FOUND',
            path: 'initial_state.closed_exits',
            params: { id: eid },
          });
        } else if (node.type !== 'exit') {
          issues.push({
            code: 'CLOSED_EXIT_NOT_EXIT',
            path: 'initial_state.closed_exits',
            params: { id: eid },
          });
        }
      }
      initialHazardState.closedExits = deDupedExits;
    }
  }

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const building: Building = {
    name: (data.building as string).trim(),
    nodes: Array.from(nodeMap.values()),
    edges: edgeList,
    initial: initialHazardState,
  };

  return { valid: true, building };
}
