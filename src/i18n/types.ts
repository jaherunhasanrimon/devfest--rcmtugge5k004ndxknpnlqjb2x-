export type Language = 'en' | 'bn';

export interface Translations {
  // Statuses
  'status.idle': string;
  'status.noRoute': string;
  'status.startBlocked': string;
  'status.routeFound': string;

  // Route card
  'route.totalCost': string;
  'route.exit': string;
  'route.steps': string;
  'route.hintNoRoute': string;
  'route.hintReopen': string;
  'route.hintStartBlocked': string;
  'route.unblockStart': string;

  // Actions
  'action.block': string;
  'action.unblock': string;
  'action.close': string;
  'action.reopen': string;
  'action.setStart': string;
  'action.reset': string;
  'action.hazardsRestored': string;
  'action.import': string;
  'action.sample': string;
  'action.closeMenu': string;

  // Types & terms
  'type.room': string;
  'type.junction': string;
  'type.exit': string;
  'term.corridor': string;
  'term.hazards': string;
  'term.start': string;
  'term.cost': string;
  'term.legend': string;
  'term.unblocked': string;
  'term.blocked': string;
  'term.closed': string;
  'term.route': string;
  'term.roomsJunctions': string;
  'term.corridors': string;
  'term.exits': string;
  'term.selectStart': string;

  // Import
  'import.title': string;
  'import.subtitle': string;
  'import.dropzone': string;
  'import.invalidTitle': string;
  'import.andMore': string;

  // Validation error messages
  'error.INVALID_JSON': string;
  'error.ROOT_NOT_OBJECT': string;
  'error.BUILDING_NAME_REQUIRED': string;
  'error.NODES_NOT_ARRAY': string;
  'error.NODES_COUNT_INVALID': string;
  'error.NODE_INVALID': string;
  'error.NODE_ID_REQUIRED': string;
  'error.NODE_ID_DUPLICATE': string;
  'error.NODE_LABEL_REQUIRED': string;
  'error.NODE_TYPE_INVALID': string;
  'error.NODE_COORDINATES_INVALID': string;
  'error.NO_ROOM_OR_JUNCTION': string;
  'error.NO_EXIT': string;
  'error.EDGES_NOT_ARRAY': string;
  'error.EDGES_COUNT_INVALID': string;
  'error.EDGE_INVALID': string;
  'error.EDGE_ID_REQUIRED': string;
  'error.EDGE_ID_DUPLICATE': string;
  'error.EDGE_FROM_INVALID': string;
  'error.EDGE_TO_INVALID': string;
  'error.EDGE_SELF_LOOP': string;
  'error.EDGE_DUPLICATE_PAIR': string;
  'error.EDGE_COST_INVALID': string;
  'error.INITIAL_STATE_REQUIRED': string;
  'error.BLOCKED_NODES_NOT_ARRAY': string;
  'error.BLOCKED_EDGES_NOT_ARRAY': string;
  'error.CLOSED_EXITS_NOT_ARRAY': string;
  'error.BLOCKED_NODE_NOT_FOUND': string;
  'error.BLOCKED_NODE_NOT_ROOM_OR_JUNCTION': string;
  'error.BLOCKED_EDGE_NOT_FOUND': string;
  'error.CLOSED_EXIT_NOT_FOUND': string;
  'error.CLOSED_EXIT_NOT_EXIT': string;
}

export type TranslationKey = keyof Translations;
