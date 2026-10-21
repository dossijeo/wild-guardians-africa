# Reproducible worker passage at a recovery boundary

The saved Sabana/Mapungubwe/712 state is from day 4, time 75, immediately before a worker/mobile-body recovery. It was captured at an ordinary campaign tick boundary with the production Wild Engine WASM SHA-256 `0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d`. The [state](sabana-712-day4-before.json) has SHA-256 `cf76f7161b270981397c1e9ef069e033978dc595cb88fa08d8b78715ac1ff7cc`.

Rebuilding the native session from this save and advancing one simulated second produces `ActorMobileCollisionRecovery` for `worker-1755` at elapsed time `1875.699999999157`, position `(92.12030760842035, 0.18023842346321228)`. The same actor, instant and position occur in the uninterrupted campaign. Two fresh replays yield identical serialized-state SHA-256 `f52b1e4ab604e7ca2585873659bc1a995b469eb2c341e0d9c7e6fd3ed8b339c1`.

At the event, `worker-1762` blocks the next half-metre. The actor is walking toward task `native-point-task-1857`; the blocking worker is also walking, on a crossing route. The recovery then temporarily ignores mobile-body clearance. This fixture is a short, deterministic target for a physically safe passing or yielding solution, not an assertion that the recovery is correct.

```powershell
node tools/experiments/profile-spatial-campaign-snapshot.mjs docs/qa/worker-passage-replay/sabana-712-day4-before.json 1 test-results/worker-passage-replay.json
```

To regenerate the frozen state from the native campaign:

```powershell
$env:WG_WORKER_CAPTURE_DAY='4'
$env:WG_WORKER_CAPTURE_TIME='74.5'
$env:WG_WORKER_CAPTURE_OUTPUT='test-results/worker-passage-day4-before.json'
node tools/experiments/probe-worker-overlaps.mjs 4 712 good sabana mapungubwe wild-engine
```

The profile script advances simulation without replaying the virtual player's commands between campaign ticks. Its **whole-state** hash after the tick therefore differs from the uninterrupted campaign (which also plants and casts a spell during that interval); the collision event itself matches. Compare candidate collision fixes on this fixture first, then on full 9- and 14-night campaigns with the same economic policy. No production movement or balance code changes here.

The restored native session also starts at navigation revision 2 whereas the saved worker's `mobileRecoveryVersion` is 8. That correctly forces a route reconciliation on load, but it means a candidate that *only* resets stall time on a revision change can suppress the event in this one-tick replay and still have no effect in a continuous campaign. This was checked: the revision-reset candidate removed the fixture event, yet the nine-night run retained the exact baseline final-state hash and all 24 recovery events. Do not treat an isolated replay improvement as a campaign fix.

## Day 9 crossing and rejected recovery changes

The [compressed day 9 state](sabana-712-day9-crossing.json.gz) was captured on the same Sabana/Mapungubwe/712 campaign at day 9, time 114, before workers `worker-7072` and `worker-7088` crossed. Its uncompressed SHA-256 is `116c97224a6a40010c2754cd211f09e35df68a5ebf724dec1247783496a377f7`; the compressed fixture is `f75534e509332500ce14848b2f14650259f8cafd7ab4441ccc305d11159d9410`. The production WASM is `0d2901425c9d16fa38cdafc916680d3086c1b18f6730a0bfc584f6b1315d817d`. Run:

```powershell
node tools/experiments/replay-worker-crossing.mjs
```

The replay explicitly maps saved transient path revisions to the fresh session so it retains the *continuous campaign's routes*. It is a collision diagnostic, **not** a save/load equivalence test. One simulated second reproduces the continuous positions exactly. At elapsed time 4914.4, `worker-7088` enters a three-second mobile-collision recovery; at time 115 the workers are 0.229 m apart (0.331 m penetration). The actor was moving along a detour, but had not reduced straight-line distance to its distant destination by the required 0.75 m in 12 seconds. Ordinary local avoidance runs after the recovery decision on that tick.

Three isolated changes eliminated this crossing, but none met the campaign acceptance bar. All runs used the same seed, strategy, native intentions and WASM, starting from source revision `8d90fc899`. Figures are single deterministic runs, not ABBA performance estimates:

| Variant | Nights | Deliveries | Coins | Living crops | Recoveries | Work-period overlap pairs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 9 | 780 | 1047 | 123 | 24 | 12 |
| Phase only after 3 s stationary | 9 | 781 | 1028 | 126 | 6 | 2 |
| Baseline | 14 | 1317 | 899 | 145 | 164 | 43 |
| Phase only after 3 s stationary | 14 | 1261 | 827 | 120 | 26 | 6 |
| Local avoidance before every recovery check | 14 | 1229 | 867 | 95 | 68 | 4 |
| Local avoidance early only when recovery is due | 14 | 1264 | 830 | 104 | 53 | 14 |

The lower collision counts do not compensate for lost deliveries and crops. The simulated economy and virtual player react to altered movement, so differing state hashes are expected and these rows are not pure CPU comparisons. All three movement edits were discarded; no production rule changed. A future fix must distinguish useful detour progress from a genuine cyclic stall while preserving the timed escape from crowded passages, then pass both this crossing and prolonged campaign comparisons.

## Route-remaining progress experiment on current main

On `01f245331`, `node tools/experiments/replay-worker-crossing.mjs --trace-progress` exposes the next ten 0.1-second steps of both saved workers. The ordinary recovery starts at elapsed 4914.4. At that point `worker-7088` has moved from `(76.074, -1.000)` to `(76.390, -0.945)` and its remaining polyline drops from 33.45 m at the first sampled step to 33.25 m. The one-second replay ends with 0.331 m body penetration. The trace shows actual movement along a detour while the old twelve-second timer still refers to straight-line destination progress; it does not prove that all prolonged movement is productive.

A temporary candidate also tracked the remaining length of a worker's current waypoint polyline. At the twelve-second recovery boundary it treated a 0.75 m reduction as progress and postponed collision phasing. It was tested on the saved crossing and on fresh, continuous native-intent campaigns with the same Sabana/Mapungubwe/712 policy and production WASM. It passed the 30 directed movement/retry tests and removed the saved crossing. The [run hashes and metrics](route-remaining-ab.json) record the comparison. The continuous results ruled it out:

| Variant | Nights | Deliveries | Coins | Living crops | Recoveries | Work-period overlap pairs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Current main | 9 | 780 | 1047 | 123 | 24 | 12 |
| Route-remaining candidate | 9 | 781 | 1028 | 126 | 9 | 2 |
| Current main | 14 | 1317 | 899 | 145 | 164 | 43 |
| Route-remaining candidate | 14 | 1257 | 773 | 133 | 40 | 9 |

The candidate reduces collisions but loses 60 deliveries, 126 coins and 12 living crops at night 14. Its game-tick time also changes with the entire divergent campaign, so it cannot be attributed to the extra route-length calculation alone. It is **not adopted**. The shipped movement code and rules remain unchanged. A safe fix needs a local decision that distinguishes a useful detour from cyclic congestion *without* simply delaying most recovery episodes; it must preserve campaign throughput as well as body separation.

## Experimental worker-body clearance

On `2e9e9b71a`, the day-9 replay still shows the immediate cause: a recovery window lets a worker ignore another worker's body while following a retained route. The experimental `codex/worker-recovery-slow-window` branch changes only that clearance rule. Animals retain their existing recovery behavior; a worker continues to use local body avoidance during its recovery window. `tests/worker-mobile-crossing.test.js` checks the frozen crossing, which has 0.331 m penetration on main and no penetration with the experiment. The 31 directed movement/retry tests pass.

The same native-intent Sabana/Mapungubwe/712 campaign, same production WASM and policy, was run to 14 and 30 nights with the current main behavior and the experimental rule. These are deterministic single runs, not ABBA CPU estimates. The game states diverge after movement changes, so the cumulative `Game.tick` times do not isolate per-tick algorithm cost.

| Variant | Nights | Deliveries | Coins | Living crops | Recoveries | Work-period overlap pairs | `Game.tick` total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Main | 14 | 1317 | 899 | 145 | 164 | 43 | 71.2 s |
| Worker-body clearance | 14 | 1290 | 1011 | 129 | 143 | 0 | 62.2 s |
| Main | 30 | 2776 | 736 | 123 | 927 | 225 | 205.7 s |
| Worker-body clearance | 30 | 2547 | 715 | 115 | 756 | 4 | 185.6 s |

The remaining four work-period overlap samples in the 30-night experiment all belong to one pair of fleeing workers on day 25. They are near the village, have no route, and penetrate by at most 0.038 m; none is in a recovery window. The larger 0.56 m maximum across each full campaign occurs in the initial worker spawn cluster at time 0–3 s, before ordinary work movement.

A separate slow-movement gate cut recovery events to 38 at night 14 and 275 at night 30, with the *same* deliveries, coins, living crops and work-period overlap counts as the smaller change. It added another per-worker timer and was therefore discarded for now. The smaller rule is kept **experimental**: it greatly improves physical separation but reduces 30-night deliveries by 229 (8.2%) and living crops by eight. It should not be merged before the traffic bottleneck is understood and further seeds/biomes are checked.

Reproduce the directed case and campaign probe:

```powershell
node --test tests/worker-mobile-crossing.test.js tests/actor-motion.test.js tests/route-event-retry.test.js tests/spatial-canyon-traffic-recovery.test.js tests/retreat-recovery-frozen-sabana.test.js
node tools/experiments/replay-worker-crossing.mjs
$env:WG_WORKER_PROBE_OUTPUT='test-results/worker-body-clearance-30.json'
node tools/experiments/probe-worker-overlaps.mjs 30 712 good sabana mapungubwe wild-engine
```

## Day 10 shared-passage deadlock

The body-clearance experiment above is not ready for integration. A continuous native-intent campaign produced a second frozen state at day 10, time 26: [compressed state](sabana-712-day10-traffic.json.gz), SHA-256 `6feb538e9cad995831ffab29c122d0cf129b8ee0a2b0a6a58e86c1deca61b606` (uncompressed state `dd09baee257bd81865f0b38db9e75dc27895b90926abb4ef933742023e4ba0c1`). Workers `worker-8276`, `worker-8277` and `worker-8278` have different tasks but share the same narrow route connector near `(71, 6)`. They block one another without touching. Their paths remain valid, yet all three move **zero metres** in a ten-second replay:

```powershell
node tools/experiments/replay-worker-jam.mjs docs/qa/worker-passage-replay/sabana-712-day10-traffic.json.gz 10
```

The campaign probe now records active time, stationary time and the longest uninterrupted wait for workers with a route. In the 14-night Sabana/712 comparison, main spent 311 worker-seconds stationary out of 45,015 active worker-seconds, with a longest wait of 22 seconds. The body-clearance branch spent 1,095 out of 44,151 and had a 262-second wait. These sums count simultaneous workers separately and are diagnostic, not `Game.tick` CPU times. This explains why removing collision phasing alone loses throughput: ordinary local avoidance can deadlock when several workers follow the same direction through a narrow connector.

An experimental yield extension gave a blocked worker a statically and dynamically validated lateral point, kept its confirmed route afterward and let the three frozen workers clear the passage without overlap. All 32 directed movement tests passed. It was **rejected** after continuous campaign checks:

| Yield prototype | Deliveries, night 14 | Coins | Living crops | Stationary worker-seconds | Longest wait | Work-period overlaps |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Body clearance only | 1290 | 1011 | 129 | 1095 | 262 s | 0 |
| Early yield, including prior animal-yield change | 1227 | 1023 | 101 | 140 | 6 s | 0 |
| Early yield, animals unchanged | 1189 | 708 | 117 | 161 | 6 s | 0 |
| Yield after 3 s, animals unchanged | 1171 | 1022 | 49 | 4154 | 458 s | 0 |
| Yield after 3 s only for work traffic | 1210 | 729 | 122 | 1001 | 127 s | 1 |
| Yield only for two mutually stalled workers | 1286 | 926 | 108 | 2303 | 82 s | 0 |

The late-yield prototypes indirectly caused long waits for fleeing workers, including one that remained en route for hundreds of seconds. Requiring *both* workers to be stationary for three seconds and to block each other's immediate segment still cleared the frozen passage, but increased aggregate stationary time and lost 21 living crops against body clearance alone. The targeted replay therefore does not establish campaign safety. All yield changes to `actor-motion.js` and their positive-only test were removed. A future solution must coordinate passage order without broad route churn, preserve workers' home return, and pass prolonged campaign comparisons as well as the two frozen states. The body-clearance branch remains experimental and must not be merged on the strength of the day-9 crossing alone.

One more isolated experiment assigned an opposing worker the yield point that `yieldToOpposing()` already computes but currently does not append to that worker's route. A directed test passed, yet the same 14-night native-intent Sabana/712 probe ended in defeat on night 9 with 542 deliveries, 0 coins and 71 living crops. It accumulated 4,719 stationary worker-seconds and a 286-second longest wait, versus 1,095 and 262 seconds for the body-clearance branch. One work-period overlap also reappeared. Directly editing another actor's route during the current actor's motion preparation therefore cannot be accepted as a safe one-line correction; it can repeatedly prepend a yield and interact with the other actor's own planning order. This variant and its test were reverted. The campaign result is a functional rejection, not an isolated timing estimate.
