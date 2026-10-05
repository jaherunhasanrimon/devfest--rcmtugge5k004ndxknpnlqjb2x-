# Smart Escape: Interactive Evacuation Route Simulator

> An educational simulation web application that calculates and displays optimal evacuation routes under dynamic hazard conditions. Built for the AI DevFest timed competition.

## Identity & Submission Details
- **Participant Name:** Jahirun Hassan Rimon
- **Registration Number:** rcmtugge5k004ndxknpnlqjb2x-
- **Repository:** https://github.com/jaherunhasanrimon/devfest--rcmtugge5k004ndxknpnlqjb2x-
- **Live Deployment Link:** TBD (Phase 4 early deploy)

---

## Running Instructions

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Setup & Run Locally
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run Vitest test suite
npm test

# Build for production
npm run build

# Preview production build locally
npm run preview
```

---

## Features
### Mandatory Features
- **Deterministic Offline Dijkstra Routing:** Cost based purely on edge weights, exact tie-breaking (min exit ID code-unit comparison, min node-ID path sequence).
- **Interactive SVG Map:** Fully vector-scaled map with rooms, junctions, exits, corridors, and dynamic cost chips.
- **Dynamic Hazard Simulation:** Real-time toggling of room/junction blocks, corridor blocks, and exit closures with instant recalculation.
- **Strict Validation:** Comprehensive JSON schema and consistency validator with localized error reporting; invalid imports preserve the current building.
- **Bilingual Interface:** Complete English and Bangla localization with seamless language switching.
- **Fail-safe Feedback:** Explicit handling for "No route available" and "Starting location blocked" states.
- **One-Click Reset:** Instantly restores original `initial_state`.

### Optional & Bonus Enhancements
- High-contrast / accessible visual language
- Keyboard navigation and screen reader live announcements

---

## Known Issues
- None currently identified.

---

## AI Tools & Disclosures
- **AI Tool Used:** Antigravity (Google DeepMind)
- **Most Useful Prompt:** *"Execute Phase 0 and Phase 1 from docs/phases.md, then continue through the remaining phases following the protocol."*
