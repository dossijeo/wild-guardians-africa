# Native raid spawn CPU investigation

After moving native horizon generation to its worker, first animal appearance
still incurred roughly 320–343 ms in synchronous raid-spawn work in the desert
browser case. Model downloads and animal shader programs were already warm.
The opt-in `profile=1` fixture records inclusive navigation timings and captures
the pre-spawn snapshot, active bounds, camera view and warmed prop chunks so the
same spawn can be replayed without changing RNG or player decisions.

`desierto-profile.json` was captured with an experimental scoped terrain-query
cache and axis prefilter for prop queries. That experiment has been removed from
production. Its browser spawn measurement was 341.3 ms, so it did not establish
an improvement over the earlier 320.1 ms observation. Its `testTerrainValid`
counter belongs to that temporary experiment; production has no such method.
Nested path and segment measurements overlap and must not be summed.

The replay tool compares unchanged production navigation with three candidates
installed only on fresh diagnostic navigators: the prop prefilter, a bounded
per-spawn terrain-query cache, and their combination. It alternates order and
checks the SHA-256 of the complete serialized post-spawn state, not only animal
positions. All 32 replay states in the final run are identical.

| Final native-reference replay | Median spawn CPU time |
| --- | ---: |
| Production reference | 257.45 ms |
| Prop prefilter only | 246.70 ms |
| Scoped terrain cache only | 250.03 ms |
| Combined candidates | 238.25 ms |

This single eight-repeat Node case suggests a small improvement, approximately
7.5% for the combination. It does not remove the remaining synchronous work or
prove browser/phone frametime improvement. Earlier alternating trials varied
substantially, including a regression; the browser comparison was also not an
identical-load A/B. No candidate has been adopted on this evidence.

`comparison-native-reference.json` records the exact production source hashes
and an even-sample median. The earlier `comparison.json` is retained as a
historical exploratory run: its reference inlined the prop distance calculation
and its summary selected the upper middle sample rather than averaging the two
middle samples. It is not the final controlled comparison.

Reproduce:

```powershell
node tools/benchmark_raid_spawn.mjs docs/qa/raid-spawn-navigation/desierto-profile.json NEW_REPORT.json 8
```

Next: compare identical native browser cases across biomes and assess moving
route-entry preparation outside the spawn frame, with geometry/camera revision
checks to reject obsolete results. Retain synchronous correctness fallback.

## Small-cell spatial index trial

`comparison-prop-index.json` adds a diagnostic index of immutable native chunk
props in 8-metre bins for small-radius queries, retaining original chunk/list
order, strict circular distance and live suppression filtering. Weak keys release
the index with evicted chunks. Long-radius queries retain the full scan.

The seven differential tests in `tests/prop-index-candidate.test.js` pass across
all six biomes, chunk boundaries, multiple radii, suppression changes, eviction
and regeneration. The forty alternating spawn replays also produce one identical
complete post-state hash. These are correctness checks, not performance wins.

In this eight-repeat trial, the unchanged production median was 274.60 ms and
the indexed candidate 311.63 ms. The axis prefilter measured 291.23 ms, scoped
terrain cache 275.64 ms, and their combination 295.32 ms. Background campaign
processes were active; absolute timings are not directly comparable to the
earlier run. The candidate did not demonstrate a benefit and remains outside
production. This result does not support adding an index to the game's runtime.
