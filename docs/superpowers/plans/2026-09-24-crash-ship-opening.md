# Crash Ship Opening Implementation Plan

**Goal:** Start the explorer aboard a crashed ship, let them exit and conceal it, then use city conversations and collected parts to repair and launch it.

**Architecture:** `CityState.shipStage` stores `aboard`, `outside`, or `hidden`. Pure transitions in `src/city/state.ts` control exit and concealment. The separated crash-site layout uses a v2 city save slot, preserving older v1 data. `src/city/ship.ts` owns the 3D wreck and cloaked marker; `src/city/outskirts.ts` supplies a quiet approach road to the populated district. `game.ts` connects entry, concealment, objective text, and ship visibility.

**Tech Stack:** TypeScript, Three.js, Vitest, Playwright, Vite.

## Tasks

- [x] Add state transition tests for exit, conceal/reveal, repair gating, and old-save migration in `tests/city-state.test.ts` and `tests/city-save.test.ts`; run them red; implement `shipStage`, `exitShip`, and `toggleShipCloak` in `model.ts`, `state.ts`, and `save.ts`; run green.
- [x] Add a scene test asserting a substantial named ship group, hatch/ramp, and the exposed/hidden visibility contract; run red; build `src/city/ship.ts` with a fuselage, canopy, wings, thrusters, damage, repair console, and a locator visible while cloaked. Replace the temporary ship pieces in `habitat.ts`; run green.
- [x] Extend `e2e/city.spec.ts` to exit the ship, conceal it, ask for parts, reveal it, install all three parts, and launch. Run the new flow red. Update `game.ts` and `index.html` so the first button exits the ship, the nearby concealment switch uses `E`, and mission copy follows the ship stage. Add cockpit styling in `src/style.css`; run the browser flow green.
- [x] Place the wreck beyond the city, connect it to a marked road, and keep pedestrians and traffic concentrated in the urban blocks.
- [x] Inspect cockpit, crash site, and city-arrival screenshots. Run `npm test`, `npm run build`, `npm run e2e`, and `git diff --check`; leave the local dev server running.

## Review Focus

- The new save slot opens with the cockpit while older v1 saves remain untouched.
- Cloaking is reversible and keeps a clear way to find the wreck again.
- Repairs cannot be performed on a concealed ship.
- The existing resident conversations, evidence journal, and three repair locations remain usable.
