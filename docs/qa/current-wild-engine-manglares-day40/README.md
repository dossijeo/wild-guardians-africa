# Manglares day-40 frozen Wild Engine tick profile

This is a current-engine diagnostic state, not a balance proposal. It was
produced from `e2bfe029` with the production WASM SHA-256
`09616da85bf59c50c0cde7b743a4bdccb2eac06ec4eb0b79f79c44ef71d9caa9`
and campaign-runner SHA-256
`745a77d05768a992ffe5c30853227a4415dbace813f393edf0ae4d02000b7b91`.
The serialized state SHA-256 is
`4467817b94986bdb416904443a7fa476444021fdd56f7a121ac5d4ecfd19c61f`.
The compressed [fixture](state.json.gz) SHA-256 is
`b0c9045e9a45214cb789db6c1a6781dc3f407c6eb20d363347632bb201c1be4b`.

The campaign used Manglares/712, Mapungubwe, the `good` virtual player,
topological defense, native intentions, native wall plans and ordinary paid
actions. No balance or behavior rule was changed. The capture is at day 40,
time 181, with 114 living crops (193 crop records), 19 workers, 85 tasks,
44 structures and three undelivered crates (79 crate records). It is an active
daylight state without a raid. The historical day-72 Manglares fixture cannot
be replayed through this engine because it uses pre-Wild-Engine prop IDs;
silently converting those IDs would describe a different procedural world.

To regenerate the fixture from the campaign start:

```sh
node tools/experiments/capture-defended-campaign-state.mjs manglares 712 40 docs/qa/current-wild-engine-manglares-day40/state.json.gz
```

To repeat the diagnostic, run the following order with the same checkout and
WASM. Use `profile-frozen-native-tick.mjs` with the fixture above, `20` seconds,
`--dt 0.1 --campaign-residency`; add `--prune-history` only for B. Execute
A/B/B/A in separate processes. B removes dead crops and delivered crates from
the in-memory copy before constructing Wild Engine; it never writes the state.

| Arm | 20 simulated seconds, inclusive profiler loop | Median per simulated second | p95 | `planIfNeeded` total |
| --- | ---: | ---: | ---: | ---: |
| A1, intact history | 415.4 ms | 8.75 ms | 86.1 ms | 222.7 ms |
| B1, pruned history | 411.5 ms | 8.70 ms | 89.1 ms | 229.2 ms |
| B2, pruned history | 422.1 ms | 9.72 ms | 88.2 ms | 225.4 ms |
| A2, intact history | 410.1 ms | 8.41 ms | 84.5 ms | 220.0 ms |

All arms produced the same active-state hash
`826d8789f37c8391ebe69bdc754fe0fbecb886851ecc83419d434a68acb51a09`,
19 native planning calls and 45 task-route queries. The mean totals of A and B
are 412.8 and 416.8 ms, respectively. With only two repetitions per arm and
variable host load, this is no evidence that retained dead crop and delivered
crate records cause this state's tick cost. `planIfNeeded` accounts for about
half of the measured tick time, but it includes legitimate task selection and
route work; the 19 calls in 20 seconds do not by themselves indicate polling.

The 96-night Manglares report used an older WASM and includes night-long
economic and raid activity. This short, raid-free state cannot explain its
middle-campaign peak. A later current-engine snapshot including an active raid
and a phase-level native profile is needed before changing the planner.
There is no rendering in these measurements, so they say nothing about FPS,
GPU cost or magic VFX.

The profiler now separates `gameTickMs` from `residencyMs`. A repeat of this
day-40 replay loaded no additional sectors during the timed window, so the
old inclusive figures here largely measure `Game.tick`. The [active-raid
replay](raid-residency.md) does load sectors and shows why that distinction
matters.
