# Raised mountain base: Sabana cost

Sourceeb7f13815,Intel UHD0x9A60,ANGLE D3D11,1280x720,medium,seed712,frozen populated save. Same shallow-angle pose from horizon-review,8m camera sweep and deterministic wind. ABAB,60warmup+90samples, GPU and cadence separate. Original base-35 versus raised-10; other art unchanged. No concurrent recording/build.

|Pass|Phase|GPU mean ms|GPU p95 ms|CPU render mean ms|Frame interval mean ms|
|---|---|---:|---:|---:|---:|
|A1|day|12.099|15.331|8.408|17.462|
|A1|night|12.152|14.738|8.422|18.698|
|B1|day|12.810|16.544|9.260|20.271|
|B1|night|12.616|15.930|7.530|17.131|
|A2|day|12.085|14.996|8.403|16.811|
|A2|night|12.379|15.495|8.161|17.859|
|B2|day|11.962|15.064|8.387|16.809|
|B2|night|12.999|15.970|8.759|19.357|

GPU B-A day:+0.711 then-0.123ms; night:+0.464/+0.620ms. Retain the visible improvement for motion review; no performance improvement or zero-cost claim. Exposing more backdrop pixels can increase fill cost despite unchanged mesh/atlas/pass count. This comparison does not isolate fill cost from all other camera-driven work.

720valid GPU queries, no disjoint/discarded/unresolved samples, GL/browser errors or simulation advance. Same camera paths,state,device/resolution and initial resource counts. Repeated workloads are NOT perfectly identical:1-4frames differ, up to3651triangles and0.0265% relative absolute total-triangle delta. Corresponding details are in summary.json. Do not attribute every sub-millisecond difference solely to the backdrop.

No new source implementation. Night/day are separate lighting states of the same saved scene. Headless RAF intervals are not a promised gameplay FPS. Gran Rio has visual comparison but has not been benchmarked by this run.

Reproduce with Vite5190:
```powershell
$env:WG_FIXTURE_BIOME='sabana'
node tools/experiments/measure-horizon-raised-20261023.mjs
python tools/experiments/audit-holly-fern-shadow-profiles-20261023.py docs/qa/global-visual-lab/sabana-horizon-raised-cost-20261023
```
