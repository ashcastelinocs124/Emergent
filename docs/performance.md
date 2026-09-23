# First playable performance notes

Target: 60 fps on a recent desktop GPU with 40 creatures; 30 fps minimum during encounters.

## Habitat baseline (2026-09-23)

Chromium headless at 1440 × 900 on this development host, after 1.5 s warmup, 50 `requestAnimationFrame` samples. This is a software-rendered browser measurement, so it does not establish performance on a desktop GPU.

| Creatures | Median frame | p95 frame | Approximate median fps |
| --- | ---: | ---: | ---: |
| 20 | 63.0 ms | 69.4 ms | 15.9 |
| 40 | 69.2 ms | 85.6 ms | 14.5 |

The headless result is below target. Geometry sharing, instanced reeds, distance-based detail visibility, and a capped pixel ratio are in place. A hardware-GPU playtest and renderer draw-call inspection are still required before claiming the 30 fps floor or 60 fps target. The game simulation itself ran ten simulated minutes in a unit test with bounded decisions; the bottleneck in this measurement is rendering.

## Final software-rendered check after habitat pass

At the same 1440 × 900 headless viewport, a 50-frame sample after 1.5 s warmup measured 58.5 ms median / 62.8 ms p95 with 20 creatures and 59.5 ms median / 68.1 ms p95 with 40. Renderer draw calls at the ship fell to 65 and 107 after instancing boulders and fungi, reducing the shadow map, and hiding detailed creature parts beyond 42 units. These results remain below the 30 fps floor in software rendering and must not be read as GPU performance. A hardware playtest and a close-range encounter measurement are pending.

Visual QA screenshots: [ship](screenshots/ship.png), [nest in daylight](screenshots/nest-day.png), [repair site](screenshots/repair-site.png), and [nest at dusk](screenshots/nest-dusk.png). Captures use the seeded fake Jev service and debug camera; the player-facing build has the same scene and visor without debug text.
