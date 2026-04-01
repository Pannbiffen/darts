---
trigger: always_on
---

# Darts Tracker Project Context & Rules

## Project Overview

**Darts Tracker** is a premium, offline-first web application for tracking dart matches (initially focused on x01 games like 501). It is built to run flawlessly on mobile devices as a PWA, keeping the user in the zone with fast, responsive inputs and elegant design.

## Core Architecture

- **Match Logic (`src/match.ts` & `src/clock_match.ts`)**:
  - `match.ts` manages the state of a 501 darts match (Sets, Legs, Current Player, Remaining Score). Validates inputs (0-180, bust rules).
  - `clock_match.ts` manages the "Around the Clock" mode for solo and multiplayer (target progression, set tracking, undo stack). Records results tagged with player count.
- **Statistics (`src/stats.ts`)**:
  - Persists lifetime stats (matches played, win %, 180s, highest checkout, ATC personal best, ATC history per player count) in `localStorage`.
  - ATC history entries carry a `playerCount` field (defaults to 1 for backward compatibility). Stats screen filters by the active game's player count.
  - Supports per-player-count computed averages (lifetime, last 10, past week, past month), individual entry deletion with best-score recalculation, and test data injection via `injectTestAtcData()`.
- **UI Engine (`src/main.ts`, `src/ui.ts` & `src/style.css`)**:
  - High-performance dark mode with glassmorphism inherited from Pitchle.
  - Responsive design targeting everything down to 420px width for mobile dartboard-side usage.
  - `ui.ts` renders the scoreboard and numpad for both 501 and ATC modes.
- **Audio System (`src/audio.ts`)**:
  - Provides instant, non-intrusive feedback for inputs (e.g., a subtle click for number entry, a bright chime for hitting a checkout, an error buzz for invalid entries/busts).

## Development Rules

1. **Aesthetics**: Maintain the premium, "wow" factor from the Pitchle framework. Use Google Fonts (Inter/Outfit), smooth gradients, and micro-animations. The scoreboard should be highly legible from a distance.
2. **Responsiveness**: All new features MUST be tested at 420px width. The numpad must be perfectly sized for "fat-finger" touch inputs while holding a dart.
3. **Consistency**:
   - The UI should never shift unexpectedly when a turn changes; use stable layout techniques.
   - Modals and settings must use the established Pitchle overlay style and glassmorphism.
4. **Testing**: Ask the developer to test new features, particularly touch-input responsiveness on an actual mobile device.
5. **Persistence**: User statistics and settings (total matches played, win %, 180s hit, highest checkout, ATC personal best & history, mute state) must be stored in `localStorage` and synchronized.
6. **Function Comments**: Use inline comments for function arguments (e.g., `/* isLoad= */ true`) to improve readability and searchability.
7. **Hover Styles**: All CSS `:hover` rules MUST be wrapped in `@media (hover: hover) { ... }` to prevent "sticky hover" on touch devices. The `:active` pseudo-class does NOT need wrapping.
8. **Scoreboard Integrity**: When updating game scoreboards (X01 or ATC), perform incremental DOM updates by reusing existing elements where possible. This preserves the horizontal scroll position and ensures smooth, high-frame-rate transitions between players without flickering or "jumps" to the first player.
9. **Vertical Scroll Lock**: To prevent the unwanted "rubber-band" bounce in standalone PWA mode on iOS, the `body` and `html` elements must be locked to the viewport using `position: fixed` and `overflow: hidden`. Any scrollable content (like the multiplayer scoreboard or modals) must use specific `touch-action` or container-level scroll management.
10. **iOS Safe-Area/Viewport Synchronicity**: To avoid visible cropping and "line" artifacts in standalone PWA mode on iPhone, maintain synchronicity between the outer #app container and the main content area. Never use bottom padding on the #app element; instead, apply `env(safe-area-inset-bottom)` directly to the main or specific scrollable content areas to prevent layout gaps and clipping.

## Deployment

The project is built with Vite and targets GitHub Pages for deployment.

- **PWA**: The app is a Progressive Web App using `vite-plugin-pwa`. The service worker auto-caches all static assets for offline use (crucial for dartboards in garages/basements without WiFi). App icons (`icon-192.png`, `icon-512.png`) live in `public/`.
