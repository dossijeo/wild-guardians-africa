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
