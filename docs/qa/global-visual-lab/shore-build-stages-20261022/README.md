# Shore build stages after Canyon boundary skip

Real native river-following round trips, Canyon/Mangrove, day/night, medium 1280x720 seed 712. Twenty captures, no browser/WebGL errors. Instrumentation divides preparation into bounds/boundary extraction, height sampling, pixel packing (including boundary-distance queries), and material/texture-object setup. Durations are CPU construction observations with instrumentation, not frame/GPU timings or an optimization comparison. Day includes initial loading, night a warm repeated path.

| Biome/phase | Builds | Boundary ms | Height ms | Packing ms | Material ms |
|---|---:|---:|---:|---:|---:|
| Canyon day | 24 | 1.1 | 243.5 | 12.0 | 0.7 |
| Canyon night | 15 | 0.5 | 200.2 | 7.3 | 0.1 |
| Mangrove day | 45 | 224.1 | 102.3 | 130.1 | 1.0 |
| Mangrove night | 25 | 122.6 | 57.6 | 62.2 | 0.5 |

Canyon now spends over 94% on heights, while Mangrove is dominated by boundary extraction and boundary-distance packing. Code inspection confirms field.surface delegates each point through core.surfaceAnywhere to the existing WASM terrain query. This does not prove interoperability dominates rather than terrain evaluation; do not infer that a new C++ loop alone solves it.

Next: evaluate reuse/batching of exact height samples for Canyon without changing simulation or authoritative terrain; separately reduce Mangrove boundary bookkeeping. Keep resolution and appearance. No further production change was made in this profiling pass. Global objective remains open.

Reproduce `node tools/experiments/profile-shore-build-stages-20261022.mjs`, then `python tools/experiments/audit-shore-build-stages-20261022.py` with Vite 5190. Raw per-build stage times and dimensions remain in captures.json.
