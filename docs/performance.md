# First playable performance notes

Target: 60 fps on a recent desktop GPU with 40 creatures; 30 fps minimum during encounters.

## Habitat baseline (2026-09-23)

Chromium headless at 1440 × 900 on this development host, after 1.5 s warmup, 50 `requestAnimationFrame` samples. This is a software-rendered browser measurement, so it does not establish performance on a desktop GPU.

| Creatures | Median frame | p95 frame | Approximate median fps |
| --- | ---: | ---: | ---: |
| 20 | 63.0 ms | 69.4 ms | 15.9 |
| 40 | 69.2 ms | 85.6 ms | 14.5 |

The headless result is below target. Geometry sharing, instanced reeds, distance-based detail visibility, and a capped pixel ratio are in place. A hardware-GPU playtest and renderer draw-call inspection are still required before claiming the 30 fps floor or 60 fps target. The game simulation itself ran ten simulated minutes in a unit test with bounded decisions; the bottleneck in this measurement is rendering.
