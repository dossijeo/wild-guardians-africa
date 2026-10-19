# Volcanes/712: repeated wall-repair preview cost

This experimental branch changes only how the existing read-only wall-repair
preview asks whether its worker and center witnesses can reach their village.
It does not change repair prices, gate choices, wall geometry, military pressure,
or the bot's decisions.

## Measured problem

Current `main` completed 30 nights with topological defense, 158 living crops,
1,003 coins, and verified raid evidence. `Game.tick` took about 3–4 seconds per
night through night 18, then 32.28 seconds on night 19 and intermittently
15–33 seconds on later nights. The 30-night run is diagnostic, not evidence of
100-night survival or of a memory leak.

An opt-in V8 CPU profile of nights 19–22 attributed about 69.1 of 87.9 seconds
of sampled `Game.tick` CPU to `planRepairAccess`. This is inclusive time:
50.6 seconds were within legacy `withWallStatePreview` checks and 18.1 seconds
within the native preliminary check; these figures must not be added to their
parent. The native overlay search performs the work. The profile does not
attribute it to the JS/WASM call boundary or to the crop update loop.
The compressed [profile](day19-22.cpuprofile.gz) is retained for inspection.

At a frozen state immediately before a repair attempt at day 19, time 168.0,
there were 24 workers and 40 walls. Restoring wall `structure-2183` caused the
native preliminary check to report that no single gate certified access. The
legacy fallback then evaluated 41 wall hypotheses, performing a separate
overlay reachability search for each witness. Its result was `unknown`, so the
repair was deferred. The same expensive attempt occurred again later that day.
The frozen state is [the regression fixture](../../../tests/fixtures/volcanes712-day19-repair-before-arrival.json.gz).

## Change and validation

The fallback still evaluates the same hypotheses. For each village, it now
groups all relevant workers and centers into one reverse reachability batch
over the same read-only hypothetical wall overlay. A direct query from a
witness to the village and a reverse batch from the village to that witness
represent the same directed question. `unknown` remains `unknown`; no result
is treated as physically blocked or safe by inference.

The regression test checks every one of the 40 gate alternatives in the frozen
state and compares all individual witness statuses with the grouped statuses.
Existing repair tests cover an actual automatic gate, occupied footprints,
inconclusive routes, Gran Cañón, Manglares, Gran Río, Desierto, Volcanes, and
save/load. The original confirmed game state is unchanged by the preview.

On the frozen repair query, two alternating runs per arm gave:

| Arm | Query times | Result | Preview calls |
| --- | ---: | --- | ---: |
| Individual witnesses | 12.214 s, 12.284 s | `unknown` | 41 |
| Grouped witnesses | 4.211 s, 4.175 s | `unknown` | 41 |

These are query timings, including the native preliminary check, not a complete
campaign improvement. The grouped version still spends about 4.2 seconds on
this uncertain repair. In separate 19-night campaigns with the same code and
WASM, all 19 serialized daily state hashes matched between
[individual](sequential-19.json) and [grouped](batch-19.json) arms. Both had
verified raid evidence. Night 19 `Game.tick` fell from 32.50 to 14.23 seconds;
the 19-night total fell from 80.26 to 62.60 seconds for `Game.tick` and from
114.33 to 97.09 seconds wall time. Those are one run per arm, so the query
ABBA is stronger evidence of isolated cost than the campaign timing alone.

The grouped variant also completed [30 nights](batch-30.json). Against the
archived [30-night control summary](baseline-30-summary.json), all daily living
crop, money, and crop-destruction counts matched. Total `Game.tick` time was
183.62 seconds versus 309.95 seconds (40.8% lower); total process time was
250.83 versus 377.67 seconds (33.6% lower). Both had 30 completed nights and
verified raid evidence. The original control did not retain daily state
hashes, so strict serialized-state equivalence is demonstrated only through
night 19. Several later grouped nights still take roughly 10–15 seconds;
the residual cost remains worth profiling before longer campaigns.

The WASM SHA-256 for the compared arms was
`09616da85bf59c50c0cde7b743a4bdccb2eac06ec4eb0b79f79c44ef71d9caa9`.
The `game.js` SHA-256 was
`99e7fe9fb0ecf3e3eca242e07ae6f01e863b02b903dbc8b93d8b1c8bad17b28f`.

Reproduce the focused query with `profile-repair-access.mjs` using the fixture,
`WILD_ENGINE_REPAIR_ADVANCE_SECONDS=0.2`, and
`WILD_ENGINE_REPAIR_SEQUENTIAL_PREVIEW=1` for the control. Reproduce full
daily hashes with `compare-repair-preview-campaign.mjs sequential|batch`.
`profile-volcanes-campaign-ticks.mjs` records bounded CPU profiles and optional
frozen repair states without changing production simulation code.

The remaining 4.2-second preliminary/fallback repair query is still expensive.
The native `unknown` result may reflect incomplete evidence rather than a
blocked passage, so dropping the fallback or confirming a gate without further
proof would be incorrect. Further work should identify the exact unknown
dependency and avoid scheduling duplicate speculative repair attempts until a
relevant topology, residence, or actor-position change makes them useful.
