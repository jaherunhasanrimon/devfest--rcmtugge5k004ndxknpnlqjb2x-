import React, { createContext, useContext, useReducer, ReactNode, useMemo } from 'react';
import {
  Building,
  RouteResult,
  Session,
  ValidationIssue,
  computeRoute,
  createInitialSession,
  resetSession,
  setStart,
  toggleEdgeBlock,
  toggleExitClosed,
  toggleNodeBlock,
} from '../core';

export type Action =
  | { type: 'LOAD_BUILDING'; payload: Building }
  | { type: 'SELECT_START'; payload: string | null }
  | { type: 'TOGGLE_NODE_BLOCK'; payload: string }
  | { type: 'TOGGLE_EDGE_BLOCK'; payload: string }
  | { type: 'TOGGLE_EXIT_CLOSED'; payload: string }
  | { type: 'RESET' }
  | { type: 'SET_VALIDATION_ISSUES'; payload: ValidationIssue[] }
  | { type: 'CLEAR_VALIDATION_ISSUES' };

export interface AppState {
  building: Building | null;
  session: Session;
  validationIssues: ValidationIssue[];
  resetNotice: boolean;
}

const emptySession: Session = {
  startId: null,
  hazards: {
    blockedNodes: [],
    blockedEdges: [],
    closedExits: [],
  },
};

const initialState: AppState = {
  building: null,
  session: emptySession,
  validationIssues: [],
  resetNotice: false,
};

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_BUILDING': {
      return {
        ...state,
        building: action.payload,
        session: createInitialSession(action.payload),
        validationIssues: [],
        resetNotice: false,
      };
    }
    case 'SELECT_START': {
      return {
        ...state,
        session: setStart(state.session, action.payload),
        resetNotice: false,
      };
    }
    case 'TOGGLE_NODE_BLOCK': {
      return {
        ...state,
        session: toggleNodeBlock(state.session, action.payload),
        resetNotice: false,
      };
    }
    case 'TOGGLE_EDGE_BLOCK': {
      return {
        ...state,
        session: toggleEdgeBlock(state.session, action.payload),
        resetNotice: false,
      };
    }
    case 'TOGGLE_EXIT_CLOSED': {
      return {
        ...state,
        session: toggleExitClosed(state.session, action.payload),
        resetNotice: false,
      };
    }
    case 'RESET': {
      if (!state.building) return state;
      return {
        ...state,
        session: resetSession(state.building, state.session),
        resetNotice: true,
      };
    }
    case 'SET_VALIDATION_ISSUES': {
      return {
        ...state,
        validationIssues: action.payload,
      };
    }
    case 'CLEAR_VALIDATION_ISSUES': {
      return {
        ...state,
        validationIssues: [],
      };
    }
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  routeResult: RouteResult;
  isInitialState: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: ReactNode; initialBuilding?: Building | null }> = ({
  children,
  initialBuilding = null,
}) => {
  const [state, dispatch] = useReducer(
    appReducer,
    initialBuilding
      ? {
          building: initialBuilding,
          session: createInitialSession(initialBuilding),
          validationIssues: [],
          resetNotice: false,
        }
      : initialState
  );

  // Derived state: computeRoute is pure and runs synchronously on every state change
  const routeResult = useMemo<RouteResult>(() => {
    if (!state.building) {
      return { status: 'idle' };
    }
    return computeRoute(state.building, state.session);
  }, [state.building, state.session]);

  const isInitialState = useMemo<boolean>(() => {
    if (!state.building) return true;
    const { initial } = state.building;
    const { hazards } = state.session;

    const sameNodes =
      hazards.blockedNodes.length === initial.blockedNodes.length &&
      hazards.blockedNodes.every(id => initial.blockedNodes.includes(id));
    const sameEdges =
      hazards.blockedEdges.length === initial.blockedEdges.length &&
      hazards.blockedEdges.every(id => initial.blockedEdges.includes(id));
    const sameExits =
      hazards.closedExits.length === initial.closedExits.length &&
      hazards.closedExits.every(id => initial.closedExits.includes(id));

    return sameNodes && sameEdges && sameExits;
  }, [state.building, state.session.hazards]);

  const value = useMemo(
    () => ({ state, dispatch, routeResult, isInitialState }),
    [state, routeResult, isInitialState]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
