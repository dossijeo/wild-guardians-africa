# Volcanoes allocation-aware repeat — 2026-10-23

Source: 6eb6871f7b87361aa1653500f8aede265ac57d4f, experimental branch only. Intel UHD 0x9A60 / ANGLE D3D11, 1280x720, seed 712, populated saved fixture, full impostor/mountain background. No renderer change in this pass.

Reproduce in PowerShell with Vite on 5190:

```powershell
$env:WG_FIXTURE_BIOME='volcanes'
node tools/experiments/measure-biome-allocation-aware-20261022.mjs
python tools/experiments/audit-biome-allocation-aware-20261022.py volcanes
```

Medium/low/medium/low, day and night; each GPU and separate cadence pass uses 60 warmup and 90 samples. All 720 GPU queries valid; no captured errors, disjoint events, pending queries or changed simulation state. Camera and rendered workloads repeat exactly within quality. All 25 resident ground masks initialized before timing; chunk synchronization suspended during timing. The resource census only reads existing fade geometry registrations before timing.

| Profile/time | GPU mean first / repeat ms | CPU render mean first / repeat ms | Frame interval mean first / repeat ms |
|---|---|---|---|
| Medium day | 19.596 / 15.428 | 6.206 / 6.052 | 19.036 / 17.819 |
| Medium night | 16.332 / 15.984 | 5.266 / 5.502 | 17.630 / 18.044 |
| Low day | 16.840 / 13.815 | 5.712 / 5.634 | 16.632 / 16.624 |
| Low night | 14.708 / 13.754 | 5.482 / 5.354 | 16.628 / 16.632 |

Medium: 323 geometries / 110 textures in every repeat, 17 registered fade geometries with 2,968,258 nominal buffer bytes. Low: 298 / 108, 13 registered fade geometries with 2,444,942 nominal bytes. Nominal payload is not total VRAM. The old one-geometry discrepancy did not recur; its exact historical cause remains unknown. Acceptance here does not require relaxing total resource equality.

Current final-pass workload: medium day 88 calls / 326925 triangles, night 84 / 340140; low day 82 / 300688, night 79 / 316385. IMPORTANT: these totals differ substantially from the earlier provisional benchmark (medium day 103 / 603243). Equal repeats prove current-run consistency, not equivalence to that historical scene. Reconcile the workload difference with fresh screenshots and pass attribution before treating this as a replacement historical baseline or claiming a speedup. Earlier medium/low visual captures do not establish current-frame visual equivalence.

Recommendation: preserve medium artistic direction; do not change renderer or density from these numbers. Low costs less GPU here, but changes quality. First-to-second medium daytime GPU drift is 4.168 ms, so do not attribute all paired differences to quality. No FPS improvement claim. This is a paused resident measurement excluding simulation, streaming and active camera motion. Next: current populated visual captures and workload attribution, then active volcanic lava/streaming validation. Global goal remains open.

## Follow-up: workload explained

See ../volcanes-instance-culling-review-20261023/README.md. A one-flag control reproduces 603198 -> 326925 game-view triangles, while six current static image pairs differ by at most eight pixels. The old benchmark predates the production instance-culling merge. This explains the major workload reduction without removing approved art. It does not establish a historical GPU speedup or active streaming correctness.
