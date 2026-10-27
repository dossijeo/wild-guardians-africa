# Sabana background seam: isolated defect and finer proxy candidate

Found in current low-quality active motion (edf74541e), at the 20-second midpoint. A straight, striped vertical wall is visible behind the trees in both day/night images. It is easier to see at full resolution than in contact sheets. This is an unresolved continuity defect, not a grass density problem.

The existing diagnostic was parameterized with WG_DIAGNOSTIC_MOTION_FILE and a biome mismatch guard. Using the actual recorded camera/target, a frozen populated world and time 170, it renders before / seam hidden / restored. With the seam hidden, the exact wall becomes a blue opening. Near queues are empty and no renderer errors are recorded. The native/coarse-ground bridge is therefore covering a real height mismatch; removing it is not a solution.

Step32 versus step16 uses identical camera, target, near bounds, origin and chunk sets (insertion order differs). Both use current recipe, 720p, baja. The diagnostic override changes only the regional graphical proxy spacing, not authoritative terrain, original models, vegetation density or materials.

| Surface data | step32 | step16 |
| --- | ---: | ---: |
| Ground triangles | 5002 | 9376 |
| Bridge triangles | 2098 | 2012 |
| Maximum bridge height delta, all edges (m) | 1.721434 | 1.179688 |
| Ground + bridge attribute/index bytes | 308976 | 463872 |

The visible central wall becomes a much thinner residual line in the step16 image. Full-resolution step16 and the enlarged paired crop were inspected. Added geometry: 4288 triangles, 154896 bytes (~151 KiB of arrays, not total VRAM). No GPU timing was collected in these captures. Do not infer that this is free or already adopted.

Control restore: step32 before/restored RGB identical. Step16 differs in four pixels at [307,366,311,371], outside the inspected boundary; max channel difference102, whole-frame MAE0.000158/255. The boundary crop itself is identical before/restored. Preserve this small residual rather than asserting full byte equality.

Artifacts: sabana-seam-isolation contains original and seam-hidden renders; sabana-seam-step16 contains the finer candidate and step-comparison.png (step32 above, step16 below). Crops enlarge source pixels without relighting or generation. Both diagnostic.json files retain geometry details, effective URL and source reference.

Decision: retain step16 as a QA candidate only. Next required evidence is same-pose GPU A/B/A/B plus day/night motion with the finer proxy. sabana-seam-cost-pose.json freezes the comparison view. No change to the current review recipe or normal game defaults in this pass. Do not generalize the volcanic result without measuring Sabana.

Reproduce diagnosis using WG_CURRENT_REVIEW=1, WG_FIXTURE_BIOME=sabana, WG_COVER_QUALITY=baja, WG_DIAGNOSTIC_MOTION_FILE=docs/qa/global-visual-lab/current-review-20261025/sabana-current-motion-low/active-play.json, fresh WG_REVIEW_OUT, and WG_DIAGNOSTIC_GROUND_STEP=32 or16; run tools/experiments/diagnose-volcanic-ground-seam.mjs. The historical filename is retained for prior reports. Source syntax check passed; real renderer completed both captures.


## Measured candidate and review adoption

Stationary A/B/A/B on Intel UHD 0x9A60 / ANGLE D3D11, 720p/baja, same frozen populated fixture and saved oblique pose. A=32 m, B=16 m. Sixty warm frames, 360 authored frames plus 12 idle confirmation frames. All four have zero chunk creations during measurement, settled backgrounds, matching camera/target/workers/time, supported non-disjoint GPU timers (125 samples each), and no unexpected errors. Existing X4000 warnings remain.

| Run | GPU elapsed mean ms | Presentation mean ms | P95 ms | CPU render call mean ms |
| --- | ---: | ---: | ---: | ---: |
| A1 | 12.940 | 16.629 | 16.815 | 6.841 |
| B1 | 12.878 | 16.628 | 16.795 | 6.377 |
| A2 | 12.426 | 16.629 | 16.815 | 6.333 |
| B2 | 12.277 | 16.629 | 16.815 | 6.159 |

No observed presentation penalty in this view; small GPU differences do not establish a general speedup. GPU intervals include pipeline bubbles. CPU render is per measured call, not total main-thread time (A1 records 436 calls, the others373); do not claim a CPU optimization from those averages. Pose preparation elapsed is 2.138/2.229/2.224/4.936 seconds: variable asynchronous preparation, not synchronous CPU cost, and no loading-speed claim. Native regional worker times do not show a corresponding consistent increase. The experiment does not close all streaming-latency questions.

Fresh day/night 40-second motion captures with step16 completed under sabana-step16-motion-low: 1431/1181 observed frames, zero path deviations, moving workers, no sampled pauses or errors, final GL error zero. Both full-resolution midpoint images were inspected: the broad wall is reduced while grass and trees remain. Frame counts include recording overhead and are not benchmarks. Residual thin joins and other camera paths are not proven artifact-free.

Decision: select the finer proxy only for Sabana in globalCurrentReviewQuery with savannaGround=fine, alongside the existing volcanic selection. farGroundReviewOverrides maps each explicit flag only to its own native biome. Normal game profiles and other biomes retain their existing spacing. No authoritative terrain, placement rules, models, grass density or materials changed. The shared helper preserves the earlier volcanic option; it is not a second resource manager or scheduler.

Diagnostic step overrides remove both review flags so A/B controls remain effective. Three profile tests pass, including absent/off flags, cross-biome isolation and original default spacing; main.js syntax check passes. An integrated real-game capture under sabana-fine-integrated, without a source-profile response patch, matches the candidate camera, target, bounds, surface counts, bridge geometry and chunk set exactly. savannaGround=fine is in its effective URL, GL error0, no console errors, and its final full-resolution image was inspected.

Keep the modest memory/triangle tradeoff for the visible improvement. Validation here is baja and this representative path; medium/high performance, all seeds and every seam remain outside this result. The overall six-biome goal and draft PR are not declared complete.
