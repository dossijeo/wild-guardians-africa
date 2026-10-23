# Wild Engine pthread generation - active investigation

Priority supersedes graphical optimization until validated. Worktree: wild-guardians-global-visual; branch codex/global-visual-lab; starting commit aa75ac5ab. PR 159 stays draft, main untouched. The interrupted settled graphical ABAB run is not evidence; its harness edit is parked, not part of this change. Fixed512, fern LOD and approved artwork remain unchanged.

## Measured synchronous baseline

| Biome | add CPU ms | populate | raster | sector overlay fill | graph commit | select again |
|---|---:|---:|---:|---:|---:|---:|
| Sabana | 57.33 | 1.70 | 43.02 | 11.12 | 1.33 | 1.29 |
| Desierto | 45.88 | 2.24 | 31.49 | 10.95 | 1.10 | 1.88 |
| Gran Rio | 54.39 | 1.66 | 40.38 | 10.74 | 1.32 | 1.41 |
| Volcanes | 62.49 | 1.69 | 46.97 | 12.10 | 1.57 | 1.65 |
| Manglares | 83.80 | 2.50 | 69.09 | 10.77 | 1.30 | 2.40 |
| Gran Canon | 69.05 | 2.22 | 52.80 | 12.44 | 1.36 | 1.92 |

Three runs, eight measured fresh chunks per biome, seed 712, Chrome headless on the current machine. Six native movement profiles enabled. The real session initially builds worker and warthog profiles and activates others lazily; these six-profile stress values must NOT be equated with the earlier ~47.5 ms in-game mean. Rendering and simulation are absent. The RAF gap witnesses blocking, not game frame time. Phase rows overlap: populate includes its subphases; sector fill/graph are nested within commit/border totals. Instrumented clock precision is limited by the nonisolated baseline page. No GPU, streaming installation or simulation performance claim follows from this test.

Mangrove spends most time preparing static navigation rasters, not generating render buffers. refreshSector additionally loops over cells/edges and current barriers/polygons; lazy_commit_sector then floods components, updates route revision and rebuilds neighbor/portal edges. Moving populateChunk alone would leave almost the entire problem intact.

## Ownership audit and proposed boundary

- populateChunk mutates selected chunk coordinates, lattice, ponds, visible/solid props, buckets, heights/colors/water/masks, and resident registries. It consults seed/biome, settlements and suppressed props. These globals cannot be called concurrently as they stand.
- buildActiveRaster uses selected profile radius/worker and local sampling scratch, then inserts into live profile rasters. Separate pure preparation from insertion. Workers must never call selectProfile/lazy_select_context on the live world.
- refreshSector applies current overlays and border availability. Prepare from an immutable local input snapshot, with revisions for settlements, suppression, profiles, obstacles and neighbor dependencies. Validate at publication; obsolete results are discarded or rescheduled, never overwrite newer edits.
- Keep one live authority and one shared memory. Per-job scratch/output is not a second live world. Avoid copying all resident registries. Seed/biome immutable job values; only relevant settlements/removed props/overlay bounds and immutable neighbor data should be retained as dependencies.
- Main thread remains owner of live navigation mutations and queries. Use release/acquire publication of finished job ownership; no main-thread pthread_join, condition wait, or long mutex lock. Cancellation is logical and workers release their own incomplete output. Shutdown must account for work before destroying memory/runtime.
- Chunk incorporation must consume prepared buffers without populateChunk regeneration. Existing spatial_select_chunk also regenerates visual data (~1-2.4 ms here); selected payload ownership needs redesign rather than calling it after a successful job.
- Publication must batch or precompute graph work if the remaining ~1.3 ms plus neighbor fixup is too expensive. Current per-sector revisions and portal semantics must remain correct, not merely numerically similar.
- Existing proposed-wall preview can instantiate a separate scratch world. That is an existing preview behavior, not an acceptable generation-thread design. Its synchronous API and module expectations require compatibility review when replacing the main loader.

## Implemented in this checkpoint

Optional compile-time profiling (SPATIAL_PROFILE=1), with no profiling code in default builds; reproducible browser phase benchmark; six-biome visual-payload hash equivalence against existing production WASM. This is not full navigation equivalence.

Optional SPATIAL_PTHREADS=1 build emits Emscripten modular ES runtime, one preloaded pthread worker, shared memory, and disallows main-thread blocking. Output defaults to a different runtime file; the production standalone binary is not overwritten. Browser boot succeeds under actual COOP/COEP headers: SharedArrayBuffer true, 16 MiB, pool 1, Mangrove 265 props / 16 worker sectors. Node boot also succeeds. Generation still runs synchronously in this smoke probe: parallelism is NOT yet implemented or claimed. Emscripten warns about pthreads plus memory growth performance; explicit growth/memory-view validation is pending.

## Reproduce

Emscripten 6.0.12 in /opt/emsdk via WSL. From repo:

```sh
source /opt/emsdk/emsdk_env.sh
SPATIAL_PROFILE=1 SPATIAL_WASM_OUTPUT=tools/experiments/spatial-profile.wasm bash tools/build-spatial-savanna-wasm.sh
SPATIAL_PTHREADS=1 SPATIAL_WASM_OUTPUT=tools/experiments/spatial-threaded.mjs bash tools/build-spatial-savanna-wasm.sh
```

With existing Vite on 5190: node tools/experiments/benchmark-spatial-pthread-baseline.mjs (set WG_THREAD_BASELINE_OUT to a fresh folder); node tools/experiments/check-spatial-profile-equivalence.mjs. Runtime boot: node tools/experiments/check-spatial-pthread-runtime.mjs (temporary local isolated HTTP server, closed afterward). Generated profiling/runtime binaries in tools/experiments are rebuildable outputs, not production assets.

## Acceptance still open

Real off-main chunk/raster/overlay preparation; revision-safe publication; event/priority/cancellation integration; retained route correctness during edits and unloading; save/load and game teardown; real-game ABAB in six biomes with streaming and active actors; main-thread/GPU installation p95/max; memory/stacks/scratch/peaks; Vite production packaging; nested itch build and actual deployment; Windows Tauri/WebView2 plus supported-platform fallback. Do not mark this task complete based on the runtime smoke test.

Sources: [Emscripten pthreads](https://emscripten.org/docs/porting/pthreads), [compiler settings](https://emscripten.org/docs/tools_reference/settings_reference.html), [Tauri isolation headers](https://v2.tauri.app/security/http-headers/). Pthreads require isolation and Emscripten runtime support; Tauri documents response headers but actual WebView2 packaging still needs verification.

## Preparation/publication boundary checkpoint

The C++ pipeline now separates selected terrain/prop preparation from resident registration, returns an owned ChunkRaster before installing it, and separates sector overlay filling from lazy graph commit. PreparedChunkData owns the generated visual, sampling and prop buffers and transfers them by move; selecting this prepared result does not call the procedural generator. The synchronous route exercises the same ownership handoff so it is testable before threading. This is a refactor, not yet a performance claim.

A new differential test compares the rebuilt module to the untouched production WASM in all six biomes and six navigation profiles. Seven mutation stages per biome cover a new wall, wall removal, settlement change, suppression, unload and reload. Each stage hashes a 101x101 grid of walkability and directed edges per profile and compares selected cross-chunk route points, connectivity, route revisions and resident counts. All 42 stage comparisons pass; visual payload hashes also still match. This is broader than visual equality but is still synchronous, not evidence of race freedom.

Reproduce after the profiled build: node tools/experiments/check-spatial-preparation-equivalence.mjs. The generated report is preparation-equivalence.json.

Next required boundary: procedural sampling still reads live generation inputs and selected scratch. It must receive a private worker workspace plus immutable job inputs before pthread dispatch; the current functions must NOT simply be invoked from a second thread. PreparedChunkData.nearbySettlements currently holds indices into the selected generation inputs; snapshots must preserve/remap that ownership. Publication still copies into resident maps and graph operations still use live profiles. Cancellation, revision validation, runtime integration and all distribution/real-game acceptance gates remain open.
