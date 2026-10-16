# Wild Engine algorithm and linear-memory audit — first baseline

This branch starts at `3361c06a`, the current experimental native-intent
branch, without changing gameplay or the production WASM binary. It is
separate from PR #53. The experiment is not yet a recommendation to merge.

## Effective code and candidate checks

`spatial-game-session.js` and the game entry point use `spatial-world.js` and
`spatial-intent-bridge.js`. `lazy-sectors.cpp`, `spatial-route-planner.cpp` and
`spatial-intent-state.cpp` are linked into the active `spatial-savanna.wasm`.
`lazy-sectors-adapter.js` and `spatial-core-worker.js` are also used by
experiments; their standalone timings must not be presented as game-loop
timings. The build script currently sets `INITIAL_MEMORY=4194304` and
`ALLOW_MEMORY_GROWTH=1`.

The source still has `visited.assign(maxNodes,0)` in both `lazy_connected`
and `lazy_route`; `lazy_route` also clears `previousNode`. `rebuildEdges`
visits the full portal vector. Several route-handle acquisition sites scan
`routeSlots` for an inactive slot. `residentPropBlocked` and `cropOccupied`
have the linear checks described in the request. These are confirmed
algorithmic candidates, **not yet measured bottlenecks**. The first workload
profile below cautions against assuming all slow time belongs to BFS.

## Frozen 24-night CPU profile

`manglares24-profile.json.gz` and `manglares24-intent.cpuprofile.gz` retain
the full daily report and V8 CPU profile from:

```powershell
$env:WILD_ENGINE_SPATIAL_SERVICES_WASM=(Resolve-Path 'src/world/hierarchical-wasm/spatial-savanna.wasm').Path
$env:WILD_ENGINE_SPATIAL_ADVICE='1'
$env:WILD_ENGINE_DEFENSE_POLICY='expanding'
node --cpu-prof --cpu-prof-dir=docs/qa/wild-engine-algorithms-memory --cpu-prof-name=manglares24-intent.cpuprofile tools/experiments/run-native-intent-campaign.mjs 24 manglares 712 good docs/qa/wild-engine-algorithms-memory/manglares24-profile.json intent
```

The report embeds source `3361c06a`, WASM SHA-256
`ff719cfebd15fe0aa11a4ed85abc2912f35527e84e635699429489660a1fd8e7`,
input-file hashes, parameters, daily state hashes and verified raid evidence.
All 24 day-end state hashes match the prior unprofiled 30-night campaign.
The profiler increased day-20 `Game.tick` from 98.16 to 143.51 seconds and
day-23 from 112.32 to 165.81 seconds, so its elapsed times are **not** a
speed baseline. It samples the same physical campaign for hotspot diagnosis.

The profile contains 1,493,568 samples. The largest individual self-sample
counts are 342,393 in unnamed WASM function 93 and 322,428 in JavaScript
`gcd` (`money.js`). Other large WASM functions have 133,913, 102,645 and
86,251 samples. Function 93 is reached from route planning, native task
planning and crop-group advice. Without a symbolized WASM build we cannot
assign it to a specific C++ algorithm. The `gcd` work belongs to exact game
arithmetic and must be separated from Wild Engine optimization. The profile
also cannot attribute the two daily spikes to one function without a
time-windowed trace. No algorithmic change is justified yet by this profile
alone.

## Linear-memory baseline

`tools/experiments/benchmark-wild-engine-linear-memory.mjs` instantiates
the same production WASM binary for isolated 1-, 9-, 25- and 49-chunk
Savanna worlds. It records committed linear-memory bytes after world
generation, sector builds, 100 mixed-profile route requests and one wall
addition/removal. It also records calls to the Emscripten memory-growth
notification import. That notification count is **not** a proof that every
possible internal `memory.grow` was observed. It does not measure live C++
heap usage, process RSS, user-facing frame pauses or legal-campaign scale.

With the shipped 4 MiB initial memory, 1 and 9 chunks stayed at 4 MiB and
generated no growth notifications. The 25-chunk case ended at 5.3125 MiB
with 4 notifications. The 49-chunk case ended at 10.1875 MiB with 33
notifications, largely during sector construction and the first route
queries. Exact phase timing and notification timestamps are retained in
`linear-memory-baseline-v2.json`.

The 49-chunk synthetic workload was repeated in order 4/16/16/4,
4/32/32/4 and 4/64/64/4 MiB. For this experiment the script explicitly
pre-grows memory after instantiation; this is **not** a rebuild with a
different `INITIAL_MEMORY` setting and excludes any difference in module
instantiation. The 4 MiB runs finished at 10.1875 MiB with 33 notifications;
all pre-grown runs had zero subsequent notifications and retained their
full 16/32/64 MiB committed capacity. Whole-workload medians were about
1501 ms (4 MiB, six runs), 1451 ms (16 MiB, two), 1477 ms (32 MiB, two)
and 1476 ms (64 MiB, two). This small and non-monotonic difference in a
synthetic workload is insufficient to raise the production default.
`linear-memory-abba-*.json` preserve every unaggregated run and source hash.

The same seed and 49-chunk shape were then sampled once in each of the six
biomes, with the unchanged 4 MiB binary. Final committed memory ranged from
9.625 MiB (Desert) to 13.5625 MiB (Mangroves). Growth notifications ranged
from 24 to 52; the 49-chunk Mangrove nav builds took 1.92 seconds in this
synthetic run. `linear-memory-biome-*.json` retain the four chunk sizes,
phase timings and every observed growth notification for each biome. One
sample per biome is a capacity probe, not a stable performance comparison.

Run the baseline with:

```powershell
node tools/experiments/benchmark-wild-engine-linear-memory.mjs src/world/hierarchical-wasm/spatial-savanna.wasm report.json 0
```

The fourth argument is optional explicit pre-growth in MiB; the fifth and
sixth select biome and seed (defaults: `sabana`, `712`). The next phase
needs true Emscripten builds at alternative initial sizes, platform memory
checks, representative saved games, C++ heap/capacity instrumentation, and
end-to-end campaign timing. The standalone experiment must not change the
production default before those comparisons pass.

`run-native-intent-campaign.mjs` now accepts the optional
`WILD_ENGINE_MEMORY_PROFILE=1` QA flag. It samples committed linear bytes no
more than once per five simulated seconds, records observed size changes and
one entity-count snapshot per day, and leaves ordinary runs uninstrumented.
`manglares1-memory-smoke.json` confirms the trace is emitted in a real
one-night campaign; it is only a smoke test, not sustained-memory evidence.
The opening sample was 4 MiB and four size changes were observed. The next
campaign must extend this trace beyond the presentation nights and compare
source-identical uninstrumented timing.

## Next isolated measurements

1. Symbolize or instrument the hot WASM functions, then profile sector
   rebuild, BFS clears, portal scans and route-slot scans separately.
2. Benchmark generation stamping as one isolated candidate against the
   unchanged binary on frozen navigation inputs; compare exact states and
   `found`/`blocked`/`unknown` results.
3. Measure portal cardinality and topology-change frequency before adding
   an inverse index; measure route-slot scan lengths before adding a free list.
4. Expand linear-memory traces to restored games and large legal farms,
   recording actual entities and sectors alongside committed pages.
