---
trigger: always_on
---

# Darts Tracker Project Context & Rules

## Project Overview

**Darts Tracker** is a premium, offline-first web application for tracking dart matches (initially focused on x01 games like 501). It is built to run flawlessly on mobile devices as a PWA, keeping the user in the zone with fast, responsive inputs and elegant design.

## Core Architecture

- **Match Logic (`src/game.ts` or `src/match.ts`)**:
  - Manages the state of a darts match (Sets, Legs, Current Player, Remaining Score).
  - Validates inputs (0-180, bust rules).
  - Statistics and match history are persisted in `localStorage`.
- **UI Engine (`src/main.ts` & `src/style.css`)**:
  - High-performance dark mode with glassmorphism inherited from Pitchle.
  - Responsive design targeting everything down to 420px width for mobile dartboard-side usage.
- **Audio System (`src/audio.ts`)**:
  - Provides instant, non-intrusive feedback for inputs (e.g., a subtle click for number entry, a bright chime for hitting a checkout, an error buzz for invalid entries/busts).

## Development Rules

1. **Aesthetics**: Maintain the premium, "wow" factor from the Pitchle framework. Use Google Fonts (Inter/Outfit), smooth gradients, and micro-animations. The scoreboard should be highly legible from a distance.
2. **Responsiveness**: All new features MUST be tested at 420px width. The numpad must be perfectly sized for "fat-finger" touch inputs while holding a dart.
3. **Consistency**:
   - The UI should never shift unexpectedly when a turn changes; use stable layout techniques.
   - Modals and settings must use the established Pitchle overlay style and glassmorphism.
4. **Testing**: Ask the developer to test new features, particularly touch-input responsiveness on an actual mobile device.
5. **Persistence**: User statistics (total matches played, win %, 180s hit, highest checkout) must be stored in `localStorage` and synchronized.
6. **Function Comments**: Use inline comments for function arguments (e.g., `/* isLoad= */ true`) to improve readability and searchability.
7. **Hover Styles**: All CSS `:hover` rules MUST be wrapped in `@media (hover: hover) { ... }` to prevent "sticky hover" on touch devices. The `:active` pseudo-class does NOT need wrapping.

## Deployment

The project is built with Vite and targets GitHub Pages for deployment.

- **PWA**: The app is a Progressive Web App using `vite-plugin-pwa`. The service worker auto-caches all static assets for offline use (crucial for dartboards in garages/basements without WiFi). App icons (`icon-192.png`, `icon-512.png`) live in `public/`.