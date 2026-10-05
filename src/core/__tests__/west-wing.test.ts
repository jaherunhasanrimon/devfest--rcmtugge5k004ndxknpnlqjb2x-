import { describe, it, expect } from 'vitest';
import westWingJson from '../../../public/sample/west-wing.json';
import {
  Building,
  Session,
  validateBuilding,
  computeRoute,
  createInitialSession,
  toggleNodeBlock,
  toggleExitClosed,
  resetSession,
} from '../index';

describe('West Wing - Advanced Research Facility Dataset Testing', () => {
  const validation = validateBuilding(westWingJson);
  expect(validation.valid).toBe(true);

  if (!validation.valid) {
    throw new Error('Validation failed for west-wing.json');
  }

  const building: Building = validation.building;

  it('validates schema, bounds, and initial state', () => {
    expect(building.name).toBe('West Wing - Advanced Research Facility');
    expect(building.nodes.length).toBe(13);
    expect(building.edges.length).toBe(13);
    expect(building.initial.blockedNodes).toEqual(['J2']);
    expect(building.initial.blockedEdges).toEqual(['L13']);
    expect(building.initial.closedExits).toEqual(['E2']);
  });

  it('Case 1: R1 under initial state cannot reach any open exit -> no_route', () => {
    const session: Session = {
      startId: 'R1',
      hazards: { ...building.initial },
    };
    const res = computeRoute(building, session);
    expect(res.status).toBe('no_route');
    if (res.status === 'no_route') {
      expect(res.startId).toBe('R1');
    }
  });

  it('Case 2: R2 under initial state is immediately isolated by blocked J2 -> no_route', () => {
    const session: Session = {
      startId: 'R2',
      hazards: { ...building.initial },
    };
    const res = computeRoute(building, session);
    expect(res.status).toBe('no_route');
    if (res.status === 'no_route') {
      expect(res.startId).toBe('R2');
    }
  });

  it('Case 3: R3 under initial state finds path to Fire Escape South (E3) with cost 13', () => {
    const session: Session = {
      startId: 'R3',
      hazards: { ...building.initial },
    };
    const res = computeRoute(building, session);
    expect(res.status).toBe('route');
    if (res.status === 'route') {
      expect(res.exitId).toBe('E3');
      expect(res.cost).toBe(13);
      expect(res.nodePath).toEqual(['R3', 'R5', 'J3', 'J5', 'E3']);
      expect(res.edgePath).toEqual(['L04', 'L05', 'L09', 'L12']);
    }
  });

  it('Case 4: Reopening E2 allows R1 to reach Emergency Exit North (E2) with cost 13', () => {
    let session = createInitialSession(building);
    session = { ...session, startId: 'R1' };
    session = toggleExitClosed(session, 'E2'); // Reopen E2

    const res = computeRoute(building, session);
    expect(res.status).toBe('route');
    if (res.status === 'route') {
      expect(res.exitId).toBe('E2');
      expect(res.cost).toBe(13);
      expect(res.nodePath).toEqual(['R1', 'R4', 'J1', 'J4', 'E2']);
      expect(res.edgePath).toEqual(['L01', 'L02', 'L08', 'L11']);
    }
  });

  it('Case 5: Unblocking J2 gives R1 route to Main Entrance (E1) with cost 20', () => {
    let session = createInitialSession(building);
    session = { ...session, startId: 'R1' };
    session = toggleNodeBlock(session, 'J2'); // Unblock J2 (E2 still closed)

    const res = computeRoute(building, session);
    expect(res.status).toBe('route');
    if (res.status === 'route') {
      expect(res.exitId).toBe('E1');
      expect(res.cost).toBe(20);
      expect(res.nodePath).toEqual(['R1', 'R4', 'J1', 'J2', 'E1']);
      expect(res.edgePath).toEqual(['L01', 'L02', 'L06', 'L10']);
    }
  });

  it('Case 6: Selecting an initially blocked node J2 yields start_blocked', () => {
    const session: Session = {
      startId: 'J2',
      hazards: { ...building.initial },
    };
    const res = computeRoute(building, session);
    expect(res.status).toBe('start_blocked');
    if (res.status === 'start_blocked') {
      expect(res.startId).toBe('J2');
    }
  });

  it('Case 7: Reset restores initial hazards exactly', () => {
    let session = createInitialSession(building);
    session = { ...session, startId: 'R3' };
    // Change things
    session = toggleNodeBlock(session, 'J2'); // unblock J2
    session = toggleExitClosed(session, 'E2'); // reopen E2
    expect(session.hazards.blockedNodes).toEqual([]);
    expect(session.hazards.closedExits).toEqual([]);

    const restored = resetSession(building, session);
    expect(restored.hazards.blockedNodes).toEqual(['J2']);
    expect(restored.hazards.blockedEdges).toEqual(['L13']);
    expect(restored.hazards.closedExits).toEqual(['E2']);
    expect(restored.startId).toBe('R3');
  });
});
