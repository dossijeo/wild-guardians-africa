# Sector-refresh walkability reuse (prototype, not adopted)

`refreshSector` rebuilds a sector's passability and directed edges after a wall topology transaction. The old implementation asks `walkable` again for both edge endpoints on each directed edge even though the sector just computed its own passability. [The isolated prototype](sector-refresh-halo.patch) computes walkability once for a sector plus its one-cell halo, then uses those results for directed edge construction. It retains each direction's raster step mask and physical wall-clearance check. The checked-in source and WASM remain the baseline implementation.

The candidate was built with pinned local Emscripten 6.0.12 from base source `b555bed9`. Baseline WASM SHA-256: `110ccb71c8785687e747d8550436576d5c7442e27d254085ab9463efeaecd7e6`. Candidate SHA-256: `991f9f85a3d756dc108db354c5e795671fd645290b586da097454699f742df9a`.

The frozen Sabana/712 day-3 daylight workload planned a 35-module, 350-coin enclosure around a 66-crop group. All four runs returned the same `ready` status, one gap, verified three completed raids, and 53 live crops at the end. The sequence was baseline/candidate/candidate/baseline, each in a fresh Node process on the same host:

| Variant | Plan time | Preview topology time | Three-night elapsed |
| --- | ---: | ---: | ---: |
| [Baseline 1](enclosure-refresh-baseline.json) | 6,414 ms | 6,065 ms | 17.85 s |
| [Candidate 1](enclosure-refresh-halo-1.json) | 5,565 ms | 5,276 ms | 16.52 s |
| [Candidate 2](enclosure-refresh-halo-2.json) | 6,567 ms | 6,236 ms | 19.51 s |
| [Baseline 2](enclosure-refresh-baseline-2.json) | 6,593 ms | 6,227 ms | 18.28 s |

The pairwise plan-time medians suggest about 6.7% lower cost, but the second candidate run is within 0.4% of the second baseline. The whole three-night elapsed time is essentially unchanged in this noisy sample. This work does not demonstrate a sustained campaign improvement, and the expensive speculative enclosure service is not yet in the routine bot decision path.

[The differential probe](enclosure-refresh-differential.json) compared 324 full discrete and continuous routes and connectivity verdicts, including exact route points, across all six biomes, worker/hyena/rhino profiles, and open/added/removed wall states. All matched. The candidate-specific native-intent/repair/crop-group tests also passed; the combined test command reported 89 passes, although its `spatial-savanna-prototype.test.js` file imports the checked-in baseline binary directly. Thus the 89 count is not an all-candidate proof.

To reproduce, apply the patch with `git apply docs/qa/wild-engine-algorithms-memory/sector-refresh-halo.patch`, build to an isolated output with `SPATIAL_WASM_OUTPUT=.cache/enclosure-halo.wasm bash tools/build-spatial-savanna-wasm.sh`, and run `node tools/experiments/compare-sector-refresh.mjs src/world/hierarchical-wasm/spatial-savanna.wasm .cache/enclosure-halo.wasm <report.json>`. The four plan-time reports use `tools/experiments/profile-crop-enclosure-plan.mjs` with `WILD_ENGINE_SPATIAL_SERVICES_WASM` set to the selected binary.

Decision: retain this as a measured prototype and do not replace the checked-in WASM. It needs a lower-noise repeated benchmark and a workload where this sector refresh affects actual `Game.tick` before adoption. Neither economic rules nor the production engine were changed.
