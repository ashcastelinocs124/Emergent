# Jev decision measurements

Live Jev was measured on 2026-09-23 with a developer-provided key kept in ignored `.env`. The browser shows `TEST SIMULATION` only when the deterministic fake service is used.

## Ten-minute live browser sessions

Each run used an isolated headless Chromium page at the ship, with the actual TypeSafe Jev service selecting every creature's high-level action. The 40-creature run was repeated after a late service-error burst. Latency percentiles cover returned replies; estimated cost uses their reported input tokens and excludes requests that timed out without usage data. Browser software rendering made the 40-creature simulation take about 11–12 wall-clock minutes.

| Creatures | Simulated time | Replies / accepted | Stale | Service errors | p50 / p95 | Input tokens | Est. cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 601 s | 939 / 938 | 1 | 0 | 204 / 315 ms | 2,098,085 | $0.088 |
| 40, first | 604 s | 1,854 / 1,846 | 8 | 51 | 218 / 358 ms | 6,192,835 | $0.260 |
| 40, repeat | 619 s | 1,925 / 1,917 | 8 | 8 | 249 / 404 ms | 6,460,156 | $0.271 |

The 40-creature runs sustained about 184–187 returned decisions per simulated minute, compared with about 94 at 20 creatures. In the first 40-creature run, service errors appeared in a burst near the end and only 10 creatures had an active intent at the final sample. The repeat recovered to 39 active intents out of 40; safe server diagnostics identified one upstream HTTP 503 and seven SDK request timeouts. The first run's error types were not logged. The game did not silently choose local actions during these failures. Longer live sessions and real hardware rendering remain necessary before claiming robust scaling beyond 40 creatures.

After these measurements, the SDK client was reused across requests and the aligned SDK/server/browser/scheduler timeouts were increased to 4.5/5/5.5/6 seconds. A live request, unit tests, build, and fake-service browser suite passed after that change; its effect on ten-minute timeout frequency has not been measured.

A separate live egg encounter confirmed guardian `DEFEND` while the egg was held and remembered `FOLLOW` after it was dropped, with no service errors in that encounter.

## Decision demand in the seeded habitat

The pure world simulation ran 600 fixed-step seconds with the fake intent selector and all creatures active. This measures how often the game asks for decisions, not TypeSafe API performance.

| Creatures | Decisions in 10 simulated minutes | Mean decisions/minute |
| --- | ---: | ---: |
| 20 | 986 | 98.6 |
| 40 | 2,164 | 216.4 |

Jev responses include elapsed time and input/output token counts. The debug overlay and minute console logs report all returned replies, accepted actions, p50/p95 latency, token totals, stale/rejected results, service errors, and estimated session cost. Returned replies count toward tokens and cost even when the current world rejects their action. Timeouts without usage data cannot be included in the estimate. The estimate uses the [TypeSafe September 2026 published Jev rate](https://typesafe.ai/blog/introducing-system-one-models-and-jev) of **$0.042 per million input tokens** and free output tokens. These estimates are based on reported usage, not a measured bill.
