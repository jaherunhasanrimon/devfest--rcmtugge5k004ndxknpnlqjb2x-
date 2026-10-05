import { Building, RouteResult, Session } from './types';
import { buildUsableGraph, UsableGraph } from './graph';
import { codeUnitCompare } from './compare';

/**
 * Runs Dijkstra algorithm from a source node over the usable graph.
 * Returns a Map of nodeId -> shortest distance.
 */
export function runDijkstra(sourceId: string, graph: UsableGraph): Map<string, number> {
  const dist = new Map<string, number>();
  const visited = new Set<string>();

  if (!graph.activeNodeIds.has(sourceId)) {
    return dist;
  }

  dist.set(sourceId, 0);

  // Since graph size is at most 60 nodes, a linear scan for minimum unvisited distance is O(V^2), fast and bug-free.
  while (true) {
    let u: string | null = null;
    let minDist = Infinity;

    for (const [nodeId, d] of dist.entries()) {
      if (!visited.has(nodeId) && d < minDist) {
        minDist = d;
        u = nodeId;
      }
    }

    if (u === null || minDist === Infinity) {
      break;
    }

    visited.add(u);

    const neighbors = graph.adjacency.get(u) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.nodeId)) {
        continue;
      }
      const alt = minDist + edge.cost;
      const currentDist = dist.get(edge.nodeId) ?? Infinity;
      if (alt < currentDist) {
        dist.set(edge.nodeId, alt);
      }
    }
  }

  return dist;
}

/**
 * Computes the optimal evacuation route according to the competition spec.
 *
 * Rules:
 * 1. startId == null -> idle
 * 2. startId in blockedNodes -> start_blocked
 * 3. Filter graph (blocked nodes + incident edges, blocked edges, closed exits)
 * 4. Run Dijkstra from startId
 * 5. Choose open exit with min cost; tie-break: smallest exit ID via codeUnitCompare
 * 6. If no reachable open exit -> no_route
 * 7. Path tie-break: run Dijkstra from chosen exit, walk from start picking smallest neighbor ID
 *    satisfying edge.cost + distToExit[v] == distToExit[u]
 * 8. Return RouteResult
 */
export function computeRoute(building: Building, session: Session): RouteResult {
  const { startId, hazards } = session;

  // 1. startId == null -> idle
  if (!startId) {
    return { status: 'idle' };
  }

  // 2. Start is in blockedNodes -> start_blocked
  if (hazards.blockedNodes.includes(startId)) {
    return { status: 'start_blocked', startId };
  }

  // 3. Build usable graph
  const usableGraph = buildUsableGraph(building, hazards);

  // If start node is not active in the usable graph
  if (!usableGraph.activeNodeIds.has(startId)) {
    return { status: 'no_route', startId };
  }

  // 4. Run Dijkstra from start
  const distFromStart = runDijkstra(startId, usableGraph);

  // 5. Find reachable open exits
  const reachableExits: { exitId: string; cost: number }[] = [];
  for (const exitId of usableGraph.openExitIds) {
    const cost = distFromStart.get(exitId);
    if (cost !== undefined && Number.isFinite(cost)) {
      reachableExits.push({ exitId, cost });
    }
  }

  // 6. If no exit is reachable -> no_route
  if (reachableExits.length === 0) {
    return { status: 'no_route', startId };
  }

  // Sort by min cost, then lexicographically smallest exit ID
  reachableExits.sort((a, b) => {
    if (a.cost !== b.cost) {
      return a.cost - b.cost;
    }
    return codeUnitCompare(a.exitId, b.exitId);
  });

  const bestExit = reachableExits[0];
  const chosenExitId = bestExit.exitId;
  const totalCost = bestExit.cost;

  // 7. Path tie-break: compute distToExit for every node
  const distToExit = runDijkstra(chosenExitId, usableGraph);

  const nodePath: string[] = [startId];
  const edgePath: string[] = [];

  let current = startId;
  // Safety guard against infinite loops in unexpected graph configurations
  let steps = 0;
  const maxSteps = usableGraph.activeNodeIds.size + 1;

  while (current !== chosenExitId && steps < maxSteps) {
    steps++;
    const currentDist = distToExit.get(current);
    if (currentDist === undefined) {
      break;
    }

    const neighbors = usableGraph.adjacency.get(current) || [];
    // Valid next nodes on a shortest path to chosenExitId
    const candidates = neighbors.filter(nbr => {
      const nbrDist = distToExit.get(nbr.nodeId);
      return nbrDist !== undefined && nbr.cost + nbrDist === currentDist;
    });

    if (candidates.length === 0) {
      break;
    }

    // Pick candidate with smallest node ID
    candidates.sort((a, b) => codeUnitCompare(a.nodeId, b.nodeId));

    const chosenStep = candidates[0];
    nodePath.push(chosenStep.nodeId);
    edgePath.push(chosenStep.edgeId);
    current = chosenStep.nodeId;
  }

  return {
    status: 'route',
    startId,
    exitId: chosenExitId,
    cost: totalCost,
    nodePath,
    edgePath,
  };
}
