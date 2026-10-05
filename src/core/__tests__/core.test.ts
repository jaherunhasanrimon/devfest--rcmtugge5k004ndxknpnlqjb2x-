import { describe, it, expect } from 'vitest';
import sampleJsonRaw from '../../../public/sample/building.json';
import {
  Building,
  Session,
  validateBuilding,
  computeRoute,
  createInitialSession,
  toggleNodeBlock,
  toggleEdgeBlock,
  toggleExitClosed,
  resetSession,
  codeUnitCompare,
  compareNodeIdSequences,
} from '../index';

const sampleValidation = validateBuilding(sampleJsonRaw);
if (!sampleValidation.valid) {
  throw new Error(`Sample building failed validation: ${JSON.stringify(sampleValidation.issues)}`);
}
const sampleBuilding: Building = sampleValidation.building;

describe('Smart Escape Core Engine', () => {
  describe('String and Code-Unit Comparison', () => {
    it('strictly follows code-unit comparison (E10 < E2)', () => {
      expect(codeUnitCompare('E10', 'E2')).toBe(-1);
      expect(codeUnitCompare('E2', 'E10')).toBe(1);
      expect(codeUnitCompare('A', 'A')).toBe(0);
      expect(codeUnitCompare('a', 'A')).toBe(1);
    });

    it('correctly compares node ID sequences lexicographically', () => {
      expect(compareNodeIdSequences(['R1', 'C1', 'E1'], ['R1', 'C2', 'E1'])).toBe(-1);
      expect(compareNodeIdSequences(['R1', 'C2', 'E1'], ['R1', 'C1', 'E1'])).toBe(1);
      expect(compareNodeIdSequences(['R1', 'C1'], ['R1', 'C1', 'E1'])).toBe(-1);
    });
  });

  describe('Problem Statement Sample Checks', () => {
    it('1. Baseline: Select R1 -> R1 - C1 - C2 - E1; cost 7', () => {
      const session: Session = {
        startId: 'R1',
        hazards: { blockedNodes: [], blockedEdges: [], closedExits: [] },
      };
      const res = computeRoute(sampleBuilding, session);
      expect(res.status).toBe('route');
      if (res.status === 'route') {
        expect(res.cost).toBe(7);
        expect(res.exitId).toBe('E1');
        expect(res.nodePath).toEqual(['R1', 'C1', 'C2', 'E1']);
        expect(res.edgePath).toEqual(['L01', 'L02', 'L03']);
      }
    });

    it('2. Blocked junction: Select R1; block C2 -> R1 - C1 - C3 - C4 - E2; cost 11', () => {
      let session = createInitialSession(sampleBuilding);
      session = { ...session, startId: 'R1' };
      session = toggleNodeBlock(session, 'C2');

      const res = computeRoute(sampleBuilding, session);
      expect(res.status).toBe('route');
      if (res.status === 'route') {
        expect(res.cost).toBe(11);
        expect(res.exitId).toBe('E2');
        expect(res.nodePath).toEqual(['R1', 'C1', 'C3', 'C4', 'E2']);
        expect(res.edgePath).toEqual(['L01', 'L08', 'L06', 'L07']);
      }
    });

    it('3. Exits closed: Select R1; close E1 and E2 -> No route available', () => {
      let session = createInitialSession(sampleBuilding);
      session = { ...session, startId: 'R1' };
      session = toggleExitClosed(session, 'E1');
      session = toggleExitClosed(session, 'E2');

      const res = computeRoute(sampleBuilding, session);
      expect(res.status).toBe('no_route');
      if (res.status === 'no_route') {
        expect(res.startId).toBe('R1');
      }
    });

    it('4. Different start: Select R2 -> R2 - C3 - C4 - E2; cost 7', () => {
      let session = createInitialSession(sampleBuilding);
      session = { ...session, startId: 'R2' };

      const res = computeRoute(sampleBuilding, session);
      expect(res.status).toBe('route');
      if (res.status === 'route') {
        expect(res.cost).toBe(7);
        expect(res.exitId).toBe('E2');
        expect(res.nodePath).toEqual(['R2', 'C3', 'C4', 'E2']);
        expect(res.edgePath).toEqual(['L05', 'L06', 'L07']);
      }
    });

    it('5. Blocked start: Select R1; then block R1 -> Starting location blocked', () => {
      let session = createInitialSession(sampleBuilding);
      session = { ...session, startId: 'R1' };
      session = toggleNodeBlock(session, 'R1');

      const res = computeRoute(sampleBuilding, session);
      expect(res.status).toBe('start_blocked');
      if (res.status === 'start_blocked') {
        expect(res.startId).toBe('R1');
      }
    });
  });

  describe('Edge Cases and Section 10 Fixtures', () => {
    it('6. Equal-cost exits: smallest exit ID wins (including E10 vs E2)', () => {
      // Graph with start R, connected to E10 (cost 5) and E2 (cost 5)
      // Since 'E10' < 'E2' in code-unit comparison, E10 must be chosen
      const building: Building = {
        name: 'Equal Cost Exits',
        nodes: [
          { id: 'R', label: 'Room', type: 'room', x: 0, y: 0 },
          { id: 'E10', label: 'Exit 10', type: 'exit', x: 10, y: 0 },
          { id: 'E2', label: 'Exit 2', type: 'exit', x: 0, y: 10 },
        ],
        edges: [
          { id: 'e1', from: 'R', to: 'E10', cost: 5 },
          { id: 'e2', from: 'R', to: 'E2', cost: 5 },
        ],
        initial: { blockedNodes: [], blockedEdges: [], closedExits: [] },
      };

      const session: Session = {
        startId: 'R',
        hazards: { blockedNodes: [], blockedEdges: [], closedExits: [] },
      };

      const res = computeRoute(building, session);
      expect(res.status).toBe('route');
      if (res.status === 'route') {
        expect(res.cost).toBe(5);
        expect(res.exitId).toBe('E10');
        expect(res.nodePath).toEqual(['R', 'E10']);
      }
    });

    it('7. Equal-cost paths to the same exit: smallest node-ID sequence wins', () => {
      // Graph: R connects to C1 and C2 (both cost 2).
      // C1 connects to E (cost 3), C2 connects to E (cost 3).
      // Paths: R -> C1 -> E (cost 5) vs R -> C2 -> E (cost 5).
      // Since C1 < C2, sequence R-C1-E must be chosen.
      const building: Building = {
        name: 'Equal Cost Paths',
        nodes: [
          { id: 'R', label: 'Room', type: 'room', x: 0, y: 0 },
          { id: 'C1', label: 'Junction 1', type: 'junction', x: 10, y: 0 },
          { id: 'C2', label: 'Junction 2', type: 'junction', x: 10, y: 10 },
          { id: 'E', label: 'Exit', type: 'exit', x: 20, y: 0 },
        ],
        edges: [
          { id: 'e1', from: 'R', to: 'C2', cost: 2 },
          { id: 'e2', from: 'R', to: 'C1', cost: 2 },
          { id: 'e3', from: 'C2', to: 'E', cost: 3 },
          { id: 'e4', from: 'C1', to: 'E', cost: 3 },
        ],
        initial: { blockedNodes: [], blockedEdges: [], closedExits: [] },
      };

      const session: Session = {
        startId: 'R',
        hazards: { blockedNodes: [], blockedEdges: [], closedExits: [] },
      };

      const res = computeRoute(building, session);
      expect(res.status).toBe('route');
      if (res.status === 'route') {
        expect(res.cost).toBe(5);
        expect(res.nodePath).toEqual(['R', 'C1', 'E']);
        expect(res.edgePath).toEqual(['e2', 'e4']);
      }
    });

    it('8. Closed exit sitting on cheapest path is NOT crossed as intermediate node', () => {
      // R -> E1 -> C -> E2
      // R-E1 cost 1, E1-C cost 1, C-E2 cost 1 (total cost 3).
      // Alternate path: R -> C (cost 10) -> E2 (cost 1) = total 11.
      // If E1 is closed, it cannot be traversed as an intermediate node!
      const building: Building = {
        name: 'Closed Exit Crossing',
        nodes: [
          { id: 'R', label: 'Room', type: 'room', x: 0, y: 0 },
          { id: 'E1', label: 'Exit 1', type: 'exit', x: 10, y: 0 },
          { id: 'C', label: 'Junction', type: 'junction', x: 20, y: 0 },
          { id: 'E2', label: 'Exit 2', type: 'exit', x: 30, y: 0 },
        ],
        edges: [
          { id: 'e1', from: 'R', to: 'E1', cost: 1 },
          { id: 'e2', from: 'E1', to: 'C', cost: 1 },
          { id: 'e3', from: 'C', to: 'E2', cost: 1 },
          { id: 'e4', from: 'R', to: 'C', cost: 10 },
        ],
        initial: { blockedNodes: [], blockedEdges: [], closedExits: [] },
      };

      const session: Session = {
        startId: 'R',
        hazards: { blockedNodes: [], blockedEdges: [], closedExits: ['E1'] },
      };

      const res = computeRoute(building, session);
      expect(res.status).toBe('route');
      if (res.status === 'route') {
        expect(res.cost).toBe(11);
        expect(res.exitId).toBe('E2');
        expect(res.nodePath).toEqual(['R', 'C', 'E2']);
      }
    });

    it('9. Blocked edge vs blocked node: end nodes of blocked edge stay reachable via other routes', () => {
      // Triangle R - C - E.
      // e1: R-C (cost 2), e2: C-E (cost 2), e3: R-E (cost 10).
      // If e1 (R-C) is blocked, C is still reachable from E (if reversible) or via other paths.
      // Now add junction D: R-D (cost 1), D-C (cost 1).
      // Blocking e1 leaves C reachable through D.
      const building: Building = {
        name: 'Blocked Edge Reachability',
        nodes: [
          { id: 'R', label: 'Room', type: 'room', x: 0, y: 0 },
          { id: 'D', label: 'Junction D', type: 'junction', x: 5, y: 5 },
          { id: 'C', label: 'Junction C', type: 'junction', x: 10, y: 0 },
          { id: 'E', label: 'Exit', type: 'exit', x: 20, y: 0 },
        ],
        edges: [
          { id: 'e1', from: 'R', to: 'C', cost: 2 },
          { id: 'e2', from: 'R', to: 'D', cost: 1 },
          { id: 'e3', from: 'D', to: 'C', cost: 1 },
          { id: 'e4', from: 'C', to: 'E', cost: 2 },
        ],
        initial: { blockedNodes: [], blockedEdges: [], closedExits: [] },
      };

      // Baseline: R -> C -> E cost 4
      const res1 = computeRoute(building, {
        startId: 'R',
        hazards: { blockedNodes: [], blockedEdges: [], closedExits: [] },
      });
      expect(res1.status).toBe('route');
      if (res1.status === 'route') {
        expect(res1.nodePath).toEqual(['R', 'C', 'E']);
        expect(res1.cost).toBe(4);
      }

      // Block edge e1 (R to C). Route becomes R -> D -> C -> E (cost 1+1+2 = 4)
      const res2 = computeRoute(building, {
        startId: 'R',
        hazards: { blockedNodes: [], blockedEdges: ['e1'], closedExits: [] },
      });
      expect(res2.status).toBe('route');
      if (res2.status === 'route') {
        expect(res2.nodePath).toEqual(['R', 'D', 'C', 'E']);
        expect(res2.cost).toBe(4);
      }
    });

    it('10. Disconnected start component returns no_route', () => {
      const building: Building = {
        name: 'Disconnected Graph',
        nodes: [
          { id: 'R_ISOLATED', label: 'Isolated Room', type: 'room', x: 0, y: 0 },
          { id: 'R_CONNECTED', label: 'Connected Room', type: 'room', x: 50, y: 50 },
          { id: 'E', label: 'Exit', type: 'exit', x: 100, y: 100 },
        ],
        edges: [
          { id: 'e1', from: 'R_CONNECTED', to: 'E', cost: 3 },
        ],
        initial: { blockedNodes: [], blockedEdges: [], closedExits: [] },
      };

      const res = computeRoute(building, {
        startId: 'R_ISOLATED',
        hazards: { blockedNodes: [], blockedEdges: [], closedExits: [] },
      });
      expect(res.status).toBe('no_route');
    });

    it('11. Reset restores initial_state exactly', () => {
      const buildingWithInitialHazards: Building = {
        name: 'Building with Hazards',
        nodes: [
          { id: 'R1', label: 'Room 1', type: 'room', x: 0, y: 0 },
          { id: 'C1', label: 'Junction 1', type: 'junction', x: 10, y: 0 },
          { id: 'E1', label: 'Exit 1', type: 'exit', x: 20, y: 0 },
        ],
        edges: [
          { id: 'e1', from: 'R1', to: 'C1', cost: 2 },
          { id: 'e2', from: 'C1', to: 'E1', cost: 2 },
        ],
        initial: {
          blockedNodes: ['C1'],
          blockedEdges: [],
          closedExits: [],
        },
      };

      let session = createInitialSession(buildingWithInitialHazards);
      expect(session.hazards.blockedNodes).toEqual(['C1']);

      // Mutate session
      session = toggleNodeBlock(session, 'R1');
      session = toggleExitClosed(session, 'E1');
      session = toggleEdgeBlock(session, 'e1');
      session = { ...session, startId: 'R1' };

      expect(session.hazards.blockedNodes).toContain('R1');
      expect(session.hazards.closedExits).toContain('E1');

      // Reset
      const reset = resetSession(buildingWithInitialHazards, session);
      expect(reset.hazards.blockedNodes).toEqual(['C1']);
      expect(reset.hazards.blockedEdges).toEqual([]);
      expect(reset.hazards.closedExits).toEqual([]);
      // Since R1 is not in buildingWithInitialHazards.initial.blockedNodes, startId R1 is preserved
      expect(reset.startId).toBe('R1');

      // If initial blockedNodes had R1, startId would be cleared
      const buildingWithR1Blocked: Building = {
        ...buildingWithInitialHazards,
        initial: { blockedNodes: ['R1'], blockedEdges: [], closedExits: [] },
      };
      const resetWithClearedStart = resetSession(buildingWithR1Blocked, session);
      expect(resetWithClearedStart.startId).toBeNull();
    });
  });

  describe('Validator Rejection Suite (Section 6 & 10)', () => {
    it('validates public/sample/building.json without any issues', () => {
      const res = validateBuilding(sampleJsonRaw);
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.building.name).toBe('East Annex - Practice Building');
        expect(res.building.nodes.length).toBe(8);
        expect(res.building.edges.length).toBe(9);
      }
    });

    it('rejects invalid JSON string', () => {
      const res = validateBuilding('{ broken json:');
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.issues[0].code).toBe('INVALID_JSON');
      }
    });

    it('rejects non-object root', () => {
      const res = validateBuilding('["array root"]');
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.issues.some(i => i.code === 'ROOT_NOT_OBJECT')).toBe(true);
      }
    });

    it('rejects missing or empty building name', () => {
      const res = validateBuilding({
        building: '   ',
        nodes: [
          { id: 'R1', label: 'Room', type: 'room', x: 0, y: 0 },
          { id: 'E1', label: 'Exit', type: 'exit', x: 10, y: 10 },
        ],
        edges: [{ id: 'e1', from: 'R1', to: 'E1', cost: 1 }],
        initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] },
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.issues.some(i => i.code === 'BUILDING_NAME_REQUIRED')).toBe(true);
      }
    });

    it('rejects fewer than 2 nodes', () => {
      const res = validateBuilding({
        building: 'Test',
        nodes: [{ id: 'R1', label: 'Room', type: 'room', x: 0, y: 0 }],
        edges: [],
        initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] },
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.issues.some(i => i.code === 'NODES_COUNT_INVALID')).toBe(true);
      }
    });

    it('rejects graph with no exit', () => {
      const res = validateBuilding({
        building: 'No Exit Building',
        nodes: [
          { id: 'R1', label: 'Room 1', type: 'room', x: 0, y: 0 },
          { id: 'R2', label: 'Room 2', type: 'room', x: 10, y: 10 },
        ],
        edges: [{ id: 'e1', from: 'R1', to: 'R2', cost: 2 }],
        initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] },
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.issues.some(i => i.code === 'NO_EXIT')).toBe(true);
      }
    });

    it('rejects graph with no room or junction', () => {
      const res = validateBuilding({
        building: 'Only Exits',
        nodes: [
          { id: 'E1', label: 'Exit 1', type: 'exit', x: 0, y: 0 },
          { id: 'E2', label: 'Exit 2', type: 'exit', x: 10, y: 10 },
        ],
        edges: [{ id: 'e1', from: 'E1', to: 'E2', cost: 2 }],
        initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] },
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.issues.some(i => i.code === 'NO_ROOM_OR_JUNCTION')).toBe(true);
      }
    });

    it('rejects self-loops in edges', () => {
      const res = validateBuilding({
        building: 'Self Loop',
        nodes: [
          { id: 'R1', label: 'Room 1', type: 'room', x: 0, y: 0 },
          { id: 'E1', label: 'Exit 1', type: 'exit', x: 10, y: 10 },
        ],
        edges: [
          { id: 'e1', from: 'R1', to: 'R1', cost: 1 },
          { id: 'e2', from: 'R1', to: 'E1', cost: 2 },
        ],
        initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] },
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.issues.some(i => i.code === 'EDGE_SELF_LOOP')).toBe(true);
      }
    });

    it('rejects duplicate unordered node pairs (A-B and B-A)', () => {
      const res = validateBuilding({
        building: 'Duplicate Pair',
        nodes: [
          { id: 'R1', label: 'Room 1', type: 'room', x: 0, y: 0 },
          { id: 'E1', label: 'Exit 1', type: 'exit', x: 10, y: 10 },
        ],
        edges: [
          { id: 'e1', from: 'R1', to: 'E1', cost: 2 },
          { id: 'e2', from: 'E1', to: 'R1', cost: 3 },
        ],
        initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] },
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.issues.some(i => i.code === 'EDGE_DUPLICATE_PAIR')).toBe(true);
      }
    });

    it('rejects non-positive or non-integer edge costs', () => {
      const res = validateBuilding({
        building: 'Invalid Costs',
        nodes: [
          { id: 'R1', label: 'Room 1', type: 'room', x: 0, y: 0 },
          { id: 'C1', label: 'Junction', type: 'junction', x: 10, y: 0 },
          { id: 'E1', label: 'Exit 1', type: 'exit', x: 20, y: 0 },
        ],
        edges: [
          { id: 'e1', from: 'R1', to: 'C1', cost: 0 },
          { id: 'e2', from: 'C1', to: 'E1', cost: 2.5 },
        ],
        initial_state: { blocked_nodes: [], blocked_edges: [], closed_exits: [] },
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        const costIssues = res.issues.filter(i => i.code === 'EDGE_COST_INVALID');
        expect(costIssues.length).toBe(2);
      }
    });

    it('rejects invalid references in initial_state (e.g. exit in blocked_nodes)', () => {
      const res = validateBuilding({
        building: 'Invalid Initial State',
        nodes: [
          { id: 'R1', label: 'Room 1', type: 'room', x: 0, y: 0 },
          { id: 'E1', label: 'Exit 1', type: 'exit', x: 10, y: 0 },
        ],
        edges: [{ id: 'e1', from: 'R1', to: 'E1', cost: 2 }],
        initial_state: {
          blocked_nodes: ['E1'], // Exit in blocked_nodes!
          blocked_edges: ['nonexistent_edge'],
          closed_exits: ['R1'], // Room in closed_exits!
        },
      });
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.issues.some(i => i.code === 'BLOCKED_NODE_NOT_ROOM_OR_JUNCTION')).toBe(true);
        expect(res.issues.some(i => i.code === 'BLOCKED_EDGE_NOT_FOUND')).toBe(true);
        expect(res.issues.some(i => i.code === 'CLOSED_EXIT_NOT_EXIT')).toBe(true);
      }
    });

    it('tolerates and deduplicates duplicate IDs in initial_state', () => {
      const res = validateBuilding({
        building: 'Duplicate Init IDs',
        nodes: [
          { id: 'R1', label: 'Room 1', type: 'room', x: 0, y: 0 },
          { id: 'C1', label: 'Junction', type: 'junction', x: 10, y: 0 },
          { id: 'E1', label: 'Exit 1', type: 'exit', x: 20, y: 0 },
        ],
        edges: [
          { id: 'e1', from: 'R1', to: 'C1', cost: 2 },
          { id: 'e2', from: 'C1', to: 'E1', cost: 2 },
        ],
        initial_state: {
          blocked_nodes: ['C1', 'C1'],
          blocked_edges: ['e1', 'e1'],
          closed_exits: ['E1', 'E1'],
        },
      });
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.building.initial.blockedNodes).toEqual(['C1']);
        expect(res.building.initial.blockedEdges).toEqual(['e1']);
        expect(res.building.initial.closedExits).toEqual(['E1']);
      }
    });
  });
});
