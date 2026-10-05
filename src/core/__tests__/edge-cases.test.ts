import { describe, it, expect } from 'vitest';
import sampleJsonRaw from '../../../public/sample/building.json';
import {
  Building,
  validateBuilding,
  computeRoute,
  createInitialSession,
  toggleNodeBlock,
  resetSession,
} from '../index';

const sampleValidation = validateBuilding(sampleJsonRaw);
if (!sampleValidation.valid) {
  throw new Error('Sample invalid');
}
const sampleBuilding: Building = sampleValidation.building;

describe('Edge cases and interactions (Phase 3)', () => {
  it('Selected start becomes blocked, then unblocked: route returns identically', () => {
    let session = createInitialSession(sampleBuilding);
    session = { ...session, startId: 'R1' };

    // Baseline route
    const res1 = computeRoute(sampleBuilding, session);
    expect(res1.status).toBe('route');
    if (res1.status === 'route') {
      expect(res1.nodePath).toEqual(['R1', 'C1', 'C2', 'E1']);
    }

    // Block R1
    session = toggleNodeBlock(session, 'R1');
    const res2 = computeRoute(sampleBuilding, session);
    expect(res2.status).toBe('start_blocked');

    // Unblock R1
    session = toggleNodeBlock(session, 'R1');
    const res3 = computeRoute(sampleBuilding, session);
    expect(res3.status).toBe('route');
    if (res3.status === 'route') {
      expect(res3.nodePath).toEqual(['R1', 'C1', 'C2', 'E1']);
      expect(res3.cost).toBe(7);
    }
  });

  it('Reset restores initial state while preserving valid start', () => {
    let session = createInitialSession(sampleBuilding);
    session = { ...session, startId: 'R1' };

    // Mutate hazards
    session = toggleNodeBlock(session, 'C2');
    session = toggleNodeBlock(session, 'C3');
    expect(session.hazards.blockedNodes).toEqual(['C2', 'C3']);

    // Reset
    const reset = resetSession(sampleBuilding, session);
    expect(reset.hazards.blockedNodes).toEqual([]);
    expect(reset.startId).toBe('R1');
  });

  it('Reset clears start if start was in building initial blockedNodes', () => {
    const buildingWithInitialBlockedStart: Building = {
      ...sampleBuilding,
      initial: {
        blockedNodes: ['R1'],
        blockedEdges: [],
        closedExits: [],
      },
    };

    let session = createInitialSession(buildingWithInitialBlockedStart);
    // Even if somehow startId was set to R1
    session = { ...session, startId: 'R1' };

    const reset = resetSession(buildingWithInitialBlockedStart, session);
    expect(reset.hazards.blockedNodes).toEqual(['R1']);
    expect(reset.startId).toBeNull();
  });
});
