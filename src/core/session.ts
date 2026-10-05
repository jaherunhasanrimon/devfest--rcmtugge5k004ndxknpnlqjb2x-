import { Building, HazardState, Session } from './types';

/**
 * Creates an initial session from the building's initial hazards with no start selected.
 */
export function createInitialSession(building: Building): Session {
  return {
    startId: null,
    hazards: {
      blockedNodes: [...building.initial.blockedNodes],
      blockedEdges: [...building.initial.blockedEdges],
      closedExits: [...building.initial.closedExits],
    },
  };
}

/**
 * Updates the selected starting node.
 */
export function setStart(session: Session, startId: string | null): Session {
  return {
    ...session,
    startId,
  };
}

/**
 * Toggles a node's blocked state.
 */
export function toggleNodeBlock(session: Session, nodeId: string): Session {
  const isBlocked = session.hazards.blockedNodes.includes(nodeId);
  const nextBlocked = isBlocked
    ? session.hazards.blockedNodes.filter(id => id !== nodeId)
    : [...session.hazards.blockedNodes, nodeId];

  return {
    ...session,
    hazards: {
      ...session.hazards,
      blockedNodes: nextBlocked,
    },
  };
}

/**
 * Toggles an edge's blocked state.
 */
export function toggleEdgeBlock(session: Session, edgeId: string): Session {
  const isBlocked = session.hazards.blockedEdges.includes(edgeId);
  const nextBlocked = isBlocked
    ? session.hazards.blockedEdges.filter(id => id !== edgeId)
    : [...session.hazards.blockedEdges, edgeId];

  return {
    ...session,
    hazards: {
      ...session.hazards,
      blockedEdges: nextBlocked,
    },
  };
}

/**
 * Toggles an exit's closed state.
 */
export function toggleExitClosed(session: Session, exitId: string): Session {
  const isClosed = session.hazards.closedExits.includes(exitId);
  const nextClosed = isClosed
    ? session.hazards.closedExits.filter(id => id !== exitId)
    : [...session.hazards.closedExits, exitId];

  return {
    ...session,
    hazards: {
      ...session.hazards,
      closedExits: nextClosed,
    },
  };
}

/**
 * Resets hazards to building's initial state.
 * Preserves startId if it is unblocked in initial_state, otherwise clears it to null.
 */
export function resetSession(building: Building, currentSession: Session): Session {
  const restoredHazards: HazardState = {
    blockedNodes: [...building.initial.blockedNodes],
    blockedEdges: [...building.initial.blockedEdges],
    closedExits: [...building.initial.closedExits],
  };

  const startStillValid =
    currentSession.startId !== null &&
    !restoredHazards.blockedNodes.includes(currentSession.startId) &&
    building.nodes.some(n => n.id === currentSession.startId);

  return {
    startId: startStillValid ? currentSession.startId : null,
    hazards: restoredHazards,
  };
}
