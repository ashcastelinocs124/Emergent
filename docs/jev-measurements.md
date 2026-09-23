# Jev decision measurements

The current environment has no `TYPESAFE_API_KEY`. The live Jev session, its p50/p95 latency, actual token use, and invalid/stale response rate remain **unverified**. The browser shows `TEST SIMULATION` whenever the deterministic fake service is used.

## Decision demand in the seeded habitat

The pure world simulation ran 600 fixed-step seconds with the fake intent selector and all creatures active. This measures how often the game asks for decisions, not TypeSafe API performance.

| Creatures | Decisions in 10 simulated minutes | Mean decisions/minute |
| --- | ---: | ---: |
| 20 | 986 | 98.6 |
| 40 | 2,164 | 216.4 |

Jev responses include elapsed time and input/output token counts. The debug overlay and minute console logs report decisions/minute, p50/p95 latency, token totals, stale/rejected results, service errors, and estimated session cost. The estimate uses the [TypeSafe September 2026 published Jev rate](https://typesafe.ai/blog/introducing-system-one-models-and-jev) of **$0.042 per million input tokens** and free output tokens. At an illustrative 1,000 input tokens per call, ten minutes would cost approximately $0.041 at 20 creatures and $0.091 at 40. This is a scenario calculation, not a measured bill or token count.

## Live acceptance still required

With a developer-provided API key, run `npm run dev`, visit `?debug=1&creatures=20` and `?debug=1&creatures=40`, and observe each for ten minutes. Record p50/p95 latency, input tokens per call, total estimated cost, service errors, and stale/rejected decisions. Check that creature action deadlines remain responsive during egg pickup and drop. The first playable's live Jev scaling goal cannot be claimed before this session.
