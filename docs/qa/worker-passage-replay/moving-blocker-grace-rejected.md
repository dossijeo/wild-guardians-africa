# One-second moving-blocker grace: rejected

Baseline: `c9eee6071` (`main` after #208). This isolated candidate retains ordinary mobile-body clearance for one additional second when a worker is still moving after 12 seconds without straight-line destination progress and a moving actor occupies the next half-metre. Ordinary local avoidance continues during that second; if the obstruction remains, the existing bounded recovery can still run. The [patch](moving-blocker-grace-rejected.patch) is **not active** in production.

The frozen day-9 crossing replay (`node tools/experiments/replay-worker-crossing.mjs --steps=100 --summary`) resolves without recovery or sampled penetration. The workers' minimum sampled centre distance is 0.564 m versus their 0.56 m combined radius. The 34 directed actor-motion, route-clearance and event-retry tests pass. This local result does not establish a safe or useful campaign change.

Fresh continuous Sabana/Mapungubwe/712 runs, 14 nights, `good` virtual-player policy, Wild Engine and the same WASM:

| Variant | Whole-state SHA-256 | Deliveries | Coins | Living crops | Mobile recoveries | Late overlap pair-ticks |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Restored `main` | `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05` | 1,317 | 899 | 145 | 164 | 43 |
| One-second grace | `407898aaa259a810587c333ff79f9521b31007f2881beb05af3b84ae5a949290` | 1,227 | 882 | 122 | 154 | 47 |

The candidate loses 90 deliveries and 23 living crops while increasing late overlaps. Both runs completed 14 nights without a terminal result. These are single deterministic campaigns, not a CPU ABBA benchmark; their state divergence prevents attributing tick-time differences solely to the candidate. The candidate fails the functional acceptance bar and was removed. The baseline run after removal reproduces the established whole-state hash.

Reproduce with `WG_WORKER_RECOVERY_DETAIL=1` and `node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe wild-engine`; set `WG_WORKER_PROBE_OUTPUT` to retain the detailed JSON report. `git apply --check moving-blocker-grace-rejected.patch` validates the archived patch against the baseline, but applying it is only for an isolated experiment.

The result narrows the next design: a fixed delay based on a moving blocker still changes traffic timing broadly and does not coordinate safe passage. A viable solution needs an actual swept-clear bypass or yield-and-rejoin transaction that considers all nearby bodies, and must preserve campaign throughput.
