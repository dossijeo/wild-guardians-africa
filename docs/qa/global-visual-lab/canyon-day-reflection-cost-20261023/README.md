# Day reflection candidate cost

Intel UHD0x9A60 ANGLE/D3D11,1280x720,medium, same populated Canyon saved fixture/native camera. Baseline/candidate/baseline/candidate, each day/night. Each phase60warmup +90GPU samples and a separate90-frame cadence pass.720 valid GPU queries; no disjoint/discarded/pending/error conditions. All paired scene state, resource counts, cameras, draws and triangles match. Ground mask residency is preinitialized before timing. Simulation paused, fixed camera, syncChunks suspended during timing: excludes streaming, active simulation and moving-camera cost.

| Run | Day GPU mean ms | Night GPU mean ms | Day CPU mean ms | Night CPU mean ms |
|---|---:|---:|---:|---:|
| Baseline1 |13.908|14.480|5.170|5.151|
| Candidate1 |13.828|15.000|5.793|5.274|
| Baseline2 |13.904|14.663|6.344|5.211|
| Candidate2 |14.052|14.362|5.181|5.648|

Day GPU delta -.080/+.148ms; night+.520/-.301ms. No consistent GPU overhead or performance win established. CPU changes mixed. Day cadence16.638/16.813 baseline vs16.613/16.628 candidate; night16.811/16.998 vs16.629/16.999. This refresh-limited static sample cannot establish a practical FPS gain. Candidate adds arithmetic, no texture read/pass/geometry. Performance does not reject the candidate at this scope, but visual animation and streaming remain acceptance gates.

Reproduce: node tools/experiments/measure-canyon-day-reflection-20261023.mjs, then python tools/experiments/audit-canyon-day-reflection-20261023.py. Vite5190. Raw queries, frames and scene audits retained in benchmarks.json; device and p95 in summary.json. No production change.
