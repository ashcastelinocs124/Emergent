# Alien Ecosystem — first playable

A first-person browser survival mystery on a designed alien planet. Observe three species, test a field-journal theory about guardian behavior, retrieve the drive regulator, repair your ship, and escape. Thirty creatures make every high-level action choice through the Jev decision service; movement and collision execute those choices locally.

## Run

```sh
npm install
cp .env.example .env
# Put your TypeSafe API key in .env
npm run dev
```

Open the Vite address shown in the terminal. A live expedition requires `TYPESAFE_API_KEY`. The game reports a lost decision link if credentials or the service are unavailable; it never silently substitutes local creature choices.

For a deterministic, visibly labelled development simulation, run `npm run dev:server:test` and `npm run dev:client` in separate terminals. `npm run e2e` starts its own fake service and browser. `npm test`, `npm run typecheck`, and `npm run build` provide the other checks.

## Controls

WASD move; mouse look; Shift crouch; E interact; R drop held item; F eat a held egg or spore; Q toggle scanner; J open the field journal; Esc release the cursor. At the ship, the journal pauses time. In the field, creatures keep moving while it is open.

The helmet visor shows air, power, health, a drive/ship signal bearing, inventory, and prompts. The drive regulator is pinned under the guardian clutch; moving an egg exposes it. Air and power refill near the ship. If the suit fails, emergency recovery returns the explorer to shelter and leaves carried items at the failure site.

## Scope and current limits

This is one habitat, one repair objective, three species, and 20–40 creatures (30 by default). The [design](docs/superpowers/specs/2026-09-23-alien-ecosystem-design.md), [playtest notes](docs/playtest.md), [performance notes](docs/performance.md), and [Jev measurements](docs/jev-measurements.md) document what is implemented and what still needs live or human validation. Live Jev scaling and a blind discovery test have not been run in this workspace.
