# Cached selected-grass footprints

QA alternative caches each immutable tile anchor's raster footprint in a WeakMap. Camera selection replays integer mask entries instead of recomputing chunk bounds, distances and weights. Capacity truncation and actual selected anchors remain unchanged. Invalidated tile anchors are new objects, allowing old entries to be collected; dispose clears the cache reference. No production source/default change.

30 deterministic selection cases compare all mask bytes and upload totals exactly against the naive implementation, including capacity overflow, empty selection, chunk boundaries, fresh anchors and eviction. Six real day/night reference/cached screenshot pairs are pixel-exact with equal cameras/time/draws/triangles. No captured errors. An initial harness served raw ES-module text without Vite transforming the `three` import; it failed before capture and was corrected to fetch the Vite-served cached module. Retained frames come from the successful run.

## Full-frame measurement

`river-underlay-mask-cache-cost-20261022`: Intel UHD ANGLE D3D11, media1280x720, seed712, A/B/A/B reference/cached, day/night, 4-unit moving camera and wind.60 warmup +90 samples per phase; GPU and CPU/cadence passes separate. All720 GPU queries valid, all frame cameras/calls/triangles equal, simulation unchanged, no GL/disjoint/pending errors. Fixed resident chunks, not streaming. No concurrent tests/captures during timing.

| Phase/repetition | Reference CPU ms | Cached CPU ms | Reference GPU ms | Cached GPU ms | Reference interval ms | Cached interval ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Day1 | 6.401 | 5.950 | 15.210 | 15.228 | 17.728 | 17.837 |
| Day2 | 6.646 | 6.214 | 15.321 | 15.091 | 17.797 | 18.098 |
| Night1 | 6.310 | 6.046 | 16.056 | 15.857 | 18.388 | 18.348 |
| Night2 | 6.402 | 5.880 | 15.625 | 15.787 | 18.121 | 18.458 |

CPU render submission decreases in all four comparisons by .264–.522ms. GPU deltas change sign. RAF interval does not consistently improve; **no FPS improvement is established**. Full p95 values are retained in summary JSON. The cache is a modest CPU reduction worth retaining for further work, not a sufficient solution to the mask's cost.

The cold capture instrumentation is less favorable: final cumulative mask CPU250.2ms reference vs288.8ms cached across126 updates each, with one additional dirty-mask upload in the cached capture. Loading/initial selections are not identical timing fixtures even when final images match. Thus cold-build benefit is not established; extra WeakMap/object allocations have a cost. R8 payload/scratch remain235225 bytes each for25 chunks, but cached JS footprint memory is additional and not reliably measured here.

## Next decision

Keep cached QA, then avoid full resident mask clearing/rebuilding when only a small set of anchors changes. Continue preserving exact bytes and measuring total frame behavior. Live exclusion updates, rapid streaming, memory behavior and second seed remain required before native integration. The approved native recipe stays intact.

Reproduce with Vite on5190:

```powershell
node tools/experiments/test-selected-grass-mask-cache-20261022.mjs
node tools/experiments/capture-river-underlay-mask-cache-20261022.mjs
node tools/experiments/measure-river-underlay-mask-cache-20261022.mjs
$env:WG_BENCH_OUT='docs/qa/global-visual-lab/river-underlay-mask-cache-cost-20261022'
python tools/experiments/audit-canyon-native-composition-resident-cost-20261022.py
```

Screenshot equality metadata is in audit.json; raw images are retained here. Scope remains one River fixture, not global art completion.
