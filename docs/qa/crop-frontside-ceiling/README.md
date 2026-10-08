# Unrepaired original crops: FrontSide GPU ceiling

2026-10-08, production source baseline `7823cf6f3bf27933d9ec1cc24b64ad8ebd6cd90c`.

Decision: continue investigating selective repair or purpose-built derivatives. The raw FrontSide ceiling is meaningful in a crop-heavy view, but repaired models must earn their own net benefit. Missing back surfaces are deliberately allowed **only in this diagnostic**. No assets or production renderer were changed or promoted.

## Isolated dense crop scene

`tests/browser/crop-frontside-ceiling.html`: 1,600 plants, 200 of each of the eight native species, fixed six growth ratios including native bridge transitions, 3,922,467 submitted crop triangles per geometric pass. Native crop batch, original production meshopt GLB (no repair/reindexing), original bridge data, growth/wind shaders, African Toon and day HDR environment. Wind clock frozen at 17; fixed perspective camera. No ground, workers, buildings, simulation, HUD or save writes.

Intel UHD Graphics via ANGLE/D3D11, WebGL2, MSAA enabled, 1280×720 drawing buffer, native media 1024² shadow map. A = original `DoubleSide`, B = forced `FrontSide`. Color `side`, explicit `shadowSide` and native custom-depth `side` change together. Materials/UVs/textures/geometry/instances remain otherwise unchanged. Pools/counters/instance attribute versions are checked every measured frame; original sides are restored afterwards.

Each path uses `ABBA` then `BAAB`, four AB/BA pairs: 30 warmup frames per block, 120 measured queries, 480 samples per arm/path. Both arms and every pass are compiled/warmed before measurement. Queries are asynchronous, non-overlapping `EXT_disjoint_timer_query_webgl2`; all 3,840 samples resolved, zero disjoints/discards/overflows/foreign queries/allocation failures, GL error 0.

| GPU elapsed path | DoubleSide mean ms | FrontSide mean ms | Saving |
|---|---:|---:|---:|
| Total isolated scene, shadow recalculated | 64.236 | 58.398 | 5.838 ms / 9.09% |
| Color, existing shadow map sampled | 42.468 | 36.464 | 6.004 ms / 14.14% |
| Crop custom-depth draw | 22.587 | 22.711 | −0.124 ms / −0.55% |
| Native shadow generation | 24.450 | 24.405 | 0.045 ms / 0.18% |

All four total/color pairs favor FrontSide. Total paired savings range 6.58–12.08%; color 12.78–15.40%. Depth/shadow pairs change sign and do not establish a useful benefit. Submission calls and triangles match exactly across sides. Backface culling reduces rasterization, not submitted triangle counts.

The total includes color and regenerated shadows, **not** the separate depth diagnostic. Color keeps shadow lookup active but prevents regenerating the map during its queries. Shadow queries surround the native shadow hook inside `renderer.render`, never a standalone shadow draw outside Three's render state. Depth uses the crop's actual growth/bridge `customDepthMaterial` at 1280×720, with shadows disabled; it is not a measurement of the complete world's VFX depth-capture scheduling. Passes were measured in separate runs; their times must not be added as if they were nested components of a single frame.

## Full WorldScene confirmation

`tests/browser/crop-frontside-world.html`: existing archived Sabana/Mapungubwe day-101 farm, 1,122 living crops, 36 workers, original buildings/terrain/props and native renderer. Snapshot SHA and unchanged serialized logical state verified. QA changes its time to 120 for daylight without advancing simulation. Native camera constraints settle the overview; actual drawing buffer is **1600×900** because native media resize restores the profile DPR. This differs from the isolated scene and is reported rather than normalized after measurement. Shadow cache disabled equally for both arms. No crop-only hiding or geometry replacement.

Both independent runs use `ABBA` + `BAAB`, 30 warmup and 90 measured frames/block. Each has 720 resolved GPU queries, all counters clean and GL error 0. Crop geometry/instance versions, camera and resident chunk keys remain invariant; total submissions match across arms. Original sides/logical state restored at the end. All raw samples, including the initial noisy run, are retained.

| Full-world run | DoubleSide mean ms | FrontSide mean ms | Saving |
|---|---:|---:|---:|
| Initial | 88.370 | 74.506 | 15.69% |
| Independent repeat | 80.653 | 73.935 | 8.33% |

The initial series has a substantial temporal shift in one pair (28.03% apparent saving). Its aggregate 15.69% should not be used alone. Across **all eight pairs**, the median relative saving is **10.48%**; every pair favors FrontSide (range 6.74–28.03%). Combining every sample gives 84.511→74.220 ms, 12.18%, but the pair median is the more cautious decision signal. Clock/thermal/system load was not locked. Four long CPU campaigns continued; the repair agent reserved the GPU and no concurrent agent render was launched. These are GPU elapsed query results, not FPS, CPU-active-time, mobile, or a hardware-independent claim. Native shader compiler warnings are archived separately; no shader error/context loss occurred.

## Consequences for repair

There is enough color-pass headroom to justify representative candidates. Recreating both sides of leaves can restore the fragments the raw test deliberately removes and increase vertex/shadow work. The repaired result therefore cannot inherit this ceiling. Prioritize repairs/retopology that preserve required coverage with low or negative triangle growth; compare selective FrontSide solids plus genuinely double-sided foliage when useful. The earlier 28% triangle-growth candidate remains unapproved. Recheck complete repaired categories, multiview visual thresholds, rig/animations/morphs, size/memory and **net** GPU performance before PR/integration.

User subsequently authorized repairs **or purpose-built derived models based on the originals**, choosing whichever works best under those gates. The repair agent was informed and GPU reservation released after both runs were closed.

## Reproduce and evidence

Run Vite from main, open the isolated fixture in a visible browser, click Run. For the full-world fixture, first copy identical bytes from `docs/qa/intensive-sabana-mapungubwe-e461b550/state.json.gz` to `.cache/crop-frontside-world-state.bin`; the `.bin` avoids the server/browser's implicit `.gz` decoding. Use a 1280×720 CSS viewport and the visible Run button. Do not open another GPU scene during samples.

- `results.json`: every isolated GPU query, per-block submissions/statistics, renderer/context and restoration receipt.
- `world-results-initial.json`, `world-results.json`: both complete native series; none discarded.
- `provenance.json`: original/runtime GLB, bridge, shader/runtime/fixture and report SHA-256 contracts.
- `background-cpu.json`: identified concurrent campaign processes.
- `original-dense-farm.png`, `native-dense-farm.png`: contexts before timing; completion screenshots show original sides restored.
- `setup-failed.json`: initial instrumentation setup failed before recording any measured block. The hook was corrected before valid data collection; it is not a GPU result.

Run `node docs/qa/crop-frontside-ceiling/verify.mjs` to verify query counts/counters, arm order, submission equality, snapshot and source hashes, and restoration receipts. Browser viewport/visibility were reset and both working QA scenes disposed/closed. The fixture/scripts live outside the shipped public game.
