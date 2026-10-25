# Ordered impostor static cost — Intel UHD

Single-world ABAB: unsorted alpha / opaque+ordered alpha / unsorted alpha / opaque+ordered alpha. Mangroves seed 712, media 1280x720, fixed oblique camera, paused simulation, full 2D background, native blue water/moss. Same instances/material inputs; the candidate changes overlap composition and adds an opaque draw. Standby alpha unchanged.

60 warmup + 90 samples per phase and measurement mode. GPU elapsed queries and CPU/cadence measured separately. 720 valid GPU samples, no disjoint/discarded queries, state unchanged and no reported GL/page errors. Cameras and workloads repeat exactly within each variant across both runs.

| Pair / phase | GPU mean, original -> ordered | CPU render submission | Frame interval |
|---|---|---|---|
| 1 day | 22.211 -> 22.486 ms | 4.592 -> 4.791 ms | 23.778 -> 25.252 ms |
| 2 day | 22.142 -> 22.611 ms | 4.459 -> 4.567 ms | 23.251 -> 23.678 ms |
| 1 night | 23.519 -> 25.484 ms | 4.646 -> 4.698 ms | 26.103 -> 26.410 ms |
| 2 night | 24.034 -> 23.020 ms | 4.749 -> 4.342 ms | 25.949 -> 23.183 ms |

Daytime adds 0.28/0.47 ms GPU in these two pairs. Nighttime is inconsistent (+1.96/-1.01 ms); no overall speedup claim. Keep the candidate for its demonstrated order stability, then optimize and broaden validation.

Workload is deliberately different: 66 calls / 460843 triangles -> 70 / 463045 (+4 calls, +2202 triangles). No elements removed to gain speed. Geometries rise from 232 to 236 on first candidate use and remain cached when toggled off; textures stay 121. These are renderer counts, not measured VRAM bytes, and caching both variants means this is not an isolated memory comparison.

Static camera skips most repacking. This does not benchmark moving CPU sorting/uploads, streaming, long-distance resource lifetime, other biomes or modest quality. syncChunks is suspended during timing. Existing scene.png files are context views, not exact synchronized pixel-difference controls; use the dedicated ordered transition captures.

Reproduce (Vite port 5190, WG_REVIEW_BIOMES=manglares):

```sh
node tools/experiments/measure-far-ordered-static-cost-20261022.mjs
python tools/experiments/audit-far-ordered-static-cost-20261022.py
```

Raw data in benchmarks.json, p95/means/device/counts in summary.json. Device: Intel UHD 0x9A60 via ANGLE D3D11. Chrome headless on this host.
