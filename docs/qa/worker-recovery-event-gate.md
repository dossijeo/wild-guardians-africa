# Mobile worker recovery: event-gate experiment (20 October 2026)

The current `walkTo()` fallback can ignore mobile bodies for three simulated seconds after either three seconds of stationary blockage or twelve seconds without getting closer to the final destination. The second trigger also fires while a worker is following a valid detour that temporarily moves away from its destination. In the nine-night Wild Engine probe, 18 of 24 worker recovery events occurred with `dynamicStallSeconds < 3`; at day 9, time 115, worker `worker-7088` moved roughly one metre during the tick that started its phase and then overlapped `worker-7072` by 0.331 m. Of 12 work-period overlap pairs in that nine-night run, 11 involved a phased worker.

Four small alternatives were tested against `main` `1c08716cc` on Sabana/Mapungubwe/712, 14 nights, `good` strategy, Wild Engine navigation and native intentions. They changed only mobile-collision recovery in `src/simulation/game.js`. The production `spatial-savanna.wasm` SHA-256 was `0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d` throughout.

| Variant | Recovery change | Money | Living crops | Deliveries | Recovery events | Overlap ticks after 3 s | Work-period overlap pairs | `Game.tick` sum |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | Existing stationary **or** no-progress trigger | 899 | 145 | 1,317 | 164 | 48 | 43 | 64.51 s |
| Stall only | For workers, require `dynamicStallSeconds >= 3`; keep animal trigger | 773 | 133 | 1,257 | 40 | 17 | 9 | 82.35 s |
| Pre-phase reroute | On a moving worker's no-progress trigger, call `prepareActorMotion()` before phasing; skip that phase only if it replaces the path | 852 | 110 | 1,256 | 61 | 33 | 42 | 71.45 s |
| Release phase early | Restore worker body clearance as soon as the current position and next movement step are clear | 780 | 115 | 1,272 | 124 | 8 | 6 | 82.16 s |
| Targeted phase | Ignore only the body that blocked the worker's next step; keep other bodies solid | 883 | 102 | 1,244 | 162 | 42 | 46 | 103.79 s |

All five runs completed 14 nights without a game result. The first two variants passed 52 directed actor-motion, worker-routing and raid-retreat tests; early release and targeted phase each passed 42 directed actor-motion, canyon-traffic and native-raid tests. None is suitable for integration: the stall-only rule loses 60 deliveries and 126 coins, the extra reroute loses 61 deliveries and leaves almost the same work-period body overlap count, early release reduces late overlaps by 40 but loses 119 coins and 30 living crops, and targeted phase loses 73 deliveries and 43 living crops while barely reducing late overlaps. The CPU figures are single runs on a shared host with different trajectories and entity counts; they do not establish an algorithmic speedup or slowdown. Targeted phase was run twice; both runs returned 883 coins, 102 living crops and 1,244 deliveries. The second run's complete [diagnostic JSON](worker-recovery-targeted-phase.json) records the remaining metrics and overlap samples.

Reproduce the baseline on that commit with:

```sh
node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe wild-engine
node tools/experiments/probe-worker-recovery-context.mjs 9 712 wild-engine
```

The exact experimental diffs are [stall only](worker-recovery-stall-only.patch), [pre-phase reroute](worker-recovery-prephase-reroute.patch), [early phase release](worker-recovery-phase-release.patch), and [targeted phase](worker-recovery-targeted-phase.patch). `git apply --check` succeeds for each against `1c08716cc`; apply only one at a time in an isolated checkout, run the probe, then discard that patch before trying the next. None remains in production code. A future solution needs physical traffic management at the actual blocker, including a safe passing/yield point or a queued passage, while retaining task throughput. It must also treat the overlapping workers initially emitted at the village entrance separately from work-period traffic. It should be checked against worker-worker and worker-animal blocks, saved routes, and complete campaign outcomes; reducing overlap counts alone is insufficient.

The issue was [reproduced again on current `main`](worker-recovery-main-2026-10-20.md) with native intentions, a retained final-state hash and separate work-period penetration metrics.
