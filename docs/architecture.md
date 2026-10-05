# Smart Escape: Architecture (high level)

> Educational simulation, not a certified evacuation planning tool.

## 1. Shape of the system

A static, frontend-only web app. One immutable **Building** (from `building.json`), one small mutable **Session** (selected start + hazards), and one **pure function** that turns them into a **RouteResult**. The UI only renders that result.

```
 building.json ──▶ [validate] ──▶ Building (immutable, kept for Reset)
                                       │
 user actions ──▶ [reducer] ──▶ Session { startId, blockedNodes, blockedEdges, closedExits }
                                       │
              Building + Session ──▶ computeRoute() ──▶ RouteResult   (derived, never stored)
                                       │
                     ┌─────────────────┴─────────────────┐
               MapView (SVG)                         SidePanel
                     └──────────── i18n (en | bn) ───────┘
```

**Golden rule:** the route is *derived state*. Every start or hazard change re-runs `computeRoute` synchronously, so "recalculate immediately" is true by construction.

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Build / UI | Vite + React 18 + TypeScript (strict) | Fast setup, state-driven UI fits this problem |
| Styling | Plain CSS with CSS variables (`tokens.css`) | No UI kit to fight; easy theming |
| Map | Inline SVG (no map or graph library) | Exact coordinates, crisp at any size, easy to animate and screenshot |
| Routing | Own Dijkstra in `core/` | Must work offline; tie-break rules are custom |
| Tests | Vitest (core engine only) | Cheap, high value |
| Fonts | `@fontsource/atkinson-hyperlegible`, `@fontsource/hind-siliguri` | Self-hosted, Bangla-safe, works offline |
| Hosting | Vercel / Netlify / GitHub Pages (static) | Public HTTPS, no login |

No backend, no serverless, no external API, no secrets. Browser storage is allowed but optional (language preference only).

## 3. Module map

```
src/
  core/                  pure TypeScript, no React, fully unit-tested
    types.ts             Building, Node, Edge, HazardState, RouteResult
    validate.ts          parse + validate JSON  ->  Building | ValidationIssue[]
    graph.ts             build adjacency, filtering out unavailable nodes/edges/exits
    route.ts             computeRoute(building, session)  ->  RouteResult
    session.ts           initialSession(), toggle helpers, reset
    compare.ts           codeUnitCompare() used for every ID tie-break
  state/
    store.tsx            useReducer + context; actions below
  i18n/
    en.ts  bn.ts         typed dictionaries (same keys enforced by TS)
    index.ts             t(key, params), language state, <html lang> sync
  ui/
    App.tsx  TopBar  MapView/  SidePanel/  RouteCard  HazardLists  ImportPanel  IssueList
  styles/
    tokens.css  app.css
public/sample/building.json
docs/                    architecture.md, phases.md, design.md, problem-statement.pdf
screenshots/             baseline.png, rerouted-c2-blocked.png
```

**Dependency direction:** `ui → state → core`. `core` imports nothing from the rest. No graph logic inside components.

## 4. Data model (core/types.ts)

```ts
type NodeType = 'room' | 'junction' | 'exit';
interface GNode { id: string; label: string; type: NodeType; x: number; y: number }
interface GEdge { id: string; from: string; to: string; cost: number }   // undirected, positive integer
interface Building { name: string; nodes: GNode[]; edges: GEdge[]; initial: HazardState }
interface HazardState { blockedNodes: string[]; blockedEdges: string[]; closedExits: string[] }
interface Session { startId: string | null; hazards: HazardState }

type RouteResult =
  | { status: 'idle' }                                  // no start chosen yet
  | { status: 'start_blocked'; startId: string }
  | { status: 'no_route'; startId: string }
  | { status: 'route'; startId: string; exitId: string; cost: number;
      nodePath: string[]; edgePath: string[] };         // edge ids, for highlighting
```

Node IDs and edge IDs live in **separate namespaces** (an edge may share an ID with a node). Internally key them as `n:<id>` and `e:<id>`.

**Actions:** `LOAD_BUILDING`, `SELECT_START`, `TOGGLE_NODE_BLOCK`, `TOGGLE_EDGE_BLOCK`, `TOGGLE_EXIT_CLOSED`, `RESET`, `SET_LANG`, `CLEAR_BUILDING`.
`RESET` = `hazards := clone(building.initial)`. The selected start is kept if it is still valid under the restored state, otherwise it is cleared.

## 5. Routing spec (the part judges will attack)

Inputs are the Building and the Session. Evaluate in this order:

1. `startId == null` → `idle`.
2. Start is in `blockedNodes` → `start_blocked`.
3. Build the usable graph:
   - drop nodes in `blockedNodes`, and every edge touching them;
   - drop edges in `blockedEdges`;
   - drop exits in `closedExits` (they cannot be a destination or an intermediate node).
4. Run Dijkstra from the start over the usable graph (non-negative integer weights).
5. Among reachable **open** exits choose min `(cost, exitId)`. Compare IDs with plain code-unit comparison (`a < b`), **not** `localeCompare`, because IDs are case-sensitive and `"E10" < "E2"`.
6. If no exit is reachable → `no_route`.
7. Path tie-break: compute `distToExit` for every node (Dijkstra from the chosen exit; the graph is undirected). Walk from the start: at each node choose, among neighbours `v` with `w(u,v) + distToExit[v] == distToExit[u]`, the neighbour with the smallest ID. This yields the lexicographically smallest node-ID sequence among all minimum-cost paths.
8. Return `route` with `nodePath`, `edgePath`, `cost` = sum of edge costs. Coordinates and hop count are never used as cost.

Complexity is trivial at 60 nodes and 150 edges, so a simple array or binary-heap Dijkstra is fine.

## 6. Validation (core/validate.ts)

Return **all** issues (not just the first), each as `{ code, path, params }` so the UI can localise them.

- Not valid JSON, or root is not an object.
- `building` is not a non-empty string.
- `nodes` has 2 to 60 entries; each has a unique non-empty `id`, non-empty `label`, `type` in the allowed set, finite numeric `x` and `y`. At least one room/junction and one exit.
- `edges` has 1 to 150 entries; each has a unique `id`, valid `from` and `to`, `from !== to`, `cost` a positive integer, and no repeated unordered node pair (`A-B` equals `B-A`).
- `initial_state` has all three arrays (empty is valid). `blocked_nodes` reference existing room/junction IDs; `blocked_edges` reference existing edge IDs; `closed_exits` reference existing exit IDs. Duplicate IDs inside one array are tolerated and de-duplicated.
- Extra unknown fields are ignored. IDs are case-sensitive.
- Disconnected graphs are valid.

A failed import must not replace the currently loaded building.

## 7. Rendering approach (MapView)

- Compute the bounding box of node `x,y`, add padding, and use it as the SVG `viewBox`. Keep the supplied coordinate orientation (do not flip Y).
- Use `vector-effect: non-scaling-stroke` and fixed-size labels so text stays readable at 2 or 60 nodes.
- Cost chips sit at edge midpoints with a small perpendicular offset to avoid overlapping lines.
- Each element has an invisible larger hit target. All map actions are also reachable from the side panel lists (keyboard and screen-reader path).
- Highlight the route by changing classes on existing elements, so CSS transitions can animate it.
- Optional stretch: wheel zoom and drag pan by editing the `viewBox`.

## 8. i18n

Typed dictionaries `en.ts` and `bn.ts` (TypeScript fails the build if keys differ). `t(key, params)` everywhere in the UI, with no hard-coded visible strings. Dataset labels are shown as-is. Validation errors and statuses are translated by `code`. Language preference may be stored in `localStorage` inside try/catch. Update `<html lang>` on change.

## 9. Testability hooks

Stable `data-testid` attributes: `status`, `route-sequence` (plain text like `R1 - C1 - C2 - E1`), `route-cost`, `route-exit`, `reset-button`, `lang-toggle`, `node-<id>`, `edge-<id>`.

## 10. Test fixtures (Vitest, `core/`)

1. The five sample checks from the problem statement (baseline, block C2, close E1+E2, start R2, block start).
2. Equal-cost exits → smallest exit ID wins (include an `E10` vs `E2` case).
3. Equal-cost paths to the same exit → smallest node-ID sequence.
4. Closed exit sitting on the cheapest path is not crossed.
5. Blocked edge vs blocked node (end nodes of a blocked edge stay reachable via other routes).
6. Disconnected start component → `no_route`.
7. Reset restores `initial_state` exactly.
8. Validator rejects each malformed case listed in section 6.

## 11. Delivery

Static build (`vite build`) with `base: './'` so it works on any host path. The deployed commit must equal the final pushed commit. Repo contains source, `README.md`, MIT `LICENSE`, `screenshots/`. No secrets anywhere.

## 12. Decisions and non-goals

- Own Dijkstra, no graph library (tie-break control, zero risk of dependency surprises).
- No fire detection, hazard spread prediction, or auto-simulation. Hazards change only by user action.
- Optional extras (only after all mandatory work is done): alternative routes, high-contrast mode, PNG export, saved progress, step-by-step walkthrough.
