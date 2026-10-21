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

## Recovery-trigger attribution on the 14-night replay

The simulation now exposes an optional `nav.motionObserver` at the instant a mobile-collision recovery is authorized. It reports whether the worker was stationary for three seconds or had spent twelve seconds without reducing straight-line distance to the destination. The observer does not change the event payload, saved state or movement. The overlap probe attaches it only when `WG_WORKER_RECOVERY_DETAIL=1`:

```powershell
$env:WG_WORKER_RECOVERY_DETAIL='1'
$env:WG_WORKER_PROBE_OUTPUT='test-results/worker-recovery-detail-14.json'
node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe wild-engine
```

The frozen Sabana/Mapungubwe/712 replay retained the baseline state SHA-256 `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05`, 1,317 deliveries, 899 coins and 145 living crops. It emitted 164 recoveries: 141 for workers and 23 for animals. Among workers, 122 followed the twelve-second destination-progress condition and 19 followed three seconds of actual stationary time. All 43 overlap examples after time 30 can be linked to a recovery of one of the two workers within the preceding 3.2 simulated seconds. Forty link to the destination-progress trigger and three to stationary recovery. The attribution uses the probe's sampled examples; in this run the sample includes all 43 pairs. The legacy metric name `workOverlapPairs` means time > 30 and also includes nighttime; it is not restricted to paid working hours.

Two small prototypes were rejected on the same 14-night campaign:

| Variant | Deliveries | Coins | Living crops | Recoveries | Work-period overlap pairs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline | 1,317 | 899 | 145 | 164 | 43 |
| Disable mobile phasing only while returning | 1,317 | 899 | 145 | 88 | 118 |
| Check village arrival again after movement | 1,317 | 899 | 145 | 164 | 43 |

Disabling return phasing left a queue outside the village when an incursion began; 99 of its work-period overlaps were subsequently between fleeing workers. The post-movement arrival check had no observable effect, including the same full state hash. Both edits were removed. These results narrow the physical bug: simply delaying or disabling phase does not resolve shared passages. The next candidate must create a traversable, deterministic yield or alternate route and still clear returning workers before the raid boundary. It must also preserve the existing economic throughput; none of these measurements justifies relaxing body collision.

## Avoidance-before-recovery ordering: rejected

On `main` at `dc2680de9` (same production movement and WASM as the reference), a temporary two-line prototype called `prepareActorMotion()` for a worker before checking whether the twelve-second destination watchdog should start mobile phasing. The ordinary avoidance result was then reused for that tick instead of invoking it twice. This tested whether the fallback was being authorized against an occupied waypoint that local avoidance would immediately replace. No balance, speed, task or navigation rule changed.

The frozen day-9 one-second replay improved: worker `7088` had no recovery event, the pair ended 0.588 m apart and penetration was zero. All 26 directed actor-motion tests passed. The continuous 14-night Sabana/Mapungubwe/712 campaign, however, contradicted adoption:

| Variant | State SHA-256 | Deliveries | Coins | Living crops | Recovery events | Overlap pairs after time 30 | Maximum penetration |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Production reference | `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05` | 1,317 | 899 | 145 | 164 | 43 | 0.476 m |
| Avoidance first | `b5e3ba4e5163a268898db8d438d0198f19ad5198640f7f674c12856d34ef448c` | 1,274 | 808 | 80 | 80 | 54 | 0.560 m |

The candidate still entered simultaneous mobile phasing in later traffic, including a day-12 walking pair headed through the same waypoint; their sampled penetration reached 0.512 m. Thus the order change removed one false recovery but did not coordinate right of way or prevent physical crossing. Its lower `Game.tick` total (63.6 s versus the reference's 71.8 s) reflects a different campaign and cannot be claimed as an isolated speedup. The movement edit was discarded. Reproduce the campaign with `node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe wild-engine` after moving `prepareActorMotion()` before the recovery probe and reusing its return value for ordinary movement. A safe fix must coordinate passage without authorizing two actors to ignore each other's bodies.

## No-phasing yield: physical separation but a sustained traffic jam

An isolated follow-up applied the earlier stateful side-yield prototype and disabled mobile-body phasing for workers. Animal recovery stayed unchanged. The exact experimental production diff is preserved as [`yield-no-phase-rejected.patch`](yield-no-phase-rejected.patch); it applies cleanly to `dc2680de9`. The patch is **not** enabled in the game. The frozen day-9 crossing ended with 0.740 m separation and no recovery event; 26 directed actor-motion tests passed.

The nine-night Sabana/Mapungubwe/712 campaign had zero overlap pairs after time 30, 766 deliveries, 124 living crops and 984 coins. For comparison, production had 12 late overlaps, 780 deliveries, 123 crops and 1,047 coins. Early arrivals still overlapped within the first three seconds, so this was not a global no-overlap result. Extending the candidate toward 14 nights ended in an economic defeat on night 11: 766 deliveries, 76 living crops and 24 coins, with zero late overlaps. Repeating with unlimited worker yield attempts produced the same night-11 defeat and delivery count, so the former two-attempt cap does **not** explain the stoppage. These are deterministic single runs, not an ABBA timing comparison.

The [frozen day-10 state](sabana-712-day10-yield-congestion.json.gz) is from the unlimited-attempt run at time 151. Its compressed SHA-256 is `a060e3c522eed42120363ff182fc137ace11be9bb851c12cd84c37eabb3eef7d`; the uncompressed JSON SHA-256 is `85e18470a47736533ac2883a7300a3a305547849114264452fe425da5274cdbd`. It has 34 instantiated workers: 13 still fleeing toward village entry `(60, 0)` and 21 walking to ordinary tasks. The fleeing group occupies approximately x=72–77, z=5–7; several retain side-yield points while two have no path. Day 10 has 124 pending tasks and produces zero deliveries. At the night-11 defeat, all 18 remaining workers are fleeing and five retain a yield point. This establishes a sustained traffic blockage, without proving that every stalled actor has the same immediate cause.

Inspect the frozen actors and reconstruct fresh native routes with:

```powershell
node tools/experiments/inspect-worker-traffic.mjs docs/qa/worker-passage-replay/sabana-712-day10-yield-congestion.json.gz --native
```

This reports 21 workers exactly at their side-yield points, several for more than 300 simulated seconds, and a direct first-blocker cycle between `worker-6992` and `worker-6996`. The two pathless fleeing workers, `worker-6978` and `worker-6983`, remain roughly 14 m from home beside intact thorn-wall `structure-2405`. A newly reconstructed Wild Engine session returns `unknown` with cause `start-connector` for both: their exact positions are not worker-standable and have no native start region. A nearby fleeing worker with an existing path returns `found` from the same reconstructed session, so this is not a general failure to initialize the graph. The snapshot does not establish *when* the two positions became invalid or prove that the wall caused the invalidity. It does show that raising the yield-attempt cap or repeating a route query from the same invalid coordinates cannot clear this queue. The diagnostic does not advance the saved game, so it is not a save/load equivalence test.

Reproduce the capped candidate by applying the patch in a disposable branch and running `node tools/experiments/replay-worker-crossing.mjs`, `node --test tests/actor-motion.test.js`, then `node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe wild-engine`. For the unlimited-attempt variant used to capture day 10, also change the worker recovery condition to `worker||(w.mobileRecoveryAttempts??0)<2`. Set `WG_WORKER_CAPTURE_DAY=10`, `WG_WORKER_CAPTURE_TIME=150`, and `WG_WORKER_CAPTURE_OUTPUT` to capture the dense state. The next design must coordinate passage and free the homebound queue *without* restoring body phasing; simply waiting at a valid shoulder does not guarantee that the path to the village becomes usable.
