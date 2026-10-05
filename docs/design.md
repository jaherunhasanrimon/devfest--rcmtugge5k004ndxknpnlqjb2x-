# Smart Escape: Design and UX guide

## 1. Design intent

Smart Escape is a calm, trustworthy tool for a stressful subject. The visual language borrows from **wayfinding and safety signage**: plain shapes, strong contrast, green for exits, red for hazards. It should feel like a well-made transit map, not a game and not a generic dashboard.

**One memorable thing:** the route. A thick blue ribbon that draws itself across the plan and a large total-cost figure beside it. Everything else stays quiet so the route is the first thing the eye finds.

**Principles**
1. The answer comes first: route, cost, or the reason there is none.
2. Never rely on colour alone. Every state has a colour, a shape or pattern, and a text label.
3. Controls respond instantly; motion explains a change and never delays it.
4. Bangla and English are equals (same layout, same quality).
5. Fewer words, plain verbs, same name for the same action everywhere.

## 2. Tokens

### Colour (light theme)

| Token | Hex | Use |
|---|---|---|
| `--canvas` | `#F2F5F9` | App background, map backdrop |
| `--surface` | `#FFFFFF` | Panels, popovers, cost chips |
| `--ink` | `#101B33` | Primary text |
| `--ink-muted` | `#55627A` | Secondary text |
| `--line` | `#D3DAE6` | Idle corridors, borders |
| `--route` | `#1B5FD6` | Route ribbon, primary buttons, focus ring |
| `--route-halo` | `rgba(27,95,214,.18)` | Soft glow under the route |
| `--exit` | `#0F8A5F` | Open exits |
| `--exit-soft` | `#E3F4EC` | Exit backgrounds in lists |
| `--hazard` | `#C5303B` | Blocked or closed |
| `--hazard-soft` | `#FBE9EA` | Hazard backgrounds in lists |
| `--start` | `#F2A41B` | Start ring (use `#8A5200` for start text on white) |
| `--disabled` | `#9AA5B8` | Unavailable controls and dimmed edges |

Verify text contrast is at least 4.5:1 and graphics at least 3:1 before finishing.

### Type
- **Latin and numerals:** Atkinson Hyperlegible (designed for legibility). **Bangla:** Hind Siliguri. Stack: `"Atkinson Hyperlegible", "Hind Siliguri", "Noto Sans Bengali", system-ui, sans-serif`.
- Scale (px): 12 (map labels, chips) / 14 (secondary) / 16 (body) / 20 (section titles) / 28 (building name) / 44 (total cost).
- Weights: 400 body, 600 titles and buttons, 700 for the cost figure.
- Bangla needs **line-height at least 1.6** (matras clip at tight values) and about +1px size. Latin line-height 1.4.
- Sentence case everywhere. No all-caps labels, no tracked-out eyebrows.

### Space, shape, depth
- 4px base grid: 4, 8, 12, 16, 24, 32.
- Radius by role: 6 (inputs, chips), 10 (cards and panels), 999 (pills, exit nodes). Rooms on the map use 8.
- Panels use a 1px `--line` border, no shadow. Only popovers and the mobile sheet use a shadow (`0 8px 24px rgba(16,27,51,.14)`).

### Motion
| Moment | Duration | Easing |
|---|---|---|
| Route draw-on (stroke-dashoffset) | 300 ms | ease-out |
| Start selected: ring pulse | one pulse, 400 ms | ease-out |
| Hazard toggle: colour and pattern fade | 150 ms | ease |
| Popover open | 120 ms | ease-out |
| Route card content swap | 150 ms cross-fade | ease |

Rules: no looping animation, no flashing, no entrance animation on page sections. Under `prefers-reduced-motion: reduce`, all durations become 0 ms. The route is computed synchronously, animation runs afterward and is never awaited.

## 3. Layout

### Desktop (1024 px and up)
```
┌────────────────────────────────────────────────────────────────────┐
│ Smart Escape   Building name        [Import file] [Load sample]  EN | বাং │
├──────────────────────────────────────────────┬─────────────────────┤
│                                              │  Route card         │
│                                              │   status / cost /   │
│                  MAP (SVG)                   │   exit / sequence   │
│            fits and centres the plan         │  ─────────────────  │
│                                              │  Start  [select ▾]  │
│                                              │  Hazards            │
│  Legend (bottom left)                        │   Rooms | Corridors | Exits │
│                                              │   list with switches│
│                                              │  [Reset hazards]    │
└──────────────────────────────────────────────┴─────────────────────┘
```
- Side panel is 360 to 400 px wide and scrolls internally; the route card is pinned at the top of it.
- Map takes the remaining width and full remaining height, on `--canvas` with a faint 24px dot grid (3% ink) for a plan-paper feel.
- Left-align all text. Numbers use tabular figures where available.

### Mobile (under 768 px)
- Map on top (about 55% of viewport height), top bar collapses to the building name plus a menu button for import and sample.
- **Bottom sheet** with three snap points (peek, half, full). Peek always shows the one-line status and total cost. The Hazards lists and Start select live inside.
- Language toggle stays visible in the top bar. All tap targets are at least 44 px.

### Tablet
Side panel becomes a 320 px column. Below 900 px switch to the mobile layout.

## 4. Screens and states

**Empty (nothing loaded):** centred card on the canvas. Title "Load a building", one sentence on what the file is, a drop zone ("Drop building.json here or choose a file"), and a secondary button "Load sample". Nothing else.

**Invalid file:** keep the previous building. Show an inline error panel above the drop zone: heading "This file can't be used", then a list of plain-language problems with their location (for example "Corridor C7: cost must be a positive whole number"). Maximum 8 listed, then "and 3 more". Errors state what is wrong and how to fix it; no apologies.

**Loaded, no start:** the route card says "Choose a starting room" with a pointer to the map and the select. Rooms and junctions on the map get a subtle hover outline to invite a click.

**Route found:** see section 6.

**No route available:** neutral-warning card (not alarming red wash): icon, "No route available", one line "Every exit is closed or cut off from your start." Offer a hint: "Reopen an exit or unblock a corridor." Map shows no route; start stays marked.

**Starting location blocked:** hazard-tinted card: "Starting location blocked", with the action button "Unblock [label]" and the hint "or choose another start".

## 5. Map visual language

| Element | Normal | Special states |
|---|---|---|
| **Room** | Rounded square 36 px, white fill, ink 2 px outline | Start: amber ring (4 px) with a small "start" flag. Blocked: red diagonal-hatch fill, red outline, "✕" glyph |
| **Junction** | Circle 22 px, white fill, ink outline | Start and blocked as above |
| **Exit (open)** | Pill 52 x 30 px, `--exit` fill, white door-arrow glyph | On the route: label bold plus a check badge |
| **Exit (closed)** | Same pill, grey fill, red bar across | Distinct from blocked rooms by shape and bar |
| **Corridor** | 2 px `--line` line | Blocked: red dashed line with a "✕" badge at midpoint. Unusable because an end node is blocked: faded grey dashed line, no badge |
| **Cost chip** | White pill, 12 px text, centred on corridor midpoint | Chips on the route turn `--route` with white text |
| **Route** | 6 px `--route` ribbon with halo, draws from start to exit | Direction dots every 40 px (static) |
| **Labels** | 12 px, below the node, white text-halo (`paint-order: stroke`) | Wrap to two lines instead of truncating |

- Show the **label** on the map and the **ID** in the route sequence and tooltips.
- Hover: raise the element 1 px and show a tooltip with label, ID, type, and status.
- Click or tap a **room or junction:** small action menu with "Set as start" and "Block" (or "Unblock"). Blocked nodes cannot become the start; the menu shows only "Unblock".
- Click or tap a **corridor** (wide hit area): "Block corridor" or "Unblock corridor", plus cost.
- Click or tap an **exit:** "Close exit" or "Reopen exit".
- Menus close on outside click, Escape, or after choosing. Hazards also have switches in the side panel, so nothing depends on the map popovers.
- **Legend** (bottom left, collapsible on mobile) shows all node types and the hazard states with the same glyphs.

## 6. Route card (the hero)

```
┌──────────────────────────────────────┐
│ Safest exit                          │
│ 7                         Exit E1    │
│ total cost                Main door  │
│                                      │
│ R1 ─2─ C1 ─3─ C2 ─2─ E1              │  <- chips, edge costs between
│ R1 - C1 - C2 - E1                    │  <- plain text, selectable, data-testid
└──────────────────────────────────────┘
```
- Total cost at 44 px / 700 in `--route`. Exit name and ID to its right.
- Sequence chips show the **ID** large and the label small. Edge costs sit between chips. The row wraps on narrow widths.
- Hovering a chip highlights that node on the map.
- When the route changes, the card cross-fades (150 ms) and the map ribbon redraws.
- Status text uses `aria-live="polite"`.

## 7. Side panel components

- **Start:** native `<select>` grouped by type, blocked items shown disabled with "(blocked)".
- **Hazards:** segmented control with three tabs (Rooms and junctions / Corridors / Exits). Each row: label, ID, current state, and a switch. Corridor rows read "C1 to C2, cost 3". Counts on tabs show how many are active, for example "Corridors (2)".
- **Reset hazards:** secondary button, disabled when the state already equals `initial_state`. Resetting shows a brief inline confirmation ("Hazards restored"), no modal.
- Switch labels: rooms and junctions "Blocked", corridors "Blocked", exits "Closed".

## 8. Copy and Bangla

Use these exact phrases for the required statuses; keep the same vocabulary across the whole UI.

| Key | English | বাংলা |
|---|---|---|
| status.noRoute | No route available | কোনো রুট পাওয়া যায়নি |
| status.startBlocked | Starting location blocked | শুরুর স্থান ব্লক করা আছে |
| status.chooseStart | Choose a starting room | একটি শুরুর কক্ষ বেছে নিন |
| route.totalCost | Total cost | মোট খরচ |
| route.exit | Exit | নির্গমন পথ |
| action.block / unblock | Block / Unblock | ব্লক করুন / ব্লক সরান |
| action.close / reopen | Close exit / Reopen exit | বন্ধ করুন / আবার খুলুন |
| action.setStart | Set as start | শুরু হিসেবে বেছে নিন |
| action.reset | Reset hazards | বিপদ রিসেট করুন |
| action.import | Import file | ফাইল ইমপোর্ট করুন |
| action.sample | Load sample | নমুনা লোড করুন |
| type.room / junction / exit | Room / Junction / Exit | কক্ষ / সংযোগস্থল / নির্গমন পথ |
| term.corridor | Corridor | করিডর |
| term.hazards | Hazards | বিপদ |

The Bangla strings are a starting point; keep wording consistent and have a Bangla speaker review if possible. Dataset labels are shown unchanged. Numerals can stay as Western digits for consistency with node IDs.

Language toggle: a two-segment control, "EN" and "বাংলা", with the active segment filled. Switching never resets the session.

## 9. Accessibility

- Full keyboard path: Tab to import, language, start select, hazard lists, reset; the map's nodes and corridors are focusable (`tabindex`, Enter or Space opens the action menu). Focus ring: 3 px `--route` with 2 px white offset.
- `aria-live="polite"` for the status; `aria-label` on every icon-only control; `<html lang>` updates with the language.
- State is never colour-only (pattern, glyph, text). Check with a greyscale screenshot.
- Respect `prefers-reduced-motion`. Optional extra: high-contrast toggle that swaps tokens.

## 10. Do and don't

**Do:** one accent used for routes and primary actions; consistent radii by role; generous spacing; real labels from the dataset; informative empty and error states.

**Don't:** gradient washes, identical shadowed cards stacked everywhere, decorative animation, all-caps eyebrow labels, numbered section markers, emoji as icons, modal dialogs for simple toggles, or truncating the node labels the judges need to read.

## 11. Design QA checklist (before Phase 6)

- [ ] Route and cost are the first thing noticed in a 2-second glance
- [ ] Greyscale screenshot still distinguishes blocked node, blocked corridor, closed exit, start, route
- [ ] Bangla mode: no clipped glyphs, no overflow, no leftover English UI strings
- [ ] 390 px width: map usable, bottom sheet peek shows status and cost
- [ ] 60-node dataset: labels readable, no cost chips hiding other chips
- [ ] Keyboard-only run: select R1, block C2, read the new route, reset
- [ ] Reduced-motion on: nothing animates, everything still works
