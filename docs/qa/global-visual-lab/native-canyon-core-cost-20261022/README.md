# Native Canyon opaque core: ABAB cost

Intel UHD 0x9A60 ANGLE D3D11, medium, 1280x720, seed 712. Shore/core/shore/core. Identical four-unit camera path, paused simulation, 60 warmup + 90 samples per GPU pass and independent cadence pass. Audit passes 720 valid GPU queries with no disjoint/pending/errors, matching camera sequences, unchanged simulation and repeated per-variant geometry counters. Streaming excluded.

Mean milliseconds:

| Phase/pair | GPU shore → core | CPU submission shore → core |
|---|---|---|
| Day 1 | 12.616 → 11.645 | 3.740 → 4.278 |
| Night 1 | 14.405 → 12.685 | 3.391 → 3.704 |
| Day 2 | 14.016 → 11.524 | 3.467 → 3.423 |
| Night 2 | 15.279 → 12.331 | 3.631 → 3.390 |

GPU savings are consistent: 0.971–2.492 ms day, 1.720–2.948 ms night. CPU effect is mixed (+0.538/+0.313 ms first pair, -0.044/-0.241 ms second). Mean frame cadence remains near 16.63 ms; no FPS gain demonstrated. This trades 4–5 extra draws and repeated water triangle submissions for less hidden terrain shading, with static RGB parity verified separately.

Retain as a Canyon-only experimental optimization; do not generalize to other biomes or claim it eliminates the entire shoreline cost. Still needs modest-quality profiles and construction cost work. Current native streaming evidence is in native-canyon-core-stream-20261022. Defaults remain unchanged.

Reproduce Vite 5190, `node tools/experiments/measure-native-canyon-core-cost-20261022.mjs`, then `python tools/experiments/audit-native-canyon-core-cost-20261022.py`. Raw samples, CPU/GPU separation and p95 values are retained in benchmarks.json/summary.json.
