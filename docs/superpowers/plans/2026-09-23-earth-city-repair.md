# Earth-like City Repair Chapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the alien wilderness entry experience with a first-person human city where conversation evidence and player assumptions lead to three physical ship-repair materials and escape.

**Architecture:** Keep the Three.js browser and Express/TypeSafe split. Add a city-specific, serializable state model with authored facts and dialogue lines; Jev selects only among offered NPC activity, dialogue, and next-lead IDs. A new city bootstrap owns visuals, controls, dialogue/journal overlays, save, and repair flow, leaving the old wilderness modules available only for migration/reference.

**Tech Stack:** TypeScript, Three.js, Vite, Express, `@typesafe-ai/sdk`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-23-earth-city-repair-design.md`

## Global Constraints

- One contiguous district, four named residents, and exactly three repair materials in the first slice.
- Player input supports typed questions and suggested topics; all factual resident lines come from authored data.
- Jev selects each named resident's new high-level activity, dialogue response ID, and optional ship-computer lead. No local fallback silently chooses one.
- The TypeSafe key remains server-only in ignored `.env`; old wilderness saves are not parsed as city saves.
- The player chooses routes and pickups; code validates access, inventory, installation, and ending.

## Review Focus

- Unknown or malicious typed question: show a safe authored clarification, escape HTML, and add no invented clue (Task 3/4).
- Stale dialogue reply after leaving a resident or starting a new question: ignore it without changing evidence (Task 3/4).
- Contradictory resident claims: preserve both with source and allow the player to mark a hypothesis supported or disputed (Task 1/5).
- A player who reaches a material early: enforce its physical access condition without making a dialogue choice the only way forward (Task 1/6).
- Missing Jev connection: keep traversal available, stop new named-resident decisions/conversations, show retry, and preserve progress (Task 3/7).

---

### Task 1: City state and repair rules

**Files:** Create `src/city/model.ts`, `src/city/content.ts`, `src/city/state.ts`, `tests/city-state.test.ts`.

**Interfaces:** `createCityState(): CityState`; `recordClaim(state, responseId): CityState`; `setAssumption(state, materialId, locationId, evidenceIds): CityState`; `collectMaterial(state, materialId): CityState`; `installMaterial(state, materialId): CityState`; `isLaunchReady(state): boolean`. `CityState` contains player, residents, claims, assumptions, material locations, inventory, access flags, and installed parts. Content exports resident definitions and response options by ID.

- [ ] **Step 1: Write failing tests** for one source-attributed claim, contradictory claims retained together, an invalid evidence ID being rejected, a locked material staying in place, and launch requiring all three installed parts. Use authored IDs from `content.ts` such as `mechanic-power`, `courier-power`, and `power-cell`.
- [ ] **Step 2: Run** `npm test -- tests/city-state.test.ts` and confirm behavioral failures.
- [ ] **Step 3: Implement** the serializable types, four resident definitions, three material definitions, immutable state transitions, and explicit access predicates. Example: `canCollectMaterial(state, 'power-cell')` checks the workshop's physical access flag and proximity; it does not check whether the player clicked a particular dialogue line.
- [ ] **Step 4: Run** focused tests and `npm run typecheck`, then commit `feat: model city evidence and ship materials`.

### Task 2: Typed Jev city choices

**Files:** Create `src/city/decisions.ts`, `server/city-jev.ts`, `tests/city-jev.test.ts`; modify `server/app.ts` and `server/fake-jev.ts` only where shared HTTP setup needs the city route.

**Interfaces:** `CityChoiceInput` has `{ kind: 'dialogue' | 'activity' | 'lead', actorId, epoch, state, options }`, where every option has a stable ID and description. `POST /api/city-choice` validates options against authored content and returns `{ actorId, epoch, choiceId, elapsedMs, usage }`. `requestCityChoice(input, evaluator?)` calls `systemOne` with one typed Choice question. `fakeCityChoice` selects a deterministic valid option for tests.

- [ ] **Step 1: Write failing adapter/HTTP tests** proving a returned ID maps to an offered option, unoffered IDs are rejected, no API key yields a clear unavailable response, and a malformed/oversized utterance cannot pass validation.
- [ ] **Step 2: Run** `npm test -- tests/city-jev.test.ts tests/server.test.ts` and confirm failures.
- [ ] **Step 3: Implement** the route with the existing server-held client pattern. Dialogue options include a `clarify` ID; lead options include `seek-more-evidence`. Do not return model-authored prose. Reuse the scheduler's unique request ticket pattern so late replies cannot overwrite newer questions.
- [ ] **Step 4: Run** focused tests, typecheck, and a fake HTTP smoke request; commit `feat: route city decisions through Jev`.

### Task 3: A walkable, inhabited district

**Files:** Create `src/city/habitat.ts`, `src/city/residents.ts`, `src/city/audio.ts`, and `src/city/game.ts`; modify `src/main.ts` to invoke the initial city bootstrap. Add `tests/city-layout.test.ts` and `e2e/city-shell.spec.ts`.

**Interfaces:** `createCityHabitat(scene)` returns `{ shipPosition, residentPositions, materialPositions, heightAt, occluders, interactionPoints }`. `createResidentViews(scene, residents)` returns `sync(state, alpha)` and `dispose()`. Background crowds and vehicles are presentation-only and have no clue-bearing dialogue.

- [ ] **Step 1: Write a failing layout test** that all four residents and three material sites lie in the traversable district, have distinct positions, and are reachable from the crash lot without crossing a blocking facade.
- [ ] **Step 2: Run** the layout test and confirm failure.
- [ ] **Step 3: Build** roads, sidewalks, crossings, storefronts, facade variation, streetlights, signage, parked cars, distant skyline, street audio, and four readable human figures with idle/walk/work/talk poses. Keep instancing and shared materials where practical. Place the ship in a crash lot with a clear return route. The initial `startCityGame` renders the district and lets the player walk; later tasks add conversations and repair.
- [ ] **Step 4: Capture and inspect** a street-level frame at the crash lot, market, and workshop. Run layout test and build; commit `feat: build inhabited city district`.

### Task 4: Resident schedules and conversations

**Files:** Create `src/city/activities.ts`, `src/city/conversation.ts`, `src/ui/conversation.ts`, `tests/city-conversation.test.ts`, `e2e/city-conversation.spec.ts`; update `index.html` and `src/style.css` for dialogue panel.

**Interfaces:** `getValidActivities(resident, state): CityChoiceOption[]`; `applyResidentActivity(state, result): CityState`; `getDialogueOptions(residentId, utterance, state): CityChoiceOption[]`; `applyDialogueChoice(state, residentId, choiceId): CityState`. UI offers typed input plus suggested topics, source/name subtitle, close action, and a busy/error state.

- [ ] **Step 1: Write failing tests** for a mechanic answering a power question, an unknown question selecting `clarify` without recording a claim, resident memory changing an offered response, and a late reply ignored after the dialogue epoch changes. Browser test opens conversation from first-person proximity, submits text, and closes cleanly.
- [ ] **Step 2: Run** focused unit and browser tests to confirm failure.
- [ ] **Step 3: Implement** resident activity scheduling through Jev and authored dialogue responses through the city-choice route. A conversation releases pointer lock and resumes the view on close. Escape typed text before rendering. Limit utterance length and preserve input while a request is pending.
- [ ] **Step 4: Run** tests/build and visually inspect subtitle/panel readability at 1440×900; commit `feat: add stateful city conversations`.

### Task 5: Evidence journal and Jev lead analysis

**Files:** Create `src/ui/city-journal.ts`, `src/city/leads.ts`, `tests/city-leads.test.ts`, `e2e/city-journal.spec.ts`; extend `index.html` and `src/style.css`.

**Interfaces:** `getAvailableLeads(state): CityChoiceOption[]` returns authored location/material leads supported by current claims and a `seek-more-evidence` option. `applyLeadChoice(state, result): CityState` stores a suggestion with supporting claim IDs and no objective truth label.

- [ ] **Step 1: Write failing tests** for a lead citing only heard/observed evidence, preserving two conflicting claims, rejecting an unoffered lead, and showing `seek-more-evidence` before enough clues exist. Browser test enters a part-location assumption and reviews the source list.
- [ ] **Step 2: Run** focused tests to confirm failure.
- [ ] **Step 3: Implement** journal tabs for claims, observations, assumptions, and repair diagnostics; an optional ship-computer Analyze action sends the current belief state to Jev and returns one typed lead. The player retains control of the destination.
- [ ] **Step 4: Run** tests/build and inspect the panel visually; commit `feat: turn conversation evidence into repair leads`.

### Task 6: Material routes, repair, ending, and persistence

**Files:** Modify `src/city/game.ts`; create `src/city/save.ts`, `tests/city-save.test.ts`, `e2e/city-escape.spec.ts`; update `src/ui/visor.ts` and `index.html` for the full repair mission.

**Interfaces:** `startCityGame(mount, uiRoots): void` owns rendering, controls, interaction target selection, decision scheduling, save/reconnect, and ending. City save uses `alien-ecosystem:city:v1`, separate from the wilderness key. Physical material access and installation call Task 1's pure functions.

- [ ] **Step 1: Write failing tests** for city save round-trip with claims/assumptions/resident memory, malformed save recovery, collection only at accessible locations, and a browser path that talks to residents, gathers all three parts, installs them, and launches. Verify the old wilderness save key remains untouched.
- [ ] **Step 2: Run** focused tests and browser path to confirm failure.
- [ ] **Step 3: Implement** the city bootstrap, item views, collision/range checks, material collection, ship console repair, autosave, and link-loss retry. Replace the old entry screen and mission copy with the city premise. Keep debug teleport available only behind `?debug=1` for browser test routing.
- [ ] **Step 4: Run** full `npm test`, `npm run build`, and `npm run e2e`; commit `feat: complete city repair and escape loop`.

### Task 7: Live and human validation

**Files:** Update `README.md`, `docs/playtest.md`, `docs/jev-measurements.md`, `docs/performance.md`; add inspected screenshots under `docs/screenshots/city/`.

- [ ] **Step 1: Run** a live Jev dialogue and lead-choice smoke using the ignored key, recording selected IDs, latency, usage, and whether the authored line matches the question. Do not print or commit the key.
- [ ] **Step 2: Observe** a ten-minute city session with four named Jev residents and record request rate, stale/error counts, and whether each resident continues its routine. Test one service interruption and retry.
- [ ] **Step 3: Capture and inspect** arrival, conversation, journal, material pickup, and repaired ship screens; note any procedural-art limits. Run a blind player session with only in-game instructions and record whether they infer all three material routes and notice the conflicting claim. If no first-time player is available, mark only that gate pending.
- [ ] **Step 4: Update docs and rerun full checks**. Commit `docs: validate city repair chapter` only with measured claims; keep any unmeasured acceptance gate clearly open.
