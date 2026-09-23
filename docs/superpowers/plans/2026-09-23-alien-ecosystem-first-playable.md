# Alien Ecosystem First Playable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable first-person browser expedition in one realistic alien habitat, where Jev chooses every creature's new action and the player learns an egg guardian's rule to recover one ship component.

**Architecture:** A TypeScript browser client runs rendering, movement, animation, inventory, the journal, and a deterministic world clock. A Node service holds the TypeSafe key and answers creature decision requests through Jev. Shared pure modules define species rules, valid intents, memory events, and save data; the browser never chooses a new creature action locally.

**Tech Stack:** Node 26, npm, TypeScript, Vite, Three.js WebGL renderer, Express, `@typesafe-ai/sdk`, Vitest, Playwright. Use WebGL 2 as the rendering baseline and keep the TypeSafe SDK on the server. [Three.js installation](https://threejs.org/manual/pages/installation.html), [Vite guide](https://vite.dev/guide/), [TypeSafe JavaScript SDK](https://docs.typesafe.ai/sdk/javascript), [TypeSafe Choice](https://docs.typesafe.ai/primitives/choice).

**Spec:** `docs/superpowers/specs/2026-09-23-alien-ecosystem-design.md`

## Global Constraints

- Deliver a browser game with first-person 3D, realistic materials and lighting, a helmet visor, and a field journal.
- The first playable slice has one contiguous habitat, three interacting species, and roughly 20–40 active creatures.
- Every new creature high-level action must originate from a valid Jev Choice result. Movement and animation may execute that action in code.
- Species rules must be stable enough to discover; memory belongs to individuals and does not spread between creatures.
- Air and suit power limit excursions. Eggs are emergency food and provoke the guardian when carried through its territory.
- Active play requires the decision service. On prolonged failure, save and pause with a reconnect screen; do not generate substitute creature decisions.
- First-playable scope excludes weapons, multiplayer, a procedural planet, and inter-creature teaching.
- Keep `TYPESAFE_API_KEY` server-side and absent from client bundles, logs, and saved games.

## File Map

| Path | Responsibility |
| --- | --- |
| `src/shared/model.ts` | Serializable world, creature, player, intent, and event types. |
| `src/shared/species.ts` | Three species' fixed traits and valid intent generation. |
| `src/shared/memory.ts` | Individual memory updates from actual events. |
| `src/shared/journal.ts` | Observable evidence and player hypotheses. |
| `src/shared/survival.ts` | Air, power, food, inventory, and repair rules. |
| `src/shared/save.ts` | Versioned save validation and migration entry point. |
| `server/jev.ts` | TypeSafe SDK adapter and response validation. |
| `server/fake-jev.ts` | Deterministic test-only decision adapter. |
| `server/app.ts` | HTTP decision and health routes; error responses. |
| `src/game/scheduler.ts` | Staggered decision due times, in-flight tracking, stale reply rejection. |
| `src/game/world.ts` | Fixed-step world update and action execution. |
| `src/game/habitat.ts` | Terrain, ship, nest, repair component, lighting, and fog. |
| `src/game/creatures.ts` | Three creature meshes, motion, calls, and visible behavior cues. |
| `src/game/controls.ts` | Pointer lock, first-person movement, hide, inspect, and pickup. |
| `src/game/persistence.ts` | Browser save and reconnect state. |
| `src/ui/visor.ts` | Helmet HUD, scanner feedback, and interaction prompts. |
| `src/ui/journal.ts` | Sighting list, individual history, and hypothesis editing. |
| `src/main.ts` | App composition, loading, game loop, and win state. |
| `tests/` and `e2e/` | Unit, service, and browser interaction tests. |

## Review Focus

1. **Stale Jev reply after a new world event:** ignore it; the creature must not act on an obsolete state. Cover in Task 3.
2. **Guardian sees an unfamiliar player without eggs:** never initiate an attack against that player. Cover in Task 2.
3. **Previously robbed guardian sees the player without eggs:** show an individual recognition cue while preserving the species rule. Cover in Task 2 and Task 5.
4. **Service drops during an expedition:** finish current actions, then pause and restore the same world on reconnect. Cover in Task 8.
5. **Journal sees a creature behind cover or outside the visor:** do not record knowledge the player could not observe. Cover in Task 7.

---

### Task 1: Running 3D browser shell

**Files:** Create `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `playwright.config.ts`, `index.html`, `.gitignore`, `src/main.ts`, `src/game/controls.ts`, `src/game/habitat.ts`, and `e2e/shell.spec.ts`.

**Interfaces:** Produce `createHabitat(scene: THREE.Scene): Habitat` where `Habitat` exposes `heightAt(x,z): number`, `shipPosition`, `nestPosition`, and `componentPosition`; produce `createControls(camera, canvas, heightAt): Controls` with `update(dt)`, `position`, `isHidden`, and `dispose()`.

- [ ] **Step 1: Scaffold dependencies and scripts.** Create the Vite `vanilla-ts` files directly in the repository root, which already contains the spec. Install runtime packages `three`, `express`, `@typesafe-ai/sdk`; install development packages `typescript`, `vite`, `vitest`, `@playwright/test`, `tsx`, `concurrently`, `@types/node`, `@types/express`, and `@types/three`. Set scripts to `dev: vite`, `test: vitest run`, `typecheck: tsc --noEmit`, `build: tsc --noEmit && vite build`, and `e2e: playwright test`. Configure Playwright with a Vite web server at `http://localhost:5173` and `baseURL` set to the same address; run `npx playwright install chromium` before the first browser test. Commit the lockfile. Use Node 26 locally; the SDK requires Node 20+.
- [ ] **Step 2: Write a browser smoke test, then run it red.** Create `e2e/shell.spec.ts`:

  ```ts
  import { test, expect } from '@playwright/test';
  test('opens a first-person habitat', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enter expedition' })).toBeVisible();
  });
  ```

  Run `npm run e2e -- e2e/shell.spec.ts`; expect a missing canvas/button failure.
- [ ] **Step 3: Implement the shell.** Mount a Three.js `WebGLRenderer`, perspective camera, directional and ambient lights, terrain mesh, ship silhouette, nest landmark, and pointer-lock start button. `heightAt` keeps camera eye height above terrain. Add a WebGL 2 unsupported message. Use the renderer's animation loop only for rendering and control updates; the simulation clock arrives in Task 4.
- [ ] **Step 4: Verify and commit.** Run `npm run typecheck`, `npm run build`, and `npm run e2e -- e2e/shell.spec.ts`. Manually verify pointer lock releases on Escape and the camera cannot walk through the terrain. Commit `feat: add first-person habitat shell`.

### Task 2: Species rules and individual memory

**Files:** Create `src/shared/model.ts`, `src/shared/species.ts`, `src/shared/memory.ts`, `tests/species.test.ts`, and `tests/memory.test.ts`.

**Interfaces:** Export `Action`, `Intent { action: Action; targetId?: string }`, `CreatureState`, `PlayerState`, `WorldState`, `CreatureEvent`, `getValidIntents(creature, world): Intent[]`, and `applyMemoryEvent(creature, event): CreatureState`. IDs and positions are serializable; no Three.js types cross this boundary.

- [ ] **Step 1: Write failing rule tests.** Cover guardian with eggs, guardian without eggs, guardian remembering theft, grazer threatened by stalker, and stalker seeing grazer. Include:

  ```ts
  expect(getValidIntents(guardian, worldWithoutEggs).filter(
    intent => intent.targetId === 'player' &&
      (intent.action === 'HUNT' || intent.action === 'DEFEND')
  )).toEqual([]);
  expect(getValidIntents(guardian, worldWithEggs))
    .toContainEqual({ action: 'DEFEND', targetId: 'player' });
  ```

  Run `npm test -- tests/species.test.ts tests/memory.test.ts`; expect missing exports.
- [ ] **Step 2: Implement the pure model.** Define eight `Action` values exactly as the spec. `getValidIntents` applies species diet, reachability, nearby targets, nest territory, and known-player memory. When an egg carrier is visible inside nest territory, the guardian first gives a visible warning and its offered intents focus on DEFEND or FOLLOW against that player until the threat leaves; this makes the trigger testable even if Jev varies the response. The guardian may recognize a thief without eggs, but that recognition permits FOLLOW or HIDE until another explicit threat occurs; it cannot attack an egg-free unfamiliar player. `applyMemoryEvent` records fed, threatened, injured, and egg theft events with timestamp and capped disposition. It changes only the referenced creature.
- [ ] **Step 3: Verify edge cases and commit.** Test empty target lists, dead targets, duplicate events, and two creatures of one species with different memories. Run `npm test -- tests/species.test.ts tests/memory.test.ts` and `npm run typecheck`. Commit `feat: define learnable species rules and creature memory`.

### Task 3: Jev decision service and stale-response protection

**Files:** Create `server/jev.ts`, `server/fake-jev.ts`, `server/app.ts`, `src/game/scheduler.ts`, `tests/jev.test.ts`, `tests/scheduler.test.ts`, and `.env.example`; modify `package.json`, `vite.config.ts`, and `playwright.config.ts`.

**Interfaces:** Export `requestDecision(input: DecisionInput): Promise<DecisionResult>` from `server/jev.ts`, `createDecisionScheduler(send): DecisionScheduler` from `src/game/scheduler.ts`, and `createApp(decide): Express` from `server/app.ts`. `DecisionInput` carries creature ID, decision epoch, relevant world snapshot, and valid intents; `DecisionResult` echoes ID/epoch and a selected intent plus usage. The browser posts to `/api/decision` through Vite's proxy.

- [ ] **Step 1: Write failing adapter and scheduler tests.** Inject a fake TypeSafe client that returns a Choice key and token usage. Test valid choice, key outside the offered intents, timeout, missing API key, and stale epoch. Include:

  ```ts
  scheduler.issue({ creatureId: 'g1', epoch: 4, intents });
  scheduler.accept({ creatureId: 'g1', epoch: 3, intent: intents[0] });
  expect(scheduler.takeReady('g1')).toBeNull();
  ```

  Run `npm test -- tests/jev.test.ts tests/scheduler.test.ts`; expect missing modules.
- [ ] **Step 2: Implement TypeSafe Choice.** Use `TypeSafeClient` and `choice` from `@typesafe-ai/sdk`. Serialize each offered intent as a short, stable criterion key and include species traits, needs, nearby positions, carried eggs, and individual memory in `state`. Ask one focused question: which valid intent the creature attempts next. Map the returned key back to the offered intent, reject unknown keys, and record response duration and token usage without logging the API key or full player save. `createApp(decide)` accepts an injected decision function for unit and Playwright tests; normal startup wires the real Jev adapter and requires `TYPESAFE_API_KEY`. Put a deterministic fake in `server/fake-jev.ts`: choose `DEFEND:player` when offered, otherwise prefer an available EAT intent, otherwise choose the first offered intent. This fake is only for repeatable tests and must be visibly labelled in any development UI.
- [ ] **Step 3: Implement HTTP and scheduler.** Validate request shape and intent count; return 400 for malformed input, 503 for missing credentials or upstream failure. The scheduler issues decisions on staggered action deadlines, allows one in-flight request per creature, and applies a reply only when ID and epoch still match. A new event increments epoch. While pending, `currentIntent` remains in effect. Add a Vite `/api` proxy to `http://localhost:8787`, start Express on that port when `server/app.ts` runs directly, and change `dev` to `concurrently "vite" "tsx watch server/app.ts"`. Set Playwright's web-server command to `JEV_MODE=fake npm run dev`; the normal `npm run dev` path uses real Jev and cannot silently select the fake.
- [ ] **Step 4: Verify and commit.** Run the two test files, `npm run typecheck`, and a local fake-service HTTP smoke test. If credentials exist, perform one real Jev request and inspect selected key, latency, and usage; otherwise record `live Jev smoke pending credentials` in the task checklist. Commit `feat: route every creature decision through Jev`.

### Task 4: Fixed-step ecosystem and action execution

**Files:** Create `src/game/world.ts`, `tests/world.test.ts`; modify `src/main.ts`.

**Interfaces:** Export `stepWorld(world: WorldState, dt: number): { world: WorldState; events: CreatureEvent[] }` and `applyDecision(world, result): WorldState`. Task 3's scheduler supplies decisions; the world executes but never selects actions.

- [ ] **Step 1: Write failing simulation tests.** Assert HUNT approaches a target and emits contact, FLEE increases separation, EAT changes hunger only at reachable food, MATE requires a valid partner, and a pending decision leaves the current intent active. Test a fixed seed and fixed `dt` produce the same positions and events.
- [ ] **Step 2: Implement action executors.** Use a fixed simulation step (for example 50 ms) for movement, needs, proximity, and action completion. Actions describe goals; code handles steering, terrain bounds, and visible animation phase. On completion or interrupt, mark the creature due for Jev. Do not draw a new action in `stepWorld`.
- [ ] **Step 3: Populate the habitat.** Spawn 20–40 creatures in three species around food, nest, and shelter sites with distinct IDs. Start each creature with `currentIntent: null` and spread first decision deadlines so they do not all request Jev simultaneously; a creature remains stationary until its first Jev response. Give the ship area a safe radius.
- [ ] **Step 4: Verify and commit.** Run `npm test -- tests/world.test.ts tests/scheduler.test.ts` and `npm run typecheck`. Observe ten minutes in the debug overlay: creatures move between needs, requests stay bounded, and none stand permanently idle after a successful response. Commit `feat: simulate the living habitat`.

### Task 5: Realistic habitat and readable creature behavior

**Files:** Create `src/game/creatures.ts`, `src/game/audio.ts`, `src/assets/manifest.ts`; modify `src/game/habitat.ts`, `src/main.ts`, and `index.html`.

**Interfaces:** Export `createCreatureViews(scene, creatures): CreatureViews` with `sync(world, alpha)` and `dispose()`. Export `playCreatureCue(id, cue, position)`; cues include guardian warning, guardian recognition, grazer alarm, and stalker hunt.

- [ ] **Step 1: Establish visual budget.** Target a steady 60 fps on a recent desktop browser with 40 creatures and a readable 30 fps floor during encounters. Use renderer statistics, frame time, and GPU inspection to identify expensive geometry, shadows, and materials. Record baseline numbers in `docs/performance.md`.
- [ ] **Step 2: Build the habitat art pass.** Use layered terrain, physically based ground and rock materials, vegetation clusters, fog, a strong sky and directional light, contact shadows near the player, and distinct nest and ship silhouettes. Freeze any sourced texture/audio files locally under `public/assets/`, record source URL/license in `src/assets/manifest.ts`, and keep the scene fully functional without network asset fetches at runtime.
- [ ] **Step 3: Make three species readable.** Give guardian, grazer, and stalker different silhouettes, scale, gait, calls, and idle posture. Synchronize their visible motion to the simulated action. The guardian has separate DEFEND and remembered-player recognition cues so players can distinguish species instinct from individual memory. Use low-detail distant instances and full-detail nearby views without changing their Jev decisions.
- [ ] **Step 4: Verify and commit.** Capture screenshots from ship, nest edge, and repair site at day and dusk. In a blind review, each species should be identifiable from silhouette and a warning should be noticeable without a HUD label. Run `npm run build`; record measured frame times at 20 and 40 creatures. Commit `feat: add immersive alien habitat and creature cues`.

### Task 6: Tense expedition, inventory, and ship repair

**Files:** Create `src/shared/survival.ts`, `src/game/player.ts`, `src/ui/visor.ts`, `tests/survival.test.ts`, and `e2e/expedition.spec.ts`; modify `src/game/controls.ts`, `src/main.ts`.

**Interfaces:** Export `tickSuit(player, dt): PlayerState`, `interact(world, targetId): WorldState`, and `repairShip(world): WorldState`. The visor reads player state and observable interaction targets; it does not access hidden species rules.

- [ ] **Step 1: Write failing survival tests.** Air drains outside the ship, power drains when scanner or lamp is active, both restore at the ship, eggs enter inventory as food, dropping eggs removes the carried-egg threat, and the repair requires the component. Test air reaching zero triggers a recoverable expedition failure rather than corrupting the save.
- [ ] **Step 2: Implement expedition rules.** Add pickup/drop/use, crouch/hide, short-range inspection, air/power depletion, return-to-ship refill, and a physical console for installing the recovered component. A food use between trips restores recovery resources. Keep these rules in pure functions so the renderer only displays their results.
- [ ] **Step 3: Implement visor.** Show air, power, held item, and a brief inspect prompt as helmet elements with controlled opacity; use breathing and suit audio when air is low. Scanner observations reveal only visible tracks, eggs, and behavior, never the secret condition text.
- [ ] **Step 4: Verify and commit.** Run `npm test -- tests/survival.test.ts` and `npm run e2e -- e2e/expedition.spec.ts`. Manually complete a trip from ship to nest edge and back while the timer creates tension but allows observation. Commit `feat: add suit survival and ship repair loop`.

### Task 7: Field journal and testable hypotheses

**Files:** Create `src/shared/journal.ts`, `src/ui/journal.ts`, `tests/journal.test.ts`, and `e2e/journal.spec.ts`; modify `src/main.ts`.

**Interfaces:** Export `recordObservation(journal, event, visibility): Journal`, `addHypothesis(journal, condition, response): Journal`, and `assessEvidence(journal, observationId, hypothesisId): Journal`. `visibility` includes line of sight, distance, and visor orientation from the world view; hidden state is excluded from journal entries.

- [ ] **Step 1: Write failing evidence tests.** Test visible egg pickup plus guardian DEFEND is recorded, obscured guardian behavior is not recorded, individual IDs link to prior meetings, and the player can label a later sighting as support or conflict without an automatic truth verdict.
- [ ] **Step 2: Implement the evidence model.** Store timestamp, location, observable carried item, visible action, and recognizable creature ID. Keep species pages separate from individual encounter history. Hypotheses use a condition and expected behavior; the player marks evidence relationships manually. A remembered guardian's entry links back to the egg theft encounter.
- [ ] **Step 3: Implement the in-world tablet.** Opening the journal pauses or safely slows the world only while the player is at the ship; in the field it remains an exposed action. Show sighting cards, a hypothesis editor, and support/conflict controls in a diegetic tablet layout. Allow keyboard and mouse operation.
- [ ] **Step 4: Verify and commit.** Run `npm test -- tests/journal.test.ts` and `npm run e2e -- e2e/journal.spec.ts`. Have a fresh player inspect the journal after two contrasting guardian encounters and explain the egg rule without hints. Commit `feat: add observation journal and hypotheses`.

### Task 8: Save, reconnect, and service failure

**Files:** Create `src/shared/save.ts`, `src/game/persistence.ts`, `tests/save.test.ts`, `e2e/reconnect.spec.ts`; modify `server/app.ts`, `src/main.ts`.

**Interfaces:** Export `serializeSave(world, journal): string`, `loadSave(raw): { world: WorldState; journal: Journal }`, and `setDecisionConnection(status: 'ready' | 'waiting' | 'paused')`. Save format starts at version 1.

- [ ] **Step 1: Write failing save and outage tests.** Round-trip world, inventory, repair state, journal, and individual memories. Reject truncated JSON and unknown future save versions with a clear reset/recovery message. Simulate 503 responses: creatures complete current actions, then the world pauses; after service recovery the same expedition resumes without double-applying an old Jev reply.
- [ ] **Step 2: Implement persistence.** Write stable snapshots to browser storage at ship return, repair installation, and outage pause. Keep a previous valid snapshot before replacement. On reload, validate version and required fields before constructing the scene. Do not save the API key or raw TypeSafe request content.
- [ ] **Step 3: Implement reconnect flow.** Show a visor connection warning for a short transient delay; when the decision queue cannot progress, pause the world and show Retry and Return to title. Retry health-checks the service, discards stale responses, and resumes pending decisions from the saved epoch.
- [ ] **Step 4: Verify and commit.** Run `npm test -- tests/save.test.ts tests/scheduler.test.ts` and `npm run e2e -- e2e/reconnect.spec.ts`. Commit `feat: preserve expeditions across decision outages`.

### Task 9: Finish the first playable loop and measure Jev scaling

**Files:** Create `e2e/first-playable.spec.ts`, `docs/playtest.md`, `docs/performance.md`, `docs/jev-measurements.md`; modify `src/main.ts`, `src/game/habitat.ts`, `src/ui/visor.ts`, and any targeted files revealed by playtesting.

**Interfaces:** The start screen enters the expedition. The player can observe, survive, journal, retrieve the component, repair the ship, and see an ending for the first slice. Logs report decisions per minute, p50/p95 Jev latency, tokens, and estimated cost without storing secrets.

- [ ] **Step 1: Add an end-to-end path.** `e2e/first-playable.spec.ts` covers entering the habitat, taking and dropping eggs, two different guardian reactions, recording a hypothesis, recovering the component, returning to ship, and completing the repair. Use a seeded test world and fake Jev service so the path is repeatable.
- [ ] **Step 2: Run a live Jev play session.** With a developer-provided `TYPESAFE_API_KEY`, record at least ten minutes at 20 and 40 creatures. Measure request rate, p50/p95 response time, token usage, and observed invalid/stale decisions. If access is unavailable, clearly mark live integration unverified and do not claim the game meets Jev scaling goals.
- [ ] **Step 3: Run a blind player test.** Give the player only in-game instructions. Record whether they can state the egg rule, identify an individual memory exception, and finish the repair; note where cues or journal language mislead them. Fix only issues that prevent the approved core loop.
- [ ] **Step 4: Complete verification and commit.** Run `npm test`, `npm run typecheck`, `npm run build`, and `npm run e2e`. Inspect screenshots at the three key locations, test the reconnect path, and document measured performance and remaining limits. Commit `feat: complete Alien Ecosystem first playable`.

## Execution order and expansion boundary

Complete Tasks 1–9 in order. Each task has a test or observable acceptance gate and its own commit. The first playable is complete only when the live Jev session, blind discovery test, browser build, and reconnect checks pass. Expansion to multiple habitats, hundreds of creatures, and the final launch window is a separate plan informed by the measured behavior and cost of this slice.
