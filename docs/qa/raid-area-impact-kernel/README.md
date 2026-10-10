# Experimental local crop-impact selector

Branch `codex/raid-area-impact-kernel`, based on main `6be16b15`. Production does not import this module. No prices, damage, saves, rendering or raid outcomes change. The user authorized investigating farm-value pressure and attacks affecting several nearby plants; numerical policy and campaign acceptance remain undecided.

`areaCropTargets` returns primary plus nearest eligible neighbours in a bounded radius (experimental maximum5m/eight targets). Distance ties use stable IDs, not RNG or iteration order. The supplied read-only `canHit` callback must check shields and native occlusion for each target. A protected primary cancels selection entirely; the selector cannot itself certify physical contact. It does not damage crops, spend attacks, manage reservations, emit events or write saved data.

Only the cached living crop list is scanned after initial indexing, avoiding repeated traversal of an arbitrarily large saved death history. A small sorted list retains eligible nearby candidates; no full-farm sort, persistent spatial index, new dependency or per-frame work is added. Appended crops, death invalidation and restored arrays follow the existing active-crop index rules.

## Tests and CPU diagnostic

```
node --test tests/area-crop-targets.test.js tests/active-crops.test.js
node tools/benchmark-area-crop-targets.mjs --output docs/qa/raid-area-impact-kernel/cpu-no-overlap.json
```

11 tests passed,0 failed/skipped,354.8133ms. Selection is compared against a brute-force oracle for40 dense/permuted fixtures. Tests include protected primary/secondary, strict radius/cap, alive history, state immutability and native wall geometry. The native-solid test deliberately isolates terrain and props; it proves the existing solid wall/animal gate envelope blocks secondary rays, not full biome navigation or shield rendering. Animals currently treat even open worker gates as solid; this policy is preserved in that test.

One Node20.11 CPU diagnostic,300 warmed samples per case,1001 living crops with/without100000 dead records, four native wall obstacles, terrain/props isolated:

| Dead history | Cold selection | Median | p95 | Maximum | Occlusion queries/impact |
|---|---:|---:|---:|---:|---:|
|0|3.4361ms|.0863ms|.4145ms|2.1288ms|19|
|100000|2.8887ms|.1018ms|.3388ms|1.1400ms|19|

Retain all maxima; these are not GPU/frame-time or full-world benchmarks. The warm-history comparison is sequential and cannot establish a causal speedup. An earlier synthetic run accidentally placed a neighbour at the primary's exact position; `cpu-microbenchmark.json` retains it, including6.9864ms outlier. The corrected source/result remove that duplicate and use1.5m neighbour spacing. Neither fixture proves real terrain/placement legality.

## Integration requirements still open

- Choose a calibrated radius, target cap, crop hit increment and structure-damage curve using the separate economic/occupancy analysis. The experimental hard limits are not approved final gameplay values.
- Freeze pressure on raid creation; maintain deterministic save/reload and old-save defaults. Keep first-five-night destruction limits intact.
- Apply selected targets exactly once inside the existing `hitApplied` committed-attack guard, spending one native hit. Test reload around impact, separate crop events, active-index retirement, harvest/task/reservation reconciliation and area presentation.
- Use the actual attacking pose for native clearance; do not use actor-disc collision as wall occlusion. Test cliffs, biome fluids, intact/damaged/ruined defenses and shield boundaries. Do not weaken target reachability to force the experiment to succeed.
- Observe expanding paid defenses and actual contacts/repair settlements in a bounded paired pilot before100 nights. Measure effect on raid duration, damage, income, actor/navigation/render costs and meaningful activity.

No PR or production integration is justified by selector tests alone.
