# Occupied native wall approach: Manglares/712, day 11

This diagnostic belongs to the experimental intention planner in PR #53. It is not a separate integration candidate. The frozen 14-night native-wall run completed all raids and retained the same 14 daily state hashes as the earlier native-wall recheck. The extra counters do not change selection or simulation.

Across the run, native wall planning reported `occupied` 149 times. The established JavaScript fallback found a valid wall in 18 of those cases and returned unresolved in 131. Therefore removing the fallback for every `occupied` result would lose valid attacks.

The frozen state captures one of the 18 cases: day 11, time 513, `animal-11004` at `(98.74289374036213, 46.025268250158)`. Native crop planning reports `blocked`. Native wall planning examines 40 group/wall candidate rows, makes zero route queries, and reports `occupied`. The fallback selects intact wall `structure-1588` at an approach around `(103.4691, 12.6896)`.

The native perimeter graph **does contain wall 1588**. Its one exposed approach is `(103.92, 10.272)`. Repeating the native request without transient body/reservation inputs still reports `occupied` after 40 route queries. Removing other confirmed animal intentions one at a time eventually permits a native route to wall 1588; notably, removal of `animal-11002` frees its fixed approach. The JavaScript result uses a different point on the same wall. This identifies the missing capability as alternative physically validated attack sites for a candidate wall when the first site is reserved or occupied. It does not justify treating `occupied` as `blocked`, widening collision rules, or removing the fallback now.

Reproduce with the checked-in WASM build:

```powershell
$env:WILD_ENGINE_NATIVE_ROUTE_WASM='src/world/hierarchical-wasm/spatial-savanna.wasm'
node tools/experiments/probe-native-wall-occupied.mjs docs/qa/wild-engine-intent-lifecycle/manglares14-wall-occupied-diagnostic-occupied-fallback-state.json.gz animal-11004 98.74289374036213 46.025268250158
```

The probe never advances `Game.tick`. Its lease-removal experiments mutate only this in-memory diagnostic session. The campaign report and frozen state are retained as gzip files alongside this note. Before replacing the fallback, add bounded alternative native attack sites for wall segments, keep target and approach leases exclusive, validate the physical route for each selected site, and repeat the frozen probe, raid tests, and sustained campaign comparison.

## Rejected native-site prototype

An isolated prototype kept the same perimeter graph and tried a few other points along the near face when its fixed point was occupied. The frozen `animal-11004` case then selected wall 1588 natively with a valid route in one query. Twelve native raid tests passed, including a temporary regression for this snapshot. The broader 14-night run exposed a sustained cost that outweighed the local success:

| Manglares/712, 14 nights | Existing native wall + JS fallback | Alternative sites | Target/approach prefilters |
| --- | ---: | ---: | ---: |
| Native wall route queries | 228 | 783 | 783 |
| Native walls found | 228 | 266 | 266 |
| Wall results `unknown` | 0 | 79 | 79 |
| Elapsed seconds | 432.9 | 486.6 | 490.8 |
| Verified raids | 14 | 14 | 14 |
| Day 14 crops / coins | 133 / 726 | 117 / 826 | 117 / 826 |

The two prototype runs have identical daily serialized hashes, so the prefilters did not change the simulated outcome. Their timings were sequential, not an ABBA benchmark; the route-query increase is the stronger evidence of extra work. A third initial prototype run took 485.9 seconds with the same 783 wall route queries and the same terminal hash. All three reports are retained as `.json.gz` files. The local alternate-site code and temporary regression were removed after this measurement; the existing fallback remains active. Any replacement needs to identify an available service point cheaply **before** launching multiple full routes per wall, and then pass a sustained campaign comparison.
