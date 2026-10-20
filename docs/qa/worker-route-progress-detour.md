# Worker recovery: route progress is not enough (20 October 2026)

The current mobile-collision fallback can phase a worker after twelve seconds without getting closer to the **final** destination, even while that worker advances along a valid detour. This experiment replaced that clock with progress toward the current waypoint (at least 0.75 m or a new waypoint). The stationary three-second trigger and all static collision checks remained unchanged. The exact source and directed test are retained in [the patch](worker-route-progress-detour.patch); no candidate code was left active.

Both variants used Sabana/Mapungubwe/712, the `good` policy, Wild Engine navigation/native intentions, the production WASM SHA-256 `0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d`, and the same probe. The baseline ran from `b8706672d`, whose simulation and probe files are byte-identical to `main` `59fdb9459`; the candidate applied only this patch to that main commit. The 9-night baseline is already retained in [the current-main report](worker-recovery-main-2026-10-20.md). The 14-night baseline and both candidate traces are linked below.

| Horizon | Variant | Deliveries | Coins | Living crops | Recovery events | Work-period overlapping pair-ticks | Deepest work overlap |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 9 | [Main](worker-recovery-main-2026-10-20.json) | 780 | 1,047 | 123 | 24 | 12 | 0.331 m |
| 9 | [Waypoint progress](worker-route-progress-detour-9.json) | 781 | 1,028 | 126 | 9 | 2 | 0.026 m |
| 14 | [Main](worker-route-progress-baseline-14.json) | 1,317 | 899 | 145 | 164 | 43 | 0.476 m |
| 14 | [Waypoint progress](worker-route-progress-detour-14.json) | 1,257 | 773 | 133 | 40 | 9 | 0.476 m |

The 26 directed actor-motion tests passed with the patch, including the new detour case. The short run looked promising, but by night 14 it had lost 60 deliveries, 126 coins and 12 living crops. Its final-state hash differs from main, as expected for a movement change. It still had nine work-period overlap pair-ticks and the same worst work penetration. Its 14-night economic result and recovery count match the earlier stall-only variant. The single-run `Game.tick` times in the JSONs are not comparable speed evidence because the trajectories and host load differ.

**Decision:** do not integrate waypoint-progress gating alone. It corrects the false trigger but removes recovery that currently sustains production in constrained traffic. The remaining problem is physical passage: workers need a safe yield or queued passage around an actual blocker, followed by a route that preserves task throughput. Until that exists and passes sustained differential campaigns, retaining the imperfect current fallback is less damaging than silently losing production. The initial shared village-entry overlap is a separate spawn issue. Neither is presented as solved by this experiment.

Reproduce the candidate from a clean `59fdb9459` checkout by applying the retained patch, running `node --test tests/actor-motion.test.js`, then running `node tools/experiments/probe-worker-overlaps.mjs 9 712 good sabana mapungubwe wild-engine` and the equivalent 14-night command. The probe output can be written with `WG_WORKER_PROBE_OUTPUT`.
