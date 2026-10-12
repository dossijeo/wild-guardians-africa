# Bounded actual-farm surface/slope/coarse profile

Measured source `d04f1474`, unchanged QA defaults OFF. This experiment ran no commands, simulation ticks, actor travel, hiring or policy changes. Input is the retained protected day-8 snapshot. Queries use 96 actual crop-neighborhood fractional coordinates and the native presentation warthog radius 1.1; these are diagnostic geometry queries, not the actual pressure-adjusted raid path. All native output values/booleans and serialized state match across 18 phase/arm rows.

Command (actual exit 0):

```
node --cpu-prof --cpu-prof-dir=.cache/surface-pipeline-profiles --cpu-prof-name=surface-pipeline-01.cpuprofile tools/profile_qa_surface_pipeline.mjs docs/qa/native-balance-parallel-short/native-original/state.json.gz .cache/surface-pipeline-profile-01
```

Each arm starts a fresh native navigator, validates outputs, warms 1000 queries, then times surface 100,000, slope 30,000 or coarse collision 500 calls. Order A1/B1/C1/C2/B2/A2; A diagnostic native, B nested memo, C flat memo. Counters include validation/warmup and must not be mistaken for the timed iteration count. Positive coarse results total exactly 419/500 in every arm; no collision was assumed clear.

| Phase | A native mean | B nested mean | C flat mean |
|---|---:|---:|---:|
| Surface | 32.0117 ms | 17.1245 ms | 16.6286 ms |
| Slope | 40.9072 ms | 25.1553 ms | 23.1273 ms |
| Coarse | 39.0100 ms | 29.0251 ms | 27.5921 ms |

The raw sampled profile lasts 1.550313 s/1545 samples, including setup/warmup. Disjoint ancestry buckets: coarse pipeline 0.825254 s, slope-only 0.157863 s, surface-only 0.093204 s, other 0.473794 s. Exclusive native lattice 0.234711 s and surface 0.121206 s remain concrete costs. No time is summed twice; these are CPU samples, not independent wall-time stages or GPU measurements.

The small working set (coarse memo 431 distinct native heights for B) is much smaller than the expensive protected fixture (up to 14,085 entries). Warm interpolation/collision benefits are real for this corpus but do not establish full protected gain or explain the first nested-B regression. A full protected flat AB/BA must compare entire decisions, ledger and snapshots before any activation; no 100-night run is justified yet. Inactivity is outside acceptance by user decision.

Original rows, launch hashes, stdout, CPU profile and derived attribution are byte-exact gzip payloads. `tools/analyse_qa_pipeline_profile.mjs INPUT NEW_OUTPUT` reproduces the attribution; its output was verified byte-identical to the initially derived JSON. Source/geometry/strategy was not modified during measurement. No main or cinematic worktree was touched.
