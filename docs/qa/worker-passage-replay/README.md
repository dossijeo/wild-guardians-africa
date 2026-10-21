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

## Before the day-9 crossing: static yield space is available

`node tools/experiments/replay-worker-crossing.mjs --probe-yield` samples worker `7088` after three 0.1-second steps from the saved state, just before its destination-progress recovery. It tests 192 radial points at 0.5–4 m with the production worker terrain sweep and clearance against the five nearby worker bodies. At this instant, 146 points have clear incoming segments; 87 also have a clear segment back to the actor's current next waypoint. The nearest reported point is 0.5 m away at `(76.8522, -0.7541)`. This rules out a lack of *instantaneous* side space for this crossing. It does not certify a yield: the other workers move while the actor travels, and a one-time point insertion can rejoin too early or conflict with another actor. A candidate needs an explicit yielding state or a deterministic traffic reservation and must recheck moving-body clearance on every step. The probe changes neither the production route nor the saved game.

## Stateful side-yield experiment: rejected after a full campaign

Commit `9b30cd2ec` contains a reproducible prototype: at the mobile-recovery boundary, a worker chooses a nearby, statically clear side point, follows it with live-body checks, and waits until its next route segment is clear. Commit `6e4681f44` reverts the movement change. Neither commit changes the production WASM or balance. The prototype passed 26 directed actor-motion tests and removed the overlap in the frozen one-second day-9 crossing. It was then tested in the same continuous 14-night Sabana/Mapungubwe/712 campaign as the baseline. These are single deterministic campaign runs, **not** ABBA CPU measurements:

| Variant | State SHA-256 | Deliveries | Coins | Living crops | Recovery events | Sampled overlap pairs after time 30 | Maximum penetration |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline with read-only yield probe | `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05` | 1,317 | 899 | 145 | 164 | 43 | 0.476 m |
| Stateful side-yield | `43fe9af57e86ada4e176f86e54a4bb9111d59c5790be7273c068be111104d761` | 1,230 | 1,056 | 131 | 17 | 3 | 0.116 m |

The read-only baseline probe preserved the exact baseline hash and found a geometrically available side point at 134 of 141 worker recovery triggers. The prototype actually started 70 yields. It reduced phasing and body penetration markedly, but still allowed three overlap samples and lost 87 deliveries and 14 living crops. The higher final coin balance is part of a divergent campaign, not proof of better economics. Likewise, `Game.tick` accumulated 71.8 s in the baseline and 58.2 s in the prototype, but the campaigns have different states and workloads; these figures are not an isolated movement-speed result.

The prototype's rejoin rule only checks the next half-metre of the original route and does not coordinate right of way. A follow-up diagnostic on experimental branch `codex/worker-yield-duration-diagnostic` (`90201a3c4`) recorded every yield start, side-point arrival and end in the same 14-night campaign. It reproduced the exact prototype final-state hash. All 70 yields reached their side point and rejoined; median total duration was 0.5 simulated seconds, p90 1.3 s, maximum 4.7 s. Median wait *at* the side point was zero, p90 0.8 s, maximum 4.4 s. There were no unmatched starts. Thus indefinite waiting is **not** the explanation for the lost deliveries in this run. The first altered movements can cascade into different task assignments and economic decisions, but that causal chain has not yet been isolated. A future candidate needs a safe, coordinated passage decision that does not fall back to walking through another body, then must be compared at the first campaign divergence as well as at night 14. The current branch retains only the read-only radial probe; gameplay movement is back at the baseline.
