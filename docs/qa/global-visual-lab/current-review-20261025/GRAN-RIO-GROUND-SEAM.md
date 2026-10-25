# Gran Rio: finer distant ground selected after measured review

Decision: select step16 only for Gran Rio in the experimental review recipe, via riverGround=fine. The ordinary game default remains32; other biome flags are unchanged. This is a visible continuity improvement with a small measured cost, not an FPS optimization. No authoritative terrain, vegetation density, model silhouettes, materials or navigation rules changed.

## Defect and isolation

Full-resolution day/night midpoint images in gran-rio-resident-mask-validation show a straight striped terrain wall behind the trees. Frozen diagnosis uses that recorded camera/target and time170, media720p. Hiding the regional seam replaces the same strip with blue background; queues are empty. Both step32 and step16 before/restored controls are RGB-identical. Thus the bridge fills a real near/proxy height mismatch; simply removing it is rejected.

The finer proxy greatly reduces the strip in the same camera. Camera, target, bounds, origin and chunk sets match; asynchronous insertion order is irrelevant. The edge-comparison image shows step32 / seam hidden / step16 from top to bottom, cropping source pixels [475,235,675,275] without relighting.

| Geometry | step32 | step16 |
| --- | ---: | ---: |
| Ground triangles | 5570 | 9944 |
| Bridge triangles | 2124 | 2040 |
| Maximum bridge height delta, all edges (m) | 1.670512 | 1.179688 |
| Ground + bridge attribute/index bytes | 330984 | 486000 |

Added4290triangles and155016bytes (~151KiB of arrays, not full VRAM). Residual joins are not claimed eliminated across every camera.

## A/B/A/B GPU comparison

Intel UHD0x9A60 / ANGLE D3D11, Chrome, media1280x720, same frozen populated fixture and oblique pose. A32/B16/A32/B16,60warm frames,360authored frames plus12idle confirmation frames. All four have zero chunk creation during measurement, settled backgrounds, unchanged simulation elapsed and matched workers/camera/target/options. GPU timers supported,125valid samples each, no disjoint; no unexpected errors beyond retained X4000 warnings.

| Run | GPU elapsed mean ms | Presentation mean ms | P95 ms | Max interval ms | CPU render call mean ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 | 13.536 | 16.627 | 16.820 | 17.160 | 6.789 |
| B1 | 13.692 | 16.673 | 16.835 | 33.180 | 6.836 |
| A2 | 13.811 | 16.629 | 16.825 | 19.270 | 6.950 |
| B2 | 13.940 | 16.628 | 16.830 | 17.350 | 7.078 |

Observed GPU increment0.13-0.16ms, about1%, is accepted for the visible improvement. This small series cannot establish the exact general overhead. B1 misses one presentation interval; it is retained, not hidden behind the mean. The second pair does not reproduce that maximum. CPU means are per render call, not total frame CPU; all have373calls. GPU elapsed includes pipeline bubbles.

Pose preparation elapsed2.222/4.136/3.476/2.023seconds is variable asynchronous work. No loading-speed claim; regional worker build observations981/970/930/891ms do not show a consistent generation penalty. These times include other regional work, not terrain triangulation alone.

## Active motion and integrated path

Fresh40-second day/night recordings in gran-rio-step16-motion preserve live simulation, workers, wind, impostors and mountains.1125/964observed frames, zero path deviations, no sampled pauses or errors, final GL error0. Full-resolution midpoint images were inspected: foreground grass, shadows and trees remain; the background wall is reduced by day and night. Video frame counts include recorder overhead and are not FPS measurements. Night continues day state; these are not exact simulation-state A/B pairs.

Integrated capture gran-rio-fine-integrated uses riverGround=fine without source-profile patching. It matches candidate camera/target/bounds/origin/geometry/surface counts/chunk set, records groundStep16 and GL0, no console errors. Its full-resolution image was inspected. The review override helper explicitly scopes each flag to its native biome; all three profile tests pass. Diagnostic overrides clear the review flags to preserve honest future A/B controls.

## Reproduction and limits

Diagnosis: WG_CURRENT_REVIEW=1, WG_FIXTURE_BIOME=gran-rio, WG_COVER_QUALITY=media, WG_DIAGNOSTIC_MOTION_FILE=docs/qa/global-visual-lab/current-review-20261025/gran-rio-resident-mask-validation/active-play.json, fresh WG_REVIEW_OUT; run diagnose-volcanic-ground-seam.mjs. Set WG_DIAGNOSTIC_GROUND_STEP=32/16 for controls, omit for integrated selection.

Benchmark: check-spatial-thread-game.mjs with WG_THREAD_PORT=5190, WG_CURRENT_REVIEW=1, WG_THREAD_BIOME=gran-rio, WG_THREAD_QUALITY=media, WG_THREAD_FROZEN=1, WG_THREAD_RETAIN_APP=1, WG_FRAME_SCHEDULER=1, WG_THREAD_BENCH=1, WG_THREAD_GPU=1, WG_THREAD_FRAMES=360, WG_THREAD_DISTANCE=0, WG_THREAD_POSE_FILE pointing to gran-rio-seam-cost-pose.json. Alternate WG_DIAGNOSTIC_GROUND_STEP=32/16/32/16 and fresh report names. Validate retained reports with summarize-volcanic-ground-step-cost.py gran-rio-seam-cost.

This validates a representative media view and excursion, not all seeds, camera angles, profiles or the full six-biome objective. Keep the approved vegetation and modest geometry tradeoff; do not infer a solution to the separately measured native streaming CPU spikes.
