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
