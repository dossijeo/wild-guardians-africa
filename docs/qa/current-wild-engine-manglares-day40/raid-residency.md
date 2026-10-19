# Manglares raid: separate simulation from sector residency

The frozen native raid fixture is
[`manglares14-wall-occupied-diagnostic-occupied-fallback-state.json.gz`](../wild-engine-intent-lifecycle/manglares14-wall-occupied-diagnostic-occupied-fallback-state.json.gz)
(compressed SHA-256 `b15b4d45c971de73e496f36da687131aa0a8c7e1fa36170bcc6351e544192de0`).
It loads with the current production WASM (SHA-256
`09616da85bf59c50c0cde7b743a4bdccb2eac06ec4eb0b79f79c44ef71d9caa9`).
The state starts on day 11 at time 513 with 16 raid animals, 21 workers,
1,200 crop records (118 alive), and 1,071 crate records.

`profile-frozen-native-tick.mjs` formerly labelled a loop around both
`Game.tick` and `serviceRaidConnectivityDemand()` as a tick duration. The
latter synchronously adds a requested sector in this diagnostic harness. The
script now reports `gameTickMs`, `residencyMs`, and `residencyLoads` separately;
`ms` remains the inclusive wall time for compatibility. Run A/B/B/A as
separate processes, with A intact and B adding `--prune-history`:

```sh
node tools/experiments/profile-frozen-native-tick.mjs docs/qa/wild-engine-intent-lifecycle/manglares14-wall-occupied-diagnostic-occupied-fallback-state.json.gz 20 --dt 0.1 --campaign-residency
```

| Arm | Inclusive wall | Game.tick | Residency service | Loaded sectors |
| --- | ---: | ---: | ---: | ---: |
| A1 | 1386.2 ms | 363.7 ms | 1021.6 ms | 16 |
| B1 | 1413.4 ms | 360.4 ms | 1052.4 ms | 16 |
| B2 | 1387.8 ms | 355.8 ms | 1031.3 ms | 16 |
| A2 | 1416.2 ms | 378.9 ms | 1036.4 ms | 16 |

All four arms produced the same active-state hash
`263fd4090f340ddbc64a2b11fdda4aa9924e1caa42e60213e5d6fb3cdada2846`.
The 16 loads account for roughly three quarters of this harness's inclusive
duration. The pruning comparison does not establish that historical crop or
crate records are a cause of slower ticks in this raid replay. It also does
not establish that residency is cheap in the game: this synchronous service
still costs time, but should be attributed to presentation/streaming rather
than `Game.tick` itself.

For an optional intrusive call breakdown, add `--count-spatial`. One replay
recorded 17 native animal plans, 10 attack-crop selections (~147 ms including
their nested work), 2,913 `walkable` calls, 1,090 `segmentClear` calls, and
1,107 `regionFor` calls in the 20-second window. These counters include
nested calls, so their times cannot be summed into a CPU total. Use the
uninstrumented A/B/B/A figures for primary timing. The raid fixture represents
an active raid, not a full campaign or a browser frame; no renderer or GPU
work is present.

The campaign runner calls `serviceRaidConnectivityDemand()` in
`native-campaign-entry-driver.mjs::advancePresentation()`, separate from its
tick call. The next useful profile should follow the complete campaign's
streaming and presentation phases around an observed late-campaign spike,
rather than optimize navigation based on the former inclusive `ms` alone.
