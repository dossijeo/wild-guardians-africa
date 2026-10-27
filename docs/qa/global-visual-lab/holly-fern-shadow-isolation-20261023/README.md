# Isolated native fern shadow cost

Diagnostic only; native selected appearance is unchanged. Compare shadows ON/OFF for exactly the same native fern layer, geometry, normals, wind, density, masks,2048 global solar map and balanced ground. OFF removes fern cast/self shadows and is not a proposed replacement.

Intel UHD0x9A60, ANGLE D3D11, Chrome headless,1280x720,medium,seed712,frozen populated save, full background and instance culling. Moving camera8m, deterministic advancing wind. A/B/A/B,60warmup+90samples, GPU and cadence separately. No concurrent capture/build/encoding.

|Pass|Phase|GPU mean ms|GPU p95 ms|CPU render mean ms|Frame interval mean ms|
|---|---|---:|---:|---:|---:|
|ON1|day|22.360|26.253|8.974|29.127|
|ON1|night|24.443|31.731|10.081|35.142|
|OFF1|day|20.069|28.200|6.590|24.367|
|OFF1|night|19.918|25.558|6.871|26.034|
|ON2|day|21.983|28.456|7.773|27.932|
|ON2|night|23.486|31.311|7.877|28.472|
|OFF2|day|23.353|30.737|6.742|25.907|
|OFF2|night|19.977|29.208|6.449|25.796|

## Verified scope

- Same per-frame visible fern counts and cameras across all variants. Geometry, spacing, chunks, buffers and initial geometry/texture object counters also match. Both maps remain2048. Only fern castShadow changes.
-720 valid GPU queries, no disjoint/discarded/unresolved queries or recorded GL/JS errors. Simulation state unchanged. Repeat draw/triangle sequences match exactly for each variant and phase.
-With fern shadows:304-305 whole-map redraws,0cache hits per complete measurement pair. Without:38redraws,266-267hits. Counts include warmup and separate GPU/cadence passes; they are not90-frame-only counts.
-CPU render ON-OFF savings:2.384/1.031ms day and3.210/1.428ms night. This includes shadow-cache CPU work and command submission; it does not isolate those two components.
-GPU day ON-OFF:2.291ms then-1.370ms. Night:4.525/3.509ms. Day fluctuation prevents a stable day-GPU saving claim. Do not convert headless frame intervals into guaranteed game FPS.

## Visual assessment and decision

[Same-scene captures](shadow-ablation.jpg) show reduced contact/self shadowing in the OFF diagnostic. Keep the selected shadowed fern appearance. The test supports investigating shadow update preparation and whole-scene redraw coupling, not reducing fern density or removing shadows.

Current native shadow cache combines every caster into one map. The fern depth contract includes wind time and camera position, both changing in this test. Therefore simply caching the previous map would leave stale wind, camera-dependent LOD/fade and selected-instance shadows. Any future optimization must retain those invalidations or provide an independently validated shadow representation. Previous resident-proxy/versioned-buffer experiments do not automatically prove this native configuration is faster.

This is diagnostic evidence, not a production optimization, final biome closure, active-campaign test or long-duration memory test. No renderer,simulation,main or approved-art changes.

## Reproduce

With Vite5190:
```powershell
node tools/experiments/measure-holly-fern-shadow-isolation-20261023.mjs
python tools/experiments/audit-holly-fern-shadow-profiles-20261023.py docs/qa/global-visual-lab/holly-fern-shadow-isolation-20261023
python tools/experiments/audit-holly-fern-shadow-isolation-20261023.py docs/qa/global-visual-lab/holly-fern-shadow-isolation-20261023
```
