# Wild Renderer: audit and protocol

Branch codex/wild-renderer-wasm, isolated worktree based on 451b9e9bf. Three.js 0.180.0 remains the sole graphics backend. The prototype has no production imports. Wild Engine and simulation are unchanged.

## Spatial reuse and scope

asset-lod.js updates distance bins at 1.5 m camera quantization boundaries, regenerates local matrices and remaps coverage. asset-groups.js collects chunk-visible entries, constructs string stamps, transforms matrices and uploads compact groups. The experimental per-instance frustum adds the camera to the stamp and forces packing on camera motion. The moved kernel is matrix composition, conservative sphere/frustum testing (same 2.5 m margin), and packing. Entry maps, string stamps, upstream LOD selection and matrix regeneration remain JavaScript. Shadows retain their original independent selection.

Wild Engine already provides 48 m chunks and 40-byte Prop records with positions, occupancy radius, scale, yaw, slot, group and grid identity. spatial-savanna-payload.js and spatial-core-worker.js export these at chunk generation. scene.js retains them in propSources and LOD batches. nativeChunkBounds already caches bounds covering visual variants. The prototype reuses this organization; it adds no spatial tree and no per-frame engine query.

Occupancy radii are gameplay footprints, not visual bounds: height, asymmetric scale, LOD extents and animation margins require renderer geometry. The engine's changed-settlement chunks are not revisions for dynamic actor poses or camera LOD. Actors and crops follow separate renderer paths outside this native-prop packer.

Alternatives considered: the existing JS payload and renderer buffers already avoid regenerating world placement; compact engine exports would still need visual transforms and LOD selection; direct shared WASM memory would require allocator, lifetime and revision coordination between independent modules. None warrants additional coupling in this first experiment. Logical occupancy was rejected as a substitute for visual bounds for correctness. This is not an empirical claim that every possible engine-sharing design is slower.

## Implementation and reproduction

core.cpp is scalar C++17 compiled with Emscripten -O3 and FP contraction disabled. Float64 calculations preserve Three.js arithmetic; matrices and coverage use Float32 storage. Each color group is one batch call. Inputs copy only when source identity, version, offset or count changes. Three.js output BufferAttributes view WASM memory directly. This still requires GPU uploads. Fixed 64 MiB linear memory prevents detached views; live allocator bytes are reported separately. Retirement frees allocations. The unit test covers exact output with nonuniform scale, rotation, rebasing, visibility/matrix mutation, empty output and release.

Run tools/build-wild-renderer.ps1 with the Emsdk parameter, then node --test tests/wild-renderer.test.mjs. Start Vite on 127.0.0.1:5192. The harness requires Playwright and Chrome; image audit requires Python Pillow. Dependencies reuse the local lab node_modules junction (not tracked).

Run node tools/experiments/measure-wild-renderer.mjs with WR_OUT=docs/qa/wild-renderer/abba. Default ABBA, fresh pages, seed 712, low quality, 1280x720, day 150/night 350, coverage C wind8. Each measurement warms 180 frames, then collects 180 GPU-query frames and separately 360 cadence frames. Camera follows a fixed frame-indexed path. Simulation and material time are frozen. Screenshots occur outside timed blocks. Run python tools/experiments/audit-wild-renderer.py with the output path.

For the dense fixture also set WR_DENSE=1 and a different WR_OUT. It adds 300 crops, 24 workers, 16 animals, 3 buildings and 40 walls with actual renderer assets and waits for actors. This is a renderer stress fixture, not a naturally progressed campaign. Actor state stays frozen while the camera moves. Dense blocks warm 60 frames and measure 120 GPU / 180 cadence frames for both variants. Initial dense attempts were invalid: missing building health, then missing crop watering state stopped the app's UI loop (measurement timeout at frame zero). Both fixture defects were repaired and pre-measurement errors now abort immediately. These failures are excluded, not treated as performance results. Neither geometry nor density was reduced.

GPU timing covers the renderer query, not presentation. CPU excludes frozen simulation. Cadence measures render-entry intervals. Group timing includes both passes; pack timing combines transform/cull/packing. WASM kernel timing includes the call boundary. Input timing includes descriptors, cache checks and copies. Driver VRAM and full JS heap are not measured; object counts and linear bytes are not GPU memory.

The first complete dense ABBA (dense-abba) failed exact draw-count equivalence at one or two transition frames in several blocks; it is excluded from performance conclusions. The corrected dense-fixed-abba uses a fixed 1/30 s visual delta for both variants, preserving the same camera path and all objects. The ordinary Sabana series already passed exact per-frame camera/draw-count/triangle equivalence with the original app delta. No unmatched frames are selectively removed.

## GLES assessment

Emscripten supports the WebGL-friendly GLES3 subset with WebGL2, but calls still cross its JS binding and browser validation. Three.js caches GL state and owns resource lifetimes. Shared-context work requires explicit ownership and state-reset boundaries; independent resource caches cannot safely mutate each other's objects. Emscripten avoids writing a wrapper per GL call, but does not guarantee faster submission.

Sources: [OpenGL support](https://emscripten.org/docs/porting/multimedia_and_graphics/OpenGL-support.html), [WebGL optimization](https://emscripten.org/docs/optimizing/Optimizing-WebGL.html). Variant C is conditional on B improving the full frame.

## Current status

The original JS/WASM ABBA and persistent/event-lifecycle comparisons are complete.
See `EVENT-INTEGRATION.md` and the `abba`, `incremental-abab`, and `events-abab`
summary files. None establishes a consistent full-frame gain sufficient for
adoption. The dense-fixed-abba run also failed equivalence and remains excluded;
fixed delta alone did not repair the dense fixture. A later harness normalizes
simulation elapsed time, but the dense comparison must still be rerun.

The `engine` QA variant now captures native packed props at chunk delivery and
constructs matrices in C++, avoiding JS instance-record traversal in that step.
Its first smoke run has identical rendering counts, exact daytime pixels and six
nighttime pixels differing by one channel level. A fresh initial-WASM versus
Engine-packed A/B/A/B is in progress. Live mutations, dense scenes, source-memory
accounting and complete event integration remain unfinished. This is a working
experimental prototype, not a recommendation to adopt or a completed renderer.
