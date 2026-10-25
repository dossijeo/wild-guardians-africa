# Volcanic far terrain precision: diagnostic result

2026-10-25. The diagnostic no longer invokes initial loading depth warmup after moving an already loaded world. It waits for ordinary regional streaming to settle instead. This avoids the previously observed selected-program-disposed cancellation in these two runs; it does not prove that the lifecycle issue is fixed in production. The earlier failure is retained.

Matched seed 712, 720p, low quality, paused world, identical camera/target, near bounds, render origin and installed chunk keys. Both have zero console errors, final GL error zero and settled chunk queues. groundStep is changed only through a QA response route in the diagnostic; the normal game still uses 32. Both screenshots were inspected.

| Ground step | Maximum bridge height gap | Ground + bridge triangles | Attribute/index bytes |
|---|---:|---:|---:|
| 32 | 1.721434 | 6058 | 270264 |
| 16 | 1.179688 | 10360 | 426000 |

Step 16 reduces the conspicuous central vertical strip in the inspected daytime view, while retaining a nonzero height discrepancy elsewhere. Additional buffers: 155736 bytes, approximately 152 KiB. This is array payload, not a measurement of driver allocation or total VRAM. No extra draw call is required by the geometry density change, but GPU cost and generation latency have not been benchmarked.

Recommendation: retain step 16 as a candidate, not the default. Validate moving cameras, night and other boundary locations, and measure end-to-end CPU/GPU cost before adoption. Do not remove the edge bridge: the previous isolation test proved that doing so opens a sky gap. The approved lava/materials and all authoritative world geometry remain unchanged.

Artifacts: volcanes-ground-step-comparison.jpg/json; volcanes-seam-step32-streamed/ and volcanes-seam-step16-streamed/ contain full A/B/A bridge-isolation captures and exact geometry measurements. Reproduce with diagnose-volcanic-ground-seam.mjs and WG_DIAGNOSTIC_GROUND_STEP=32 or 16, using the environment documented in volcanes-seam-isolation/README.md. This is not an A/B/A/B performance benchmark.

## Moving camera candidate validation

volcanes-step16-motion-low contains real active-play day/night excursions using the existing 40-second path, seed 712, baja, 720p, sparse GL queries and groundStep 16 route override. Both pass audit-horizon-raised-motion-20261023.py: 1520 day / 1255 night observed frames, zero path deviations, moving workers, changing chunks, no sampled pauses, no console errors and final GL error zero. Day-4 and night-4 were visually inspected: the central stepped join is reduced compared with the step-32 captures. This does not prove all frames or all seams are artifact-free. Recording frame counts are not benchmarks.

The motion harness now records groundStep explicitly. The stationary benchmark harness accepts the same QA-only override and records it alongside quality/biome. A serial A/B/A/B GPU run is pending under volcanes-ground-step-cost-{a1,b1,a2,b2}; do not infer a performance result until all reports pass equivalence checks. No production profile change.

## Completed stationary GPU A/B/A/B

Intel UHD 0x9A60, ANGLE D3D11, 1280x720, baja. A=step32, B=step16; resident mask enabled in both. Each run: 60 warm frames, 360 paused measured frames, 121 GPU timer samples, no video recording. The verifier checks identical camera, target, hardware, worker state, time and options, zero chunk creation and settled far preparation. GPU disjoint=false in all runs. Known compiler X4000 warnings remain in raw reports; no other reported errors. A1/B1 final HUD screenshots were visually inspected with no obvious change to near terrain, buildings or lava.

| Run | GPU elapsed mean ms | Frame interval mean ms | Frame interval p95 ms | CPU render mean ms |
|---|---:|---:|---:|---:|
| A1 | 15.487 | 17.737 | 33.195 | 5.209 |
| B1 | 16.054 | 17.921 | 33.230 | 5.586 |
| A2 | 16.469 | 18.661 | 33.300 | 5.440 |
| B2 | 15.322 | 17.367 | 17.640 | 5.115 |

The sign of the difference reverses between pairs. There is no demonstrated consistent penalty and no demonstrated speedup. The B2 p95 drop crosses a presentation cadence threshold and is not evidence of a general optimization. GPU elapsed includes pipeline bubbles; CPU render is a measured scope, not total CPU frame time. Loading-ready observations were 26.20/26.40/26.99/26.25 s, but these warmed sequential runs are not a controlled cold-load benchmark.

This benchmark uses the normal populated camera, not the low oblique camera of the seam diagnostic. Additional projected ground during streaming, generation latency and all other camera positions remain outside its scope. Recommendation: keep step16 as a promising volcanic QA candidate; do not generalize to other biomes or claim the whole seam problem is closed. Reproduce verification with tools/experiments/summarize-volcanic-ground-step-cost.py. All raw reports and final screenshots are retained.

## Oblique A/B/A/B and review selection

The benchmark now accepts an explicit camera/target JSON, drains chunk and regional preparation, and only then begins its 60-frame warmup and 360-frame measurement. Pose preparation is timed separately and retains each regional worker build duration. Exact camera, target, options, time, worker state, hardware and settled-state checks pass for all four reports (summarize-volcanic-ground-step-cost.py volcanes-oblique-cost).

| Run | GPU elapsed mean ms | Frame interval mean ms | Frame p95 ms | Regional ground worker ms | Pose preparation elapsed ms |
|---|---:|---:|---:|---:|---:|
| A1 step32 | 11.797 | 16.628 | 16.810 | 975.79 | 6782.63 |
| B1 step16 | 11.546 | 16.628 | 16.810 | 992.09 | 2139.68 |
| A2 step32 | 11.624 | 16.630 | 16.815 | 978.94 | 2099.55 |
| B2 step16 | 11.335 | 16.627 | 16.825 | 977.30 | 2111.51 |

No observed frame-rate penalty. Small GPU differences do not establish a general speedup. The first pose preparation is much slower; sequential caches/driver preparation confound that comparison, so no loading-speed claim. The worker figure includes native far trees and other region work, not just terrain triangulation; it does not measure main-thread blocking. The B1 oblique HUD screenshot was inspected and retains the improved central edge.

Decision: select finer ground only for Volcanes in the current artistic review recipe via volcanicGround=fine. main.js supplies the existing profile override groundStep:16 only for the volcanic native biome when that flag is set. Normal game defaults and other biomes stay at 32. Explicit diagnostic step overrides remove the selection flag to preserve future A/B controls. No authoritative world or lava material changes. A real-renderer smoke capture through the new selection path, without response-patching the ground profile, is pending under volcanes-fine-integrated.

Integrated smoke completed: volcanicGround=fine is present in the URL, no ground-profile response patch was used, groundStep reports 16, and camera/target/bounds/surface counts/bridge geometry exactly match the prior step16 candidate. Final GL error zero, no console errors, and the screenshot was inspected. The opt-in review selection is retained.
