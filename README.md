# Alien Ecosystem — New Eden

A first-person browser mystery set in an Earth-like city on an unknown planet. Your ship has crashed in New Eden's south district. Talk with four residents, compare what they tell you in a helmet journal, make your own assumptions, find a power cell, thermal shield, and navigation relay, then repair and launch the ship.

Named residents use TypeSafe Jev to choose their next activity and to select an authored answer to your typed question. The optional ship computer uses Jev to choose a lead from evidence you actually collected. The model does not invent dialogue or decide where you walk, what you take, or when you leave. Resident memory and your journal survive reloads under a city-specific save key.

## Run locally

```sh
npm install
cp .env.example .env
# Set TYPESAFE_API_KEY in .env
npm run dev
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The API key stays on the server. If Jev is unavailable, you can still explore and read saved notes; the visor shows a retry control. For deterministic development, run `npm run dev:server:test` and `npm run dev:client` in separate terminals. The UI labels that mode `TEST SIMULATION`.

Use WASD to move, the mouse to look, E to talk/use/take, J for the journal, and Esc to release the cursor. In a conversation, type a question or select a suggested topic. Ask Mara about the ship to get oriented, then compare accounts before choosing where to search. The workshop cabinet and depot cage have physical switches; the salvage yard is open. Bring each part to the ship console, press E to install it, and launch once all three are fitted.

`npm test`, `npm run typecheck`, `npm run build`, and `npm run e2e` run the checks. Browser tests use a labelled fake Jev service and a debug camera to navigate; `?debug=1` is only for development. The old wilderness source remains in the repository but is no longer the launched game. Its save key remains separate.

The [city design](docs/superpowers/specs/2026-09-23-earth-city-repair-design.md), [playtest notes](docs/playtest.md), [performance notes](docs/performance.md), and [Jev measurements](docs/jev-measurements.md) describe the implemented slice and remaining validation. The city is a compact district with procedural buildings and stylized human figures, not a full photorealistic metropolis. A blind first-time player test and hardware GPU benchmark are still pending.
