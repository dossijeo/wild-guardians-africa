# Inhabited Canyon: controlled resident-resource benchmark

Run measure-canyon-populated-resident-20261022.mjs then audit-canyon-populated-resident-20261022.py. Intel UHD0x9A60/ANGLE D3D11,1280x720,seed712, saved12-crop/two-worker scene, native normal Canyon camera, selected closure recipe/full backgrounds. Media/baja/media/baja,day/night,60warmup+90samples per GPU/cadence pass. Before warmup, QA initializes all25 resident ground masks in both profiles. This removes allocation-history variability identified by canyon-texture-lifetime-20261022; no production rendering changes.

Strict audit passes:720 GPU samples, no disjoint/discard/overflow/allocation/unresolved/context/GL/page errors. Saved state, camera, chunk keys, origin,target,objects,resources and draw workload match within each quality repeat. Resource counts medium152 geometries/95textures,low124/93. Full-frame draws medium64/534500triangles,low60/482801. Counts are not VRAM byte measurements.

| Profile | Phase | GPU mean first/repeat ms | GPU p95 first/repeat ms | CPU render mean first/repeat ms |
|---|---|---|---|---|
| Medium | Day |15.756 /15.509|17.511 /16.961|5.197 /5.158|
| Low | Day |14.915 /14.594|16.534 /16.798|5.481 /5.220|
| Medium | Night |18.545 /18.040|21.928 /22.287|5.029 /4.943|
| Low | Night |15.690 /16.313|18.306 /19.015|4.922 /5.229|

Low saves0.841/0.915ms GPU daytime and2.855/1.727ms nighttime; CPU differences mixed. Mean cadence intervals16.63–19.53ms are also recorded with p95 in summary.json, measured separately from GPU queries. Do not add CPU+GPU times or turn these paused cadence measurements into gameplay FPS. Low intentionally changes shadows/LOD, so this is profile viability, not equal-image optimization. Preserve medium as artistic reference; low remains an optional quality compromise.

Limitations: fixed camera, paused simulation/material clock,resident chunks with syncChunks suspended during samples. Excludes active play, streaming, world changes and upload preparation cost. Water animation/dolly is separately reviewed in canyon-populated-water-motion-20261022, not timed here. Earlier frozen-cost run remains provisional; this successor provides controlled evidence without retroactively validating it. No claim all six-biome performance work is complete.
