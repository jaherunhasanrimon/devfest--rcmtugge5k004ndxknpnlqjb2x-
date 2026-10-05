# Smart Escape: Phases (execution control for the AI agent)

This file is the agent's operating manual. Work **one phase at a time**, pass the **gate**, commit, then continue. Time boxes assume a 90-minute limit; the target is a final push by **T+85** so the last 5 minutes are a safety buffer.

## 0. Operating protocol

1. **Clock.** At the start run `date` and write the result to `.t0` (add `.t0` to `.gitignore`). At every gate print elapsed minutes (`now - .t0`).
2. **One phase at a time.** Do not start a phase before the previous gate passes. Do not build things from later phases early (except where this file says so).
3. **Gate = proof.** A gate passes only when its checks run green: `npm run test`, `npm run build`, plus the manual checks listed. Print a short **GATE REPORT**: phase, elapsed time, what passed, what is deferred.
4. **Commit rules (competition rules).**
   - Commit at the end of every phase that lists a commit, and never go more than 25 minutes without one. Minimum 3 commits in total; plan for 6 or more.
   - Message format: `<type>: <what changed> | AI prompt: "<the human prompt, shortened>"` or `... | Manual edit` when the human edited by hand.
   - Never rewrite history (no `--amend` after push, no force-push, no rebase of pushed commits).
   - No secrets, no `.env` with keys.
5. **Hard constraints.** Frontend only. No backend, serverless, or remote DB. Routing works fully offline. No hard-coded sample routes: every route comes from `computeRoute`.
6. **Dependencies.** Only the stack in `architecture.md`. Ask before adding anything else.
7. **Strings.** Every visible string goes through `t()` from the first UI commit onward. Never "translate later".
8. **If behind schedule, cut in this order** (last item is cut first): optional extras, advanced animation, pan/zoom, high-contrast mode, polish of non-core panels. **Never cut:** validation, hazards, reset, failure states, two languages, deployment, README, screenshots, LICENSE.
9. **When blocked** for more than 3 minutes on one problem, choose the simplest workable option, note it in `README.md` under Known issues, and move on.

## 1. Phases

### Phase 0: Bootstrap (T+0 to T+8)
**Goal:** a clean, deployable skeleton.
- `git init`; create Vite React-TS project in the repo root; strict TS; `vite.config.ts` with `base: './'`.
- Install: `vitest`, `@fontsource/atkinson-hyperlegible`, `@fontsource/hind-siliguri`. Add scripts `test` and `build`.
- Create the folder structure from `architecture.md` (empty modules with types are fine).
- Add `LICENSE` (MIT, correct year, holder = participant name), `README.md` skeleton (sections listed in Phase 6), `.gitignore`, `docs/` with the three docs and the problem statement.
- Place the provided file at `public/sample/building.json`.

**Gate:** `npm run build` succeeds; app shows a placeholder page.
**Commit 1:** `chore: scaffold Vite React TS, MIT license, docs | AI prompt: "..."`

### Phase 1: Core engine and tests (T+8 to T+25)
**Goal:** the routing brain, correct before any UI exists.
- Implement `types.ts`, `compare.ts`, `validate.ts`, `graph.ts`, `route.ts`, `session.ts` per `architecture.md` sections 4 to 6.
- Write Vitest tests for every fixture in `architecture.md` section 10, using `public/sample/building.json` for the five sample checks.

**Gate:** all tests green, including: R1 gives `R1 - C1 - C2 - E1` cost 7; block C2 gives `R1 - C1 - C3 - C4 - E2` cost 11; close E1 and E2 gives `no_route`; R2 gives `R2 - C3 - C4 - E2` cost 7; block R1 gives `start_blocked`.
**Commit 2:** `feat(core): validation, Dijkstra with exit and path tie-breaks, tests | AI prompt: "..."`

### Phase 2: Import, map, start selection, route display (T+25 to T+42)
**Goal:** user can see the building and a highlighted route.
- Store/reducer and i18n scaffold (both `en` and `bn` dictionaries with the same keys).
- Import panel: file picker plus drag and drop plus **Load sample** button; clear localised error list on invalid files; failed import keeps the previous building.
- `MapView`: nodes at supplied coordinates, labels, distinct node-type shapes, cost chips on every edge, route highlighted.
- Start selection from the map and from a select control in the side panel (only unblocked rooms/junctions).
- `RouteCard`: node sequence, exit, total cost.
- Follow `design.md` for tokens and layout from the start.

**Gate (manual):** load sample, pick R1, see the baseline route and cost 7 on screen. Load a broken JSON, see readable errors. Switch EN/BN without losing state.
**Commit 3:** `feat(ui): import, SVG map, start selection, route card | AI prompt: "..."`

### Phase 3: Hazards, failure states, reset (T+42 to T+55)
**Goal:** every mandatory interaction works.
- Block/unblock rooms and junctions, block/unblock corridors, close/reopen exits, from the map (action popover) and from side-panel lists.
- Visual states per `design.md` section 5. Blocked-node incident edges render as unusable.
- Statuses: **No route available** and **Starting location blocked** (and the idle prompt) in both languages.
- **Reset** restores the file's `initial_state`; selected start stays only if still valid.

**Gate (manual, from a clean load):** run all 5 sample checks in the UI; block C2 and see the C3/C4 reroute; toggle things on and off rapidly with no stale route; Reset restores everything.
**Commit 4:** `feat(ui): hazard toggles, failure states, reset | AI prompt: "..."`

### Phase 4: Early deploy and Bangla QA (T+55 to T+65)
**Goal:** a live URL exists well before the deadline.
- **Human step:** connect the repo to Vercel/Netlify/GitHub Pages and confirm a public HTTPS URL opens in latest Chrome with no login.
- Agent: audit every visible string in Bangla mode (buttons, statuses, errors, placeholders, tooltips, aria-labels, legend); check Bangla line-height and font rendering; fix missing keys.
- Verify the deployed build matches local behaviour (sample loads from a relative path, not a root-absolute one).

**Gate:** live URL works; sample check 1 and 2 pass on the live site in both languages.
**Commit 5:** `chore: deploy config, Bangla copy fixes | AI prompt: "..."`

### Phase 5: Design polish, motion, accessibility (T+65 to T+78)
**Goal:** professional feel without breaking anything.
- Apply `design.md` fully: type scale, spacing, route ribbon, hazard patterns, legend, empty/error states.
- Subtle animation: route draw-on, start selection pulse (once), hazard toggle transitions. Respect `prefers-reduced-motion`. No flashing, no blocking controls.
- Keyboard: every action reachable by keyboard; visible focus; `aria-live="polite"` on the status.
- Responsive check at 1440, 1024, 768, 390 widths.

**Gate:** tests and build green; keyboard-only run-through of the "block C2" scenario; no layout break at 390 px.
**Commit 6:** `feat(ui): visual polish, animations, accessibility | AI prompt: "..."`

### Phase 6: Deliverables (T+78 to T+85)
**Goal:** everything the submission form and repo checklist need.
- `README.md`: name and registration number, live link, run instructions (`npm i`, `npm run dev`, `npm test`, `npm run build`), implemented and bonus features, known issues, AI tools used, most useful prompt.
- `screenshots/baseline.png` (R1 route, cost 7) and `screenshots/rerouted-c2-blocked.png` (cost 11). **Human step** if the agent cannot capture them.
- Confirm `LICENSE` is MIT text.
- Final pass: `npm run test && npm run build`; confirm the working tree is clean.

**Gate:** checklist in section 3 fully ticked.
**Commit 7 (final):** `docs: README, screenshots, final polish | AI prompt: "..."` then `git push`.

### Phase 7: Freeze and submit (T+85 to T+90)
- **Human:** confirm the live site is built from the final commit (check the host's deployment commit hash). Copy the full commit hash. Submit the form: full name, registration number, repo URL, final commit ID, live URL.
- **No code, Git, or deployment changes after T+90.**

## 2. Edge cases the agent must verify before Phase 5 ends

- Selected start becomes blocked, then unblocked: route returns.
- Blocking a corridor does not make its end nodes unreachable via other paths.
- A closed exit is not used as an intermediate node.
- Two equal-cost exits: smallest exit ID. Two equal-cost paths: smallest node-ID sequence.
- Start in a disconnected component: **No route available**.
- Initial state already contains blocked or closed items: shown correctly on load; Reset returns to exactly that.
- Loading a second file replaces the first cleanly (start cleared, hazards from the new file).
- Invalid file after a valid one: error shown, previous building still usable.
- 60 nodes and 150 edges stay readable and responsive.

## 3. Final checklist

- [ ] Public repo named `devfest-<registration-number>`; 3 or more commits; no gap longer than 30 minutes; messages follow the format
- [ ] Live HTTPS URL works in Chrome with no login; matches the final commit
- [ ] Import, validate, map with labels, distinct node types, visible costs
- [ ] Start selection, route highlight, node sequence, exit, total cost
- [ ] Block/unblock rooms, junctions, corridors; close/reopen exits; visually distinct
- [ ] Immediate recalculation, no reimport; Reset restores `initial_state`
- [ ] **No route available** and **Starting location blocked** shown correctly
- [ ] English and Bangla for all principal UI text
- [ ] Tie-break rules tested; no hard-coded routes
- [ ] Subtle animations, no flashing, controls never delayed
- [ ] `README.md`, MIT `LICENSE`, `screenshots/` (baseline and C2 blocked), all source code
- [ ] No secrets, no backend
