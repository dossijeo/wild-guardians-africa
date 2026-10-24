# Wild Engine pthread generation - active investigation

Priority supersedes graphical optimization until validated. Worktree: wild-guardians-global-visual; branch codex/global-visual-lab; starting commit aa75ac5ab. PR 159 stays draft, main untouched. The interrupted settled graphical ABAB run is not evidence; its harness edit is parked, not part of this change. Fixed512, fern LOD and approved artwork remain unchanged.

## Reading this report

The sections below are a chronological experiment log. Statements such as "not yet implemented" describe their checkpoint, not the latest runtime. Current code has real shared-memory pthread generation, revision-safe publication, cancellation and asynchronous shutdown, with standalone fallback. The remaining work is end-to-end stutter reduction and broader validation; the task is not closed. Recent acceptance evidence starts at "Completed six-biome equivalent-work ABAB" and subsequent sections. Package reports identify the source checkpoint they actually validate and must not be treated as acceptance of later binaries.

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

## Real pthread preparation checkpoint

The threaded build now has one persistent native preparation thread and a single-job mailbox inside the same WASM memory. Sampling scratch/configuration is thread-local only in pthread builds. The job captures relevant settlements, suppression keys for the procedural cell bounds, up to nine neighboring relief samples and enabled profile parameters. It does not clone the authoritative world, navigation graph, barriers or entity simulation. The worker uses private buffers for terrain, props and six static navigation rasters; its result is owned by the caller after a release/acquire handoff. Main-thread entry points do not wait on the worker. Only the worker performs futex waits.

The API is currently preparation-only and is not installed into the game stream. In particular it has no publication call: stale snapshots cannot currently overwrite the live world. Version validation, world-reset handling, priority scheduling and publication remain required before integration. Sector overlays/graph incorporation are still to be prepared or bounded separately. Worker result nearby-settlement indices refer to its local input snapshot; publication must recompute/remap them against current accepted inputs, not use them as live indices.

WG_PREPARE_TEST=1 node tools/experiments/check-spatial-pthread-runtime.mjs runs actual concurrent generation in Chrome with COOP/COEP. It asserts native worker identity, SharedArrayBuffer storage, exact visual output and all three static raster arrays for six authored profiles in each of six biomes. While the job runs, the main thread queries surfaces/walkability/routes, regenerates its selected chunk scratch, and adds a wall. Its original buffers and route remain unchanged; the wall survives. A pre-suppressed prop stays suppressed in both paths. The test then cancels an actually running job, reuses the worker, shuts it down asynchronously and waits until Emscripten returns it to the pool. No main-thread pthread join or wait is used.

See thread-preparation.json. Admission is sub-millisecond in this probe (first job includes pthread creation), while chunk work takes tens of milliseconds on the worker and query batches continue. The linear memory remains 16 MiB across these six jobs. These are smoke/concurrency observations, not an A/B FPS benchmark, per-allocation accounting, general memory-leak proof, or an assertion that every possible race is excluded. Exact heap/stack peaks, memory growth and long-session resource behavior remain pending.

Rebuilt standalone profiling output still passes the existing visual and 42-stage navigation differential checks. The production standalone WASM is unchanged; compiled experimental outputs are produced by the documented build commands.


## Revision-safe prepared-sector publication checkpoint

The preparation API now publishes accepted terrain, props, static rasters and prepared navigation sectors without rerunning generation. Worker snapshots include bounded obstacle index buckets and neighboring static rasters per enabled profile. Terrain, residency and obstacle revisions are captured on admission and validated before any world mutation; a changed navigation profile also invalidates the result. Wall additions/removals and door passability edits advance the obstacle revision, including batched refreshes. This deliberately conservative global revision policy may retry unrelated edits; localized revision tracking is not yet justified by measurements.

Sector pass/steps/inbound arrays are now calculated on the pthread with thread-local registry pointers borrowing job-owned snapshots. Publication moves the target raster and commits prepared sector arrays to the main-owned lazy graph, in the original ordering. Nearby-settlement indices are recomputed against authoritative inputs. There is no concurrent mutation of the graph and no main-thread wait. These are bounded snapshots, not a second authoritative world.

WG_PUBLISH_TEST=1 node tools/experiments/check-spatial-pthread-runtime.mjs compares payload bytes, dense navigation queries and a route in all six biomes/six authored profiles against synchronous generation. Wrong IDs and stale settlements, suppressed props, residency, world reset, profiles, walls, door edits and wall removal are rejected without world mutation. Double publication is rejected. The preparation/cancellation probe also passes, and the standalone build retains all six visual and 42 navigation-stage differential matches against the untouched production binary.

In this native Chrome fixture, publication with a wall originally cost 17–24 ms while overlay filling remained on the main thread. After worker sector preparation, the latest smoke samples are 0.95–1.53 ms (Mangroves 0.95 ms). See thread-publication.json. These are separate single-run observations, not a controlled game A/B benchmark. Worker jobs still take tens of milliseconds, query batches proceed concurrently, and the small fixture stays within 16 MiB linear memory. No full-game frametime, populated-world memory, distribution or streaming acceptance is claimed. The production game loader/stream still uses the original module and remains the next integration step. Earlier checkpoint descriptions above record historical stages, not the current API surface.


## JavaScript runtime adapter checkpoint

`createThreadedSpatialWorld` now boots the Emscripten runtime with an explicitly supplied shared WebAssembly.Memory and maps its exported functions to the existing world facade. The facade reads the real memory object rather than retaining a possibly obsolete HEAPU8 buffer across growth. The standalone constructor remains unchanged by default. Prepared publication updates selected chunk metadata, resident bookkeeping and chunk revision without calling the regenerating `selectChunk` path. Disposal requests native shutdown, observes completion and return to the pool, then terminates idle workers; repeated disposal returns the same promise.

`node tools/experiments/check-spatial-thread-adapter.mjs` exercises the adapter in all six biomes, querying the live world while native generation runs, publishing/reading payloads and disposing with a pending next job. See thread-adapter.json. Existing six spatial-chunk-stream tests pass against the standalone production path. This adapter is not yet selected by the application loader or stream; browser packaging, fallback selection and game benchmarks remain open. The runtime pool shape is Emscripten-version-specific and is covered by the disposal probe.


## Pthread stream queue checkpoint

NativeChunkStream now accepts an asynchronous preparation backend while retaining its existing priority queue, epochs, installation and error handling. The spatial backend uses the authoritative core's pthread mailbox for absent chunks, validates the request immediately before native publication, and retries stale native revisions from current inputs. Completion polling does not perform generation. Camera-obsolete results are released without publication; transient camera changes can still reuse a result if it is relevant when ready. Resident refreshes still use synchronous selection and remain an explicit optimization/latency limitation.

`node tools/experiments/check-spatial-thread-stream.mjs` runs the real pthread runtime through this queue in six biomes. It edits a wall after dispatch, checks successful retry, replaces the desired camera region during a later job and verifies that the obsolete chunk never becomes resident, then disposes the stream/runtime with pending work. See thread-stream.json. All 16 existing chunk/spatial stream tests also pass. The application loader still does not opt into this runtime: browser isolation, distribution packaging, full game sessions and performance acceptance remain outstanding. No FPS claim follows from this integration test.


## Application loader and nested distribution checkpoint

The application loader now prefers the Emscripten pthread runtime when crossOriginIsolated and SharedArrayBuffer are available. Unsupported environments or runtime boot failure retain the standalone engine; `?wildEngineThreads=0` forces the baseline for comparisons. The standalone module is also retained for the existing initial-site search and speculative placement previews, not for chunk generation workers. New chunks use one authoritative threaded core. Session disposal/abort shuts down its worker; initialization failures also release it. Initial-site search and resident refreshes remain synchronous limitations.

Vite dev/preview responses now send COOP same-origin and COEP require-corp. The generated runtime and WASM are shipped together under public/wild-engine, outside bundler rewriting, so Emscripten can locate its module worker and binary relative to its own URL. Rebuild them with `SPATIAL_PTHREADS=1 bash tools/build-spatial-savanna-wasm.sh` (default pthread output now points there). Both generated files belong to the package.

`npm run build` and `npm run test:web-package` pass. `node tools/experiments/check-spatial-thread-package.mjs` loads the actual dist runtime in Chrome from a nested URL, asserts isolation/shared memory/native worker identity, publishes a Mangroves chunk and shuts down. See thread-package.json. This proves packaged runtime resolution, not full-game browser behavior or actual itch deployment. itch must enable SharedArrayBuffer-compatible isolation; Tauri security headers/WebView2 validation, live gameplay, fallback testing and six-biome ABAB remain pending.


## Isolation integration follow-up (validation pending)

The full browser probe exposed an iframe regression: the custom public-file middleware returned menu HTML before Vite applied configured response headers. With an isolated parent, Chrome blocked that unisolated menu document. A first middleware now applies isolation headers before the package middleware; HTTP inspection confirms COEP on /menu/index.html. A separate Vite dependency cache avoids a locked existing Windows cache. Tauri security.headers now declares the same COOP/COEP values supported by the installed CLI schema, but no WebView2 acceptance is claimed yet.

The new check-spatial-thread-game.mjs exercises a saved populated Mangroves scene via the actual menu/application loader (WG_THREAD_PORT selects a dedicated dev server). At this checkpoint its live run has not produced a completed report, so it is not a passing test. No game performance conclusion is supported. Windows cargo is not on PATH or at C:/Users/PC/.cargo/bin/cargo.exe; toolchain discovery is still needed, not yet an established blocker.


## Shared-memory adapter correction and first complete game load

The first full-game probe failed with Invalid spatial polygon. Investigation showed Emscripten 6.0.12 had compiled out support for the incoming wasmMemory option: the adapter's supplied memory was not the native memory. Earlier adapter tests only checked shared-memory type and metadata, so their apparent success did NOT establish payload/JS-write correctness. Native direct-runtime differential tests are unaffected. The build now explicitly includes wasmMemory alongside the complete default incoming module API (especially instantiateWasm, required by pthread startup). The adapter fails immediately unless runtime.HEAPU8.buffer is identical to the supplied memory.buffer.

Adapter tests now write a polygon through the JS facade and verify the native snapshot, and compare a payload height with the authoritative surface query in all six biomes. Adapter and threaded-stream tests pass with the rebuilt runtime. The Chrome game probe now waits for aria-busy=false, not just chunk count: the saved populated Mangroves game finishes loading using pthreads, 25 chunks, 400 sectors and 16 MiB shared linear memory. See thread-game.json. Recorded console messages are shader compiler warnings about f_environment4; no other captured errors occurred. This is the first complete initial-load check, not a streaming ABAB result, a memory peak measurement or six-biome gameplay acceptance. Packaged runtime must be rebuilt/rechecked after this correction, and Tauri remains pending.


## First in-game streaming ABAB pilot — not final acceptance

Reproduce with the dedicated isolated Vite server and `WG_THREAD_PORT=5299 WG_THREAD_BENCH=1 WG_THREADS=0|1 WG_THREAD_REPORT=... node tools/experiments/check-spatial-thread-game.mjs`. Reports game-stream-a1/b1/a2/b2.json capture the A/B/A/B order on Intel UHD (ANGLE D3D11), 1280x720, medium, approved Mangroves recipe/fixed512/ferns/far scenery. Each run installs ten new chunks during 96m of camera travel, after 60 warm frames; simulation is paused before travel.

| Metric (ms) | A1 synchronous | B1 pthread | A2 synchronous | B2 pthread |
|---|---:|---:|---:|---:|
| Main native generation mean/chunk | 46.41 | 0 | 45.45 | 0 |
| Main admission mean/chunk | — | 0.060 | — | 0.065 |
| Main publication mean/chunk | — | 0.880 | — | 0.729 |
| Worker compute mean/chunk | — | 52.91 | — | 49.88 |
| Graphics install mean/chunk | 16.21 | 18.73 | 16.52 | 16.94 |
| RAF interval mean | 40.46 | 40.09 | 39.26 | 40.74 |
| RAF interval p95 | 83.25 | 83.04 | 83.30 | 66.90 |
| RAF interval max | 166.22 | 182.93 | 149.71 | 166.33 |

Conclusion: the main-thread native generation stall is removed, but total-frame improvement is NOT established. The graphics install remains expensive and one thread run has a worse maximum. These numbers must not be presented as a successful FPS optimization. All runs have 25 final resident chunks and 16 MiB linear memory; this is not peak accounting.

Limitations: RAF intervals include display scheduling and are not GPU times; no GPU pass timings or image-equivalence captures were collected. Simulation is paused only after loading, with elapsed values differing by roughly two seconds between runs, so the snapshots are not strictly frozen/equivalent. Camera distance is stepped per frame, not per wall-clock second. This pilot motivates a stricter frozen-state comparison and attribution of remaining installation/render/streaming stalls, followed by active-simulation validation. It does not close the user acceptance gate.


## Frozen-state ABAB and visual comparison

Set WG_THREAD_FROZEN=1 in addition to the pilot options. QA now pauses at the application's loading handoff before simulation advances and asserts exact fixture elapsed time (119.99999999999746). All four frozen-stream reports retain identical initial camera/target, time and ten newly installed chunks. Timers separately record terrain construction, ground-detail registration, full render CPU, draw CPU and cache update CPU; these nested measurements must NOT be summed.

| RAF metric (ms) | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Mean | 32.52 | 31.69 | 31.69 | 31.60 |
| p95 | 66.53 | 50.04 | 66.58 | 66.32 |
| Maximum | 99.74 | 83.25 | 99.77 | 83.10 |

The native main-thread stall reduction persists; publication averages 0.69/0.77 ms. Worst observed RAF interval improves in both pairs, but mean improvement is small and p95 improvement is not consistent. The short paused-scene experiment still does not prove acceptance under active simulation or longer sessions. Terrain construction accounts for most installation CPU (roughly 14–16 ms/chunk); ground-detail registration and cache-update CPU are much smaller in this fixture. GPU costs have not been attributed by these CPU timers.

The four final real-renderer screenshots are frozen-stream-a1/b1/a2/b2.png. A1/B1 were visually inspected: terrain, shoreline, foliage, objects and camera composition agree. Pairwise mean absolute channel differences are 0.00170 and 0.00121 on a 0–255 scale; only 919 and 628 of 2,764,800 channels differ. This supports equivalent final appearance for this view, not all six biomes or all transient streaming frames. See frozen-stream-summary.json for the camera/state and detailed timing summaries. Next work remains attribution and scheduling of graphics installation, active simulation/six-biome validation, GPU/memory measurements and distribution tests.


## Graphics installation attribution

`WG_THREAD_DETAIL=1` enables QA-only import wrappers for shoreline/mud preparation, and method timers distinguish prop slots, mud geometry and biome attachment. The detailed frozen pthread run is install-detail.json/png (same Intel UHD/720p/medium/fixture/path). Ten chunks installed, four containing water. Installation averaged 16.86 ms; terrain accounted for 16.14 ms. Major measured work: mud geometry 3.49 ms/chunk; mud-edge interpolation/distance preparation 5.02 ms/chunk; natural-water-edge preparation 7.21 ms per water chunk (max 11.75); mangrove bank 1.71 ms per water chunk; base terrain buffer 1.17 ms/chunk; biome attachment about 0.94 ms/call. Two hundred prop-slot calls averaged 0.074 ms each (~1.48 ms/chunk). These timers are nested; do not add parent and child values. Instrumentation itself adds overhead and this one run is attribution, not a new performance acceptance comparison.

This points to preparing graphics in bounded stages and committing only the complete group, instead of reducing vegetation density or shader quality. The existing synchronous terrain path can drain the same stages for equivalence, while a streaming preparation path yields between expensive steps. A single water-edge step can still exceed the desired budget; finer subdivision or off-main pure geometry preparation must be measured if stage-level scheduling is insufficient. Atomic scene installation, obsolete-job cleanup, resource ownership and unchanged shadows/material caches are required before enabling such a change. No staged-install implementation or benefit is claimed at this checkpoint.


## Private terrain preparation stages

WorldScene now exposes a generator for ground, mud geometry, mud edges, bank, water edges and prop slots. The synchronous terrain entry drains these same stages and registers ground meshes only after completion. The unfinished group stays private; generator cancellation/exception disposes its owned meshes/materials and instance resources. Water is attached to the private group before a suspension point so cancellation cannot orphan its geometry. No inter-frame scheduling is enabled yet, and no performance benefit is claimed.

The spatial stream test verifies that a partially prepared ground is absent from terrainMeshes, cancellation disposes its geometry, and staged versus synchronous mesh positions/indices/counts agree. All six tests pass. A frozen real-game Mangroves traversal also completes; terrain-stage-refactor.json/png retains the approved appearance. Its final screenshot differs from frozen-stream-b2.png in only 500 channels with mean absolute difference 0.00062/255 and was visually inspected. This is one-view regression evidence, not full lifecycle validation.

Remaining prerequisite for yielding in production: changes to suppressions/settlements, quality changes, camera invalidation and teardown during preparation must reject or rebuild obsolete groups without leaking resources or publishing stale graphics. Native publication already occurs before graphic preparation, so cancellation must also account for native residency. Scheduling must be evaluated against total frames, not just shorter individual preparation slices.


## Opt-in staged installation pilot

`chunkInstall=staged` (QA harness WG_CHUNK_INSTALL=staged) now schedules private terrain preparation with a nominal 4 ms budget between stages. A stage is indivisible, so this is not a hard 4 ms bound. The shared native world remains authoritative. The spatial stream retries graphics preparation after terrain/suppression revision changes or quality changes; camera-obsolete private groups are destroyed, and newly resident chunks no longer desired/uninstalled are released. Late asynchronous results after stream disposal pass through a discard hook. Session preparation stamps terrainRevision before constructing the private group. Only the complete accepted group enters the scene/terrain mesh registry.

The default remains synchronous installation pending measured acceptance. Scheduler tests cover suspension, obsolete request, quality change, teardown, scheduler failure and late-result disposal; existing stream/spatial tests and actual six-biome pthread queue tests pass. These focused tests do not yet prove all real-game edits during staging.

The populated frozen Mangroves pilot completes ten chunks with staged installation: final scene incorporation mean 0.68 ms, RAF mean 31.41 ms / p95 50.03 / maximum 83.22. IMPORTANT: this does not remove the 14–16 ms construction work; it moves it to preparation slices, not yet separately instrumented. It is not an ABAB adoption result. The final screenshot differs from frozen-stream-b2.png by mean absolute channel difference 0.00121/255 (628 changed channels), consistent with the prior tiny frame differences. See staged-install-pilot.json/png. Next: instrument actual slices and completion latency, perform paired comparisons and real edit/cancellation tests, then decide whether to retain or further subdivide. Production pthread generation remains independent of this optional graphics experiment.

## Installation scheduling ABAB decision

Both variants in `install-abab-{a1,b1,a2,b2}` use the same pthread generation. A installs graphics synchronously; B prepares privately in stages. This comparison must not be confused with the earlier synchronous-native versus pthread comparison. Same frozen state, camera path, 720p medium Intel UHD, ten new chunks and final 25 resident chunks.

| RAF metric (ms) | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Mean | 30.95 | 30.76 | 30.85 | 30.21 |
| p95 | 49.96 | 50.04 | 50.16 | 50.07 |
| Maximum | 83.18 | 83.13 | 83.23 | 83.28 |

Staged preparation still costs 16.16 / 15.24 ms CPU per chunk, in slices averaging 5.05 / 4.76 ms with maxima 13.19 / 13.80 ms. Completion latency averages 32.42 / 36.20 ms (maximum 89.67 ms). Final installation drops below 0.8 ms on average, but this is moved work, not eliminated work. No meaningful p95 or maximum improvement is demonstrated: staged graphics installation stays QA-only, disabled by default. Native pthread generation remains enabled independently.

Final screenshot mean absolute channel differences are 0.001073 and 0.000136 on a 0-255 scale, with 265 and 365 changed channels. The recorded state and camera agree. These are paused-scene short-run measurements, not GPU times or active-simulation acceptance. Full results and images accompany `install-abab-summary.json`.

Latest package check: production build succeeds; nested-path threaded runtime reports isolation, shared memory, worker identity 1 and successful publication. Web package validation passes (1042 files, 841 relative links); 22 targeted streaming/preparation tests pass. This does not establish real itch-host isolation or Tauri/WebView2 compatibility. Active simulation, broader lifecycle stress, peak memory and real desktop distribution remain required before declaring completion.


## Concurrent lifecycle regression

`node tools/experiments/check-spatial-thread-lifecycle.mjs` exercises the shipped threaded module in all six biomes. While jobs run, main-thread terrain and route queries continue. A world restore rejects the pre-restore result; eight cycles per biome add/remove a polygon during preparation, reject stale output, retry, publish and remove the chunk. Resident counts and final saved state are asserted (polygon ID allocation advances normally). All six pass; see thread-lifecycle.json. This is a native API correctness test, not full active-game simulation, a race sanitizer or a performance benchmark.


## Native Windows / WebView2 packaged runtime

Built with `npx tauri build --no-bundle -- --locked` (Rust stable MSVC, Visual Studio 2022). Run the release executable with `--smoke-report ABSOLUTE_REPORT_PATH --smoke-pthreads`. This opt-in check loads the packaged Emscripten module from the actual Tauri origin, asserts adopted shared memory, generates/publishes all six biomes and shuts down the pthread. `tauri-pthread-runtime.json` passes on WebView2 155: `http://tauri.localhost`, secure context and cross-origin isolation true, worker identity 1, no errors. One-profile publication timings are 0.25-0.64 ms, with 16 MiB linear memory. These small scenes are compatibility evidence, not comparable to the populated Mangroves benchmark or proof of full-game desktop acceptance. Normal launch is unchanged.

The separate itch archive check currently fails: 1042 files / 569133972 bytes exceed the repository packager limits of 1000 files / 500000000 bytes. See itch-package-limits.json. Runtime module plus WASM account for about 0.6 MiB; existing graphics dominate the package. No assets were removed and no limits were bypassed. Nested-path browser runtime validation passes, but the real itch artifact remains an open distribution gate.

The ordinary packaged desktop smoke also passes: Gran Cañón / Mapungubwe reaches world readiness in 12.68 seconds, renders a 1024x576 canvas in very-low quality, and reports no errors. It checks packaged models, audio, worker creation, local storage and menu. See tauri-full-game.json/png. This is a single launch and short render check; it does not assert the application backend, prolonged streaming, all six full game scenes, save/load or active actor correctness. The independent native runtime test above establishes pthread support for this WebView2 host.


## Active simulation and newly exposed shader stalls

QA harness now supports `WG_THREAD_ACTIVE=1`, `WG_THREAD_FRAMES=600`, `WG_THREAD_DISTANCE=240`, plus optional `WG_THREAD_GL_DETAIL=1` and `WG_THREAD_CPU_PROFILE=1`. Active runs start from the same paused fixture and explicitly set its tutorial.basicSkipped flag, preventing instructional UI from stopping simulation. This changes only the QA input; production simulation is unchanged. Camera movement remains per-frame and final simulation time can vary, so these are functional/attribution pilots, not equivalent-state ABAB acceptance.

The initial active pilot and readiness diagnostic exposed a `tutorial-action` pause after ~7.3 simulated seconds. Actors were ready in all 600 frames; native streaming was not the reason simulation stopped. The corrected `active-stream-unpaused.json` has zero paused frames, 600 actor-ready frames, elapsed 120 -> 138.46 seconds and 25 new chunks. A worker changes position and both workers progress from their initial activities; this is not a broad worker/animal correctness proof. Final native residency remains 25 chunks / 400 sectors / 16 MiB (not peak allocation accounting). Native publication mean 0.768 ms, p95 0.975 ms, max 1.53 ms. Graphics installation mean 15.12 ms, max 39.86 ms.

Total RAF mean is 36.83 ms, p95 50.03 ms, maximum 3491.96 ms: overall hitch acceptance FAILS. The first active render repeatedly stalls for roughly 3.5 seconds. Additional instrumentation separates microevents, presentation, world draw, Three rendering and GL calls. Microevents max 0.575 ms; the long interval is inside Three renderer.render. `active-stream-profile.json` and its Chrome CPU profile identify synchronous getProgramInfoLog queries as the dominant stall (~3.8 seconds self time over the trace; seven long calls at elapsed ~120.45 seconds). This is shader compilation/link synchronization, not pthread terrain publication. Several later calls also take 60-130 ms. The profile has instrumentation overhead and is not a benchmark baseline.

Evidence is retained without removing the cold stalls from metrics. Next work must avoid first-use shader synchronization through verified preparation while retaining shader-error detection and identical materials, then repeat paired active streaming tests. Disabling error checks alone is not an accepted fix: compilation may simply block another GL call. Active construction/destruction, animals, longer runs, GPU/peak memory, six full scenes and itch archive delivery remain open gates.


## Prepare final resident depth variants after far-world installation

Program identity comparison (`active-program-lifetime.json`) found that the initial long stalls compile linear-output, shadow-disabled variants of fixed512 ground, far ground/water seams and far impostors. Their closest preloaded variants differ in output color space and the shadow feature bit. Inspection confirms actor GPU/depth preparation precedes far-vegetation attachment and initial regional installation. Thus earlier preparation cannot cover these final materials.

QA-only explicit preparation after readiness (`WG_THREAD_DEPTH_WARM=1`) takes 1958.7 ms awaited wall time and removes the initial multi-second stall. The implementation now prepares the final resident depth pass after all initial far adapters are installed, while the loading presentation remains active. It reuses bounded depth submission, asynchronous program readiness and binding initialization, restores renderer/material state before waiting, and observes cancellation. Shader diagnostics remain enabled. No materials, geometry or shader semantics changed.

The real integration pilot (240 active frames, 96m path, same initial fixture/hardware/medium quality) records RAF mean 40.26 / p95 66.54 / max 166.29 ms versus the earlier identity run 53.90 / 83.06 / 3525.17 ms. This is a single before/after attribution comparison with GL instrumentation, not ABAB acceptance; active final simulation states differ with elapsed wall time. Later streaming still incurs getProgramInfoLog waits of 26-158 ms, including newly encountered/recreated far and depth variants. Those costs and the roughly 15ms graphics installation remain unresolved. Explicit post-readiness QA warmup is OFF for the integration run.

Frozen regression screenshot `final-depth-frozen-regression.png` matches the original same-state/camera `install-abab-a1.png`: mean absolute channel difference 0.002305/255, 1773 changed channels out of 2764800. Visually inspected terrain, foliage, shoreline and shadows remain consistent in this view. See final-depth-image-diff.json. All 26 focused far-loading/depth-preload/program-binding tests pass, including final-warmup cancellation; production build passes. Broader active ABAB, six-biome scenes, distribution revalidation and residual streaming preparation remain open.


## Active ABAB after final-depth preparation

Four sequential fresh Chrome executions on Intel UHD, medium quality, 1280x720, frozen initial fixture elapsed 120, tutorial omitted only in QA, 60 paused warm frames then 600 active frames and identical per-frame 240m camera path. A uses standalone synchronous generation; B uses pthreads. Both include the final resident-depth loading fix, original synchronous graphics installation and identical graphics options. No builds or other benchmarks ran concurrently. GL instrumentation and CPU profiler were disabled.

| Metric (ms) | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| RAF mean | 32.40 | 31.70 | 31.65 | 31.79 |
| RAF p95 | 66.52 | 50.28 | 66.62 | 50.12 |
| RAF maximum | 199.64 | 216.16 | 182.66 | 182.91 |
| Native synchronous generation mean | 45.31 | — | 43.64 | — |
| Native publication mean | — | 0.73 | — | 0.82 |
| Graphics installation mean | 14.25 | 15.89 | 13.63 | 15.56 |

All runs install 25 new chunks, have zero paused frames and 600 actor-ready frames, finish with 16 MiB linear memory, and have no console errors beyond the previously recorded f_environment4 shader warnings. Native worker compute averages 48.41 / 47.03 ms. Thus this does not accelerate total native calculation; it removes the 44-45 ms main-thread generation call. p95 improves consistently by about 25%, while mean does not consistently improve and maximum remains unchanged or worse. Graphics installation is slightly more expensive in B in both pairs; no cause is established by these measurements.

The initial fixture/camera/path are identical, but final active simulation time differs (138.74-139.29), so final screenshot pixel comparisons cannot establish exact state equivalence. Frozen-state equivalence remains separate evidence. CPU/RAF measurements are not GPU timings. Two workers are present; this does not cover a dense raid, construction/destruction or long sessions. See active-abab-summary.json, raw reports and screenshots. This is evidence for reduced frequent generation stalls, NOT closure of the full performance, correctness, memory or distribution gates.


## Shared-memory growth and reuse pressure test

`node tools/experiments/check-spatial-thread-growth.mjs` loads the shipped pthread runtime, enables all six real actor navigation footprints and generates 143 additional Mangroves chunks per pass. Three passes cover the same region twice and then a disjoint region offset by 24 chunks. Main-thread terrain queries continue during jobs. Every publication checks worker identity and exact payload-center height against the authoritative world; JS polygon writes/native snapshot reads are checked after growth. Every pass removes its chunks and asserts one resident chunk remains.

`thread-growth.json` records allocator-driven shared memory growth from 16 to 40 MiB. Several increases occur between dispatch and worker completion, before publication, exercising actual worker-side allocation rather than a manual memory.grow call. All 429 chunk publications and removals pass. The second and third passes require no additional linear capacity; sector slots remain 2304 and active sectors return to 16 after each sweep, including the new coordinate region. This supports reuse of the observed native buffers/graph slots, not a universal absence-of-leaks claim.

Capacity does not shrink after removal; it is a reusable high-water allocation, not measured live heap use. This Node runtime stress test has no GPU or renderer and does not establish browser process RSS, separate pthread stack/temporary allocation peaks, mobile limits, or performance under graphics contention. Browser growth/lifecycle coverage and full resource accounting remain open acceptance requirements.


## Chrome shared-growth regression

`node tools/experiments/check-spatial-thread-browser-growth.mjs` executes the same portable pressure case as the Node entry point, using the real isolated Chrome/Emscripten worker runtime served by Vite. It performs all 429 publication/removal cycles with six navigation profiles, validates payload heights and post-growth JS polygon writes/native reads, and checks runtime teardown. `thread-browser-growth.json` passes: 16 -> 40 MiB capacity, no further growth in repeated or disjoint regions, one resident chunk / 16 active sectors after each pass, zero page errors, zero registered pthreads and zero unused workers after disposal.

The first runner attempt used an absent Emscripten runningWorkers field and failed its report construction; it was corrected to inspect the actual PThread.pthreads registry and repeated from a fresh browser. The passing result is from the complete rerun. The test serves an isolated blank page to avoid unrelated game loading and does not measure full-game resource leaks, GPU memory, process RSS or frame performance. Node and browser now share spatial-thread-growth-case.mjs to keep the assertions identical.


## Six real-game biome streaming checks

QA harness accepts `WG_THREAD_BIOME` and validates each saved fixture's biome before loading. Sequential Chrome runs use the real populated fixtures, approved global graphics recipes, 720p medium Intel UHD, frozen initial state, QA tutorial omission, 60 warm frames, then 360 active frames / 144m per-frame camera travel. Each of the six biomes completes 15 new chunks with the pthread backend, all 360 actor-ready frames, zero paused frames and no errors beyond the already documented shader warnings. See biome-active-summary.json, individual raw reports and real screenshots.

| Biome | RAF mean / p95 / max (ms) | Publication mean (ms) |
|---|---|---:|
| Sabana | 35.34 / 66.64 / 149.61 | 0.758 |
| Desierto | 22.36 / 33.37 / 83.18 | 0.653 |
| Gran Río | 32.43 / 66.46 / 166.57 | 0.752 |
| Volcanes | 31.83 / 66.45 / 166.29 | 0.804 |
| Gran Cañón | 18.38 / 32.83 / 116.62 | 0.773 |
| Manglares | 34.83 / 50.08 / 183.04 | 0.726 |

This expands real-renderer functional coverage beyond Mangroves. One run per different scene is not a performance comparison between backends or a ranking of biome efficiency. Timings are RAF/CPU, not GPU. Captures record end states, not exact before/after equivalence. Still required: paired low-quality and GPU measurements, edits during generation, animals, save/load/teardown of complete games, long sessions, packaging and remaining streaming stalls. No artistic changes or simulation rules were modified.


## Active ABAB with asynchronous GPU elapsed queries

`WG_THREAD_GPU=1` adds a bounded QA timer around WorldScene.render, sampling every third render and polling readiness without blocking. Queries are deleted after reading, disjoint invalidates the entire GPU series, another active elapsed query fails explicitly, and teardown has a deadline/cleanup. Unit tests cover valid readings, render return preservation, disjoint and timeout cleanup. This measures the GPU command interval including pipeline bubbles, not isolated GPU busy time or individual passes.

Four sequential Intel UHD / Chrome / 720p medium Mangroves runs use 600 active frames and the same 240m per-frame camera path. Each returns 201 valid samples, no omitted queries and no disjoint. All install 25 chunks with zero paused frames.

| Metric (ms) | A1 sync | B1 pthread | A2 sync | B2 pthread |
|---|---:|---:|---:|---:|
| GPU mean | 25.85 | 26.06 | 25.67 | 26.88 |
| GPU p95 | 39.38 | 39.85 | 38.33 | 38.43 |
| RAF mean | 32.26 | 31.51 | 32.04 | 32.48 |
| RAF p95 | 66.51 | 50.12 | 66.54 | 50.25 |
| RAF max | 166.64 | 182.99 | 182.85 | 182.94 |

The repeated p95 improvement survives GPU instrumentation, while mean/max frame improvements remain unproven. GPU work is not reduced: averages are slightly higher for B, especially the second pair. This experiment cannot identify the cause of that variation. Native main-thread generation averages 43.12/42.03 ms in A, while publication averages 0.725/0.792 ms in B. These results support removal of the frequent CPU generation stall, not a general GPU/FPS optimization. Compare this series internally; do not combine it with the non-instrumented baseline.

See gpu-active-summary.json and raw reports. Final active elapsed times differ, GPU timestamps include command-stream idle periods, only one graphics quality/biome is measured, and per-pass/peak-memory/long-session gates remain open. No art or production simulation was changed by the QA instrumentation.


## Real wall commands during running pthread generation

`WG_THREAD_EDIT=1 WG_THREAD_FROZEN=1` runs a disposable real Mangroves game fixture and finds a legal wall site through normal navigation placement. The QA hook observes the next streaming job, yields until native status is exactly 2 (running), then issues the normal Game.placeStructure command and production session synchronization. After publication/retry it asserts the authoritative barrier count increased and the renderer contains the wall. A second camera move repeats the overlap with Game.removeWall and asserts the barrier is absent after all results publish.

`game-concurrent-wall-running.json/png` passes. Jobs 25 and 31 are both recorded running at their respective edits; both publication attempts return stale-input -2 and subsequent jobs succeed. Native barrier count is 0 -> 1 -> 0, the built wall is rendered, ten chunks are installed, and the final queue is idle with no stream failures. No unexpected console errors are present. The earlier queued-only pilot is not used as running-overlap evidence.

This validates a real command/event/mirror path against stale native preparation, without synthetic writes to obstacle memory or replacing game commands. Simulation is paused between the two commands to make the scenario controlled. It does not yet cover raid damage, gate state changes, crops, new settlements, save/reload or concurrent active actor route correctness. Those remain required along with distribution/performance gaps.


## Concurrent crop edit and full application reload

The edit scenario now performs a normal Game.plant command while native status is exactly 2, after building and removing a wall. It verifies the new crop remains alive and reaches the renderer crop batch. The crop need not invalidate navigation: job 37 publishes successfully, whereas wall jobs 25 and 31 reject stale inputs with -2. All 15 new chunks finish without stream failures.

`game-concurrent-save.json/png` records the three commands. The harness calls the production snapshot serializer (including validation) and writes `concurrent-edits-saved-fixture.json`. A separate fresh Chrome invocation loads that snapshot through the ordinary menu load-slot flow. `game-concurrent-reload.json` verifies plant-51 at its saved coordinates, structure-50 absent, zero native wall barriers, pthread backend, 25 resident chunks, and loading complete. Only previously known f_environment4 shader warnings occur. This covers the serialized state and normal application loading; it does not test the UI save button or shutdown during an unfinished job.

Reproduce sequentially with PowerShell from the lab worktree and Vite on 5299:

```powershell
$env:WG_THREAD_PORT='5299'; $env:WG_THREAD_FROZEN='1'; $env:WG_THREAD_EDIT='1'
$env:WG_THREAD_SAVE_FIXTURE='docs/qa/wild-engine-pthreads/concurrent-edits-saved-fixture.json'
$env:WG_THREAD_REPORT='docs/qa/wild-engine-pthreads/game-concurrent-save.json'
node tools/experiments/check-spatial-thread-game.mjs
Remove-Item Env:WG_THREAD_EDIT,Env:WG_THREAD_SAVE_FIXTURE
$env:WG_THREAD_FIXTURE_FILE='docs/qa/wild-engine-pthreads/concurrent-edits-saved-fixture.json'
$env:WG_THREAD_REPORT='docs/qa/wild-engine-pthreads/game-concurrent-reload.json'
node tools/experiments/check-spatial-thread-game.mjs
```

Active animal routing, gates, raids, long-session teardown and distribution acceptance remain open. No production simulation or rendering behavior was modified in this extension.


## Actual browser fallback checks

Two additional full Mangroves app loads use the normal saved-slot menu path, with pthreads requested (not disabled by the comparison switch):

- `game-no-isolation.json`: QA strips COOP/COEP from document responses. Chrome reports crossOriginIsolated=false; the application selects standalone with `SharedArrayBuffer isolation unavailable`.
- `game-boot-fallback.json`: isolation remains true but QA returns HTTP 503 for the threaded module. The application selects standalone and records the dynamic-import failure.

Both reach loading complete with 25 chunks, an idle queue, zero stream failures, unchanged paused simulation time and 16 MiB native memory. The latter intentionally produces a 503 and fallback warning; other logged warnings are the known f_environment4 messages. This proves basic full-load fallback, not active streaming performance, automatic recovery after a running worker fails, or actual itch hosting.

Reproduction: run check-spatial-thread-game.mjs with WG_THREAD_PORT=5299, WG_THREAD_FROZEN=1 and exactly one of WG_THREAD_NO_ISOLATION=1 or WG_THREAD_BOOT_FAILURE=1. Set WG_THREAD_REPORT to a distinct report file. The QA changes only response delivery, without overriding browser isolation properties or production runtime decisions.


## Browser runtime shutdown at three ownership phases

`node tools/experiments/check-spatial-thread-browser-disposal.mjs` runs nine fresh shared-memory runtimes in real Chrome: three idle, three observed at native status 2 (running), and three at status 3 (ready but unpublished). Every case builds all six navigation profiles in Mangroves. Each calls dispose twice and asserts the same promise, waits with a 10-second deadline, requires stopped status 5 and zero running/unused pthread workers, checks resident chunk count stays at one, and verifies the disposed job cannot publish.

All nine pass in `thread-browser-disposal.json`. Running-job disposal returns in 0.015–0.060 ms; asynchronous completion takes 13.54–15.13 ms. Ready-job completion takes 4.64–5.06 ms. These are small functional timing samples, not a robust performance benchmark. Runtime-owned worker registries are empty; this does not prove immediate process RSS reclamation or garbage collection of the retained WASM memory. Full-game graphics teardown and cancellation through the UI remain separate acceptance gates.


## Full game return-to-menu with pending native work

`WG_THREAD_EXIT=1 WG_THREAD_FROZEN=1 WG_THREAD_PORT=5299 node tools/experiments/check-spatial-thread-game.mjs` exposes the production menu function and runtime handle through QA source routes only. After loading a populated Mangroves game, camera travel starts actual streaming. The test observes native status 2, invokes the ordinary return-to-menu function (including saving), awaits session disposal, and observes another 200 ms for late chunk installation.

`game-exit-running.json` passes: world disposed, menu present, zero pthread workers, native stopped status 5, zero late installs, one discarded job, idle queue and zero stream failures. Total menu transition was 288.57 ms, including save and graphics teardown, not native shutdown cost. Disposal calls observed statuses [3,5]: generation finished during the save/menu preparation before the first session dispose call. Thus this proves pending-result discard and idempotent integrated teardown, not that the game-level shutdown interrupted computation. The separate browser runtime lifecycle test covers shutdown while status 2.

This checks scene disposal and absence of late installation, not a GPU-memory leak audit. QA holds the old world/runtime for inspection and does not measure garbage collection. No production files changed.


## Low-quality active GPU ABAB

The harness accepts WG_THREAD_QUALITY (default media). A sequential baja run uses the same Mangroves fixture, Intel UHD / Chrome, 1280x720 viewport, 60 warm frames, 600 active frames and 240m camera path, fixed512 cache and existing fern LOD. Each run creates 25 chunks, has zero paused frames, and records 201 GPU intervals. See low-active-summary.json and low-active-{a1,b1,a2,b2}.json/png. Captures are active end states, not pixel-equivalence evidence.

| ms | A1 sync | B1 pthread | A2 sync | B2 pthread |
|---|---:|---:|---:|---:|
| RAF mean | 27.58 | 25.75 | 27.35 | 25.33 |
| RAF p95 | 66.51 | 49.90 | 66.50 | 49.90 |
| RAF maximum | 116.38 | 182.96 | 199.44 | 182.97 |
| GPU mean | 21.13 | 20.60 | 20.98 | 20.34 |
| GPU p95 | 31.00 | 29.20 | 31.71 | 30.81 |

Mean frametime improves 6.6% and 7.4% in the paired runs; p95 improves about 25% in both. Worst-frame improvement is not consistent. Synchronous native generation costs 48.05/47.30 ms per chunk, versus main-thread publication 0.792/0.734 ms for pthreads. The GPU interval is slightly lower here, but it includes pipeline idle time and is not evidence that pthreads reduce shader work. This does not remove the remaining graphics streaming stalls.

Reproduce with WG_THREAD_PORT=5299, WG_THREAD_FROZEN=1, WG_THREAD_ACTIVE=1, WG_THREAD_BENCH=1, WG_THREAD_GPU=1, WG_THREAD_FRAMES=600, WG_THREAD_DISTANCE=240, WG_THREAD_QUALITY=baja; run sequentially with WG_THREADS=0,1,0,1 and distinct WG_THREAD_REPORT paths. No simultaneous builds or other benchmarks were run. This is one biome/quality sequence, not long-session or all-biome performance acceptance.


## Itch package size blocker resolved locally

The prior dist contained 1042 files / 569,134,687 bytes. A SHA-256 audit found only 15,473,874 redundant bytes across eight files: deduplication alone could not resolve the limits. Inspection found eight visual-lab directories referenced only by tools/experiments, not shipped application code/content. The web package plugin now excludes these directories from dist while retaining every source asset for development QA: ground-fiber-bake, ground-pom, moss-composite, fern-composite-lod-20261023, holly-fern-cards-20261023, mangrove-leaf-cards-20261023, continuous-grass-cards, continuous-grass-flow.

Approved holly-fern-frond and holly-fern-lod assets, cupped leaves, continuous-grass modules and all runtime art remain included. No texture conversion, quality reduction or shader change was made. The package verifier rejects textual runtime references to excluded paths and verifies their absence along with existing asset/link checks.

`npm run package:itch` now passes: **997 files, 491,960,976 uncompressed bytes**, 841 checked relative links, CRC-verified ZIP. Only three files and about 8 MB remain under current limits. See package-itch-clean.json for archive size/hash. `check-spatial-thread-package.mjs` also passes on the rebuilt dist: isolated/shared memory, native worker identity 1, successful publication from a nested URL. This resolves the local packaging limit, not actual hosted itch isolation/configuration. Tauri rebuild and full packaged-game validation remain pending.


## Rebuilt Windows executable after package cleanup

Built source commit 34e36bf33 with `npx tauri build --no-bundle -- --locked`; frontend inventory checks pass and the optimized Rust build finishes in 2m12s. `tauri-rebuilt-artifact.json` records executable SHA-256 and size. The executable is not committed.

Two sequential checks run against that new executable:

- `--smoke-report <absolute tauri-pthreads-rebuilt.json> --smoke-pthreads`: passes on http://tauri.localhost, secure and isolated, supplied shared memory adopted, six biomes with native worker identity 1 and successful publication, clean shutdown, no errors.
- `--smoke-report <absolute tauri-game-rebuilt.json>`: full application smoke passes, 17 runtime GLBs load, audio decodes, storage/WebGL2/worker checks pass, Gran Cañón / Mapungubwe reaches world readiness at 1024x576 in 12.31 seconds, no errors.

These are complementary checks: the game smoke does not currently expose/assert its chosen native backend, and the explicit pthread check does not exercise a full campaign. No installer bundle, non-Windows platform or hosted itch deployment is covered by these results. Distribution acceptance therefore remains incomplete.


## Native route differential across concurrent publication and edits

`node tools/experiments/check-spatial-thread-routes.mjs` compares the actual pthread core against the standalone WASM on seed 712 in all six biomes. Each core builds the worker and five animal collision profiles from production footprint data. For each profile it evaluates 25 local routes and requires exact agreement of status, reasons and every returned point.

Six stages cover original state, a polygon added while native status is observed at 2, successful publication after stale-input rejection/retry, routes in the newly published neighbor, polygon removal, and neighbor removal. Total: 5400 route comparisons, all equal. Each stage includes successful routes (31–144 out of 150 depending on terrain/profile mix), not only matching failures. Adding the polygon reduces successful routes and removing it restores the initial counts in every biome. Every stale preparation rejects with -2 before retry.

See thread-route-differential.json. This tests actual navigation results with shared-memory preparation and main-thread edits, not active actor movement, gate semantics, raid simulation, a performance benchmark, or exhaustive path correctness. Some queries can complete after the worker has finished; the obstacle mutation itself is issued immediately after observing running status.


## Worker-only gate permeability during preparation

The native route differential now also locates a short traversable segment shared by all six profiles in each biome. It adds an ordinary native barrier with worker-only pass mask 1 while preparation is observed running, verifies local crossing is allowed only for workers, rejects the stale result, retries publication and repeats the permeability check. Removal occurs during a second preparation; the stale result again rejects, and all profiles regain the original crossing before and after retry/publication. Route result objects are compared against the synchronous core throughout.

All six biomes pass 144 additional gate/profile checks (24 each), alongside the original 5400 route comparisons. The fixture uses segments of length 1.4m because spatial_local_clear intentionally rejects segments longer than 1.5m; an initial 4m fixture was invalid and was corrected without changing production code. No settlement or terrain flattening is used. This covers the native permeability representation used by gates, not automatic gate placement commands or active raids.


## Real first-day simulation with background publication

The campaign-opening helper now accepts an optional runtimeFactory for QA dependency injection. Default tests remain standalone; the threaded case injects one authoritative shared core and awaits its disposal. No production simulation code changes.

`node tools/experiments/check-spatial-thread-first-day.mjs` passes for Sabana and Mangroves: normal paid planting/hiring commands, one worker moves 28.49m, 1200 half-second ticks reach day 2, introductory RaidSpawned and RaidEnded events occur, raid is cleared and no terminal result appears. Forty background chunks publish in each case, with no stale result in this particular scenario. Native status 2 overlaps 73/130 simulation ticks respectively, including 5/8 ticks while a raid is active. New jobs are distributed every 30 ticks rather than concentrated before the raid. Each run uses one shared authoritative core; the standalone helper remains only for starting-site selection.

This is headless integration evidence, not a rendered FPS benchmark or full campaign. The helper still resolves raid-demand chunks synchronously and background jobs are outside the active camera area. It does not prove asynchronous raid-demand loading or wall damage during a raid. Existing spatial-campaign-opening tests also pass after the optional injection change. See thread-first-day.json and the executable QA script.


## Production raid residency planner uses pthread streaming

Inspection confirms the synchronous serviceRaidConnectivityDemand is a headless campaign helper, not the app renderer path. Production WorldScene.syncChunks merges raidResidentDemand pins into the same NativeChunkStream plan as camera chunks.

`node tools/experiments/check-spatial-thread-raid-residency.mjs` invokes that production scene method with a real shared core/stream in all six biomes. Mesh installation is a stub (no GPU). A sparse raid entry/exit at z=320/323 requests its remote chunk in addition to the 25 near chunks, without filling the intervening rectangle. Every successful absent-chunk publication asserts native worker identity 1. core.addChunk is replaced with a throwing guard, so any synchronous absent generation fails the test. Cancelling the raid demand removes the remote chunk from both installed inventory and native residency while preserving all 25 near chunks.

All six pass with zero synchronous addChunk calls and zero stream failures; see thread-raid-residency.json. This validates the production planning/stream connection and cancellation, complementing the first-day AI test, but does not combine GPU installation, live raid AI and asynchronous sparse streaming in one full-game run.


## Forward obsolete stream requests to native cancellation

Found an integration gap: native cancellation existed, but spatial-chunk-stream only waited for an obsolete job to finish before discarding its result. It now signals p.cancel once when the request becomes non-current, keeps ownership until the worker reaches its terminal result, and releases normally. C++ cancellation remains cooperative between generation/profile phases; this is not instantaneous interruption inside a raster.

A cancelled builder can finish after demand returns for the same coordinate. NativeChunkStream now treats an explicit null async result as a discarded job and replans current demand, rather than reporting a malformed payload. A deterministic unit test covers that race. Ordinary build errors still follow the error path.

`check-spatial-thread-cancellation.mjs` failed against the previous implementation (zero native cancellations), then passed after the fix. Real shared-memory Mangroves jobs cover demand replacement, forced epoch invalidation, and remove/re-add of the same request. Each cancelled result reports native cancellation=1 and worker identity=1; each replacement publishes, no obsolete chunk is installed, and stream failures remain zero. The targeted chunk suites pass 18 tests. See thread-stream-cancellation.json. No FPS or latency gain is claimed without paired measurements. Packaged binaries predate this JS fix and will need rebuilding for final acceptance.


## Rendered rapid-camera cancellation stress

`WG_THREAD_ZIGZAG=1` switches the benchmark camera between its original x and x+240m every twelve frames. With WG_THREAD_FRAMES=240, WG_THREAD_DISTANCE=240, WG_THREAD_FROZEN=1 and WG_THREAD_BENCH=1, the real Mangroves renderer exercises nine native cancellations. It installs 92 chunks over the alternating moves, then drains to an idle queue with no failures; native residency returns to 25 chunks / 400 sectors and WASM capacity remains 16 MiB. The harness asserts cancellation occurred and the queue settled. Only known f_environment4 shader warnings are logged.

`game-zigzag-cancellation.json/png` records the run. Including the final drain, 292 RAF samples average 32.40ms, p95 83.13ms, maximum 199.55ms. Simulation is paused and no GPU timer is enabled. This is an adversarial camera correctness test, not an A/B performance claim or evidence of eliminating remaining shader/installation stalls. The camera now has an explicit optional pattern flag; default benchmark motion is unchanged.


## Remaining stalls: repeated destruction/recreation of warmed programs

A current GL-instrumented zigzag run records 49 getProgramInfoLog calls above 20ms, totalling 1552.49ms. All associated full program cache keys already existed in the warmed initial program set. They recur under new program IDs: fixed512 ground, mud/moss, water shore, native partial blends and far-ground seams. This is evidence of repeated program recreation after their last material releases them, rather than exclusively unseen shader variants.

A QA-only WG_THREAD_PIN_PROGRAMS=1 probe adds one reference to each warmed Three 0.180 program for the measurement, then releases those references in finally (destroying only programs whose remaining references are zero). It uses version-specific internal program fields and is not a production implementation. Same scene/camera cadence: slow GL calls fall from 49 to zero; RAF mean/p95/max changes from 32.64/99.71/182.79ms to 21.98/49.77/99.73ms.

**This is not a valid quantified performance win yet:** the faster run completes only 63 chunk installations versus 85 during frame-count-driven camera reversals, because asynchronous work cancellation changes with elapsed time. Installation cost itself remains about 17.5ms. Both return to an idle queue, with no unexpected console errors. The next comparison must require equivalent completed work, repeated A/B/A/B, and a bounded lifecycle/memory policy before adopting retention. Raw reports/captures: game-zigzag-gl-detail and game-zigzag-program-pin. No production shader or artistic setting changed.


## Completed-work program retention ABAB

WG_THREAD_COMPLETE_LEGS=1 waits for each camera position to finish its queue and twelve settling frames before proceeding. Four alternating positions at x+240/x complete exactly 100 chunk installations per run, with identical per-leg installed key inventories, final native state (25 chunks, 400 sectors, 16 MiB), and no cancellations. Simulation is paused; quality medium, Intel UHD, 720p, GL attribution enabled. This removes the previous different-work confound.

| ms | A1 normal | B1 pinned | A2 normal | B2 pinned |
|---|---:|---:|---:|---:|
| RAF mean | 28.17 | 26.42 | 28.50 | 27.43 |
| RAF p95 | 66.51 | 50.06 | 66.50 | 49.91 |
| RAF max | 116.35 | 99.75 | 100.06 | 99.78 |
| Total observed RAF interval | 8480.51 | 8347.39 | 8663.41 | 8613.53 |
| GL calls over 20ms | 15 | 0 | 12 | 0 |

Repeated p95 improvement is about 25%; total elapsed benefit is only 1.6%/0.6%. Chunk installation still averages 15.9–17.0ms with peaks up to 50.3ms. Final PNG RGB MAE is 0.000196/0.000060 on a 0–255 scale, with localized maximum channel differences 18/20; not pixel-identical. These results support program-lifecycle retention as a stutter reduction candidate, not a complete streaming fix.

Reproduce the four runs with WG_THREAD_PORT=5299, WG_THREAD_FROZEN=1, WG_THREAD_BENCH=1, WG_THREAD_COMPLETE_LEGS=1, WG_THREAD_GL_DETAIL=1, WG_THREAD_FRAMES=4, WG_THREAD_DISTANCE=240 and WG_THREAD_PIN_PROGRAMS=0/1/0/1. Raw program-retain-{a1,b1,a2,b2}.json/png and program-retain-summary.json contain evidence. GPU memory/driver allocation is not measured. The private-field retention probe remains QA-only pending a bounded production design, teardown checks and wider validation.


## Bounded experimental program lease

The QA pin probe now uses retainWarmedPrograms instead of open-coded reference edits. The adapter explicitly supports Three revision 180, validates reference-count fields, retains at most 96 unique programs from the initial snapshot, never accumulates later variants, and releases its references once in the measurement finally block. Only programs with no material references remaining are destroyed. Unsupported versions fail closed by retaining nothing. Three unit tests cover the cap, remaining material ownership, idempotent release, malformed metadata, unsupported versions and already-removed programs.

The real Chrome two-leg run in program-retain-bounded.json completes 50 chunk installations, releases every acquired reference and reports no unexpected console errors. This is lifecycle validation, not another paired performance result. The adapter is still used only by QA, not enabled in the application. The cap is a program-count bound, not a GPU byte budget; driver allocation size is unavailable. Full app teardown/context restoration and quality-change validation remain before integration.


## Program lease context-restoration safety

Three replaces renderer.info.programs when restoring WebGL. The experimental lease previously retained the old collection and could attempt to destroy pre-loss handles later. dispose now abandons its references without GL deletion if the collection changed or the context is lost; stats distinguish abandonment from normal release.

Four unit tests pass. `check-program-retention-context.mjs` also uses real Chrome WebGL: draw a small scene, retain its program, force context loss and restoration, confirm the program collection changes, dispose the old lease without destruction, draw again without GL error, and acquire/release a fresh lease. program-retain-context.json records one abandoned old program and one normally released fresh program. This verifies the adapter across real context replacement, not complete game restoration or driver memory reclamation. Application retention remains disabled by default.


## Opt-in scene lifecycle integration

The application now supports retainPrograms=1 (off by default). After the final initial world render, WorldScene retains at most 96 warmed programs. Quality changes release the old lease without accumulating a new one; context loss abandons invalid old handles; scene disposal releases before materials/renderer teardown. The QA benchmark lease and application lease are separate alternatives, not intended to be enabled together.

`game-retention-exit.json` validates the actual app option: 79 programs retained at readiness and all 79 references released on the production return-to-menu path with pending pthread work. World disposal, zero workers and no late chunk installs still pass. Eighteen targeted quality/culling/retention tests pass; quality fixture assertions check the lease is released exactly once and cleared across preset changes. No artistic settings or simulation behavior changes. Performance of the app-integrated option, full-game context restoration and all-biome coverage remain pending; it is not the default yet.


## Full-game context recovery exposed and fixed a visual cache regression

The new full Mangroves context-loss test initially passed structural/GL checks but visual inspection revealed missing moss and shadows: cached render-target objects survived, while their pixels did not. The initial evidence is retained as game-retention-context-before-fix.json/png; its successful structural assertions must not be read as visual acceptance.

WorldScene now invalidates every resident Mangroves material cache entry on context restoration, using the existing incremental bake queue, invalidates native shadow cache and requests a shadow-map refresh. No texture sizes, material appearance or simulation rules change. The complete game rerun abandons old retained programs, restores rendering without GL errors, preserves exact native snapshot/plants/structures/chunk inventory, and visibly restores the approved moss, mud and shadows. See game-retention-context-before.png and game-retention-context.png. The ordinary context-loss notification remains visible in the latter. Tests verify material and shadow invalidation as well as program-lease safety.

Recovery of all cached chunks is progressive (one admitted cache target per update); this does not promise an artifact-free first recovery frame. Other biome caches and full active-simulation context recovery remain unverified. This issue was independent of enabling program retention but was discovered by its full-game validation.

## Full regression suite, 2026-10-24

`npm test` completed 4784 tests in 398.53 seconds: 4721 passed, 62 skipped and one failed. The sole failure was `sfx-catalog-audit`: its generated source inventory still contained old hashes for main.js/scene.js and an old scene.js line number. Regenerating with `node tools/audit_sfx_catalog.mjs` changes only those three metadata entries. All 126 original sound bytes and all assignments remain unchanged. The targeted three-test catalogue suite then passes. This is a full-suite run followed by a targeted repair/rerun, not a second all-green full-suite execution. Existing campaign, navigation, save/load and rendering tests reported no failures; these ordinary tests do not replace pthread-specific concurrency tests.

`benchmark-spatial-thread-matrix.mjs` adds a serial six-biome A/B/A/B driver over the real-game harness. Each run pauses simulation, warms for 60 frames, completes two 240m outward/return legs and drains the stream, enabling the GPU timer. It asserts exactly 50 installations, no cancellations, equal per-leg chunk keys, camera, resident prop count, sectors and GPU hardware. Program retention and staged installation are disabled to isolate the threading change. Separate logs and PNGs are retained per run; pre-existing log paths are refused. Default quality is medium, override WG_THREAD_QUALITY and WG_MATRIX_OUT for a separate low-quality run. This harness does not establish active-simulation or visual acceptance by itself.

The first matrix attempt was correctly stopped by the work-count assertion in Desert (37 installations, only five resident at the first stop). The old completed-leg wait observed only the near-chunk queue, which can be idle before Desert/Canyon's asynchronous horizon is adopted and requests the new near region. The harness now requires twelve consecutive frames with no horizon request/work, no near work and every desired chunk installed. Initial `matrix-media` results are superseded by `matrix-media-settled`; no production rendering behavior changed for this correction.

## Completed six-biome equivalent-work ABAB

All 24 runs pass the equivalent-work checks on Intel UHD at 720p, medium quality. See [full results](matrix-media-settled/RESULTS.md), raw JSON/PNG and image-differences.json. Each run installs 50 chunks; all end with the same per-biome inventories, 25 native residents, 400 sectors and 16 MiB WASM capacity. No unexpected browser errors; the existing f_environment4 shader warnings remain. Simulation is paused, and jumps between two camera positions are deliberately stressful. This is additional evidence alongside earlier active continuous-camera Mangroves ABAB, not a substitute for it.

Mangroves synchronous RAF means are 56.95/54.29ms versus 28.08/28.76ms threaded; p95 99.78/99.79ms versus 50.02/66.26ms. Total observed RAF interval changes from 4556/4506ms to 4240/4257ms: smoother rendering does not imply generation completed twice as fast. Synchronous generation costs 43.30/43.07ms on main versus publication 0.69/0.68ms. Graphics installation still averages 16.42/16.40ms threaded and is an unresolved contributor.

Mean frame intervals improve in all six biomes, but maxima do not consistently improve. Gran Rio threaded maxima are about 150ms versus 100ms synchronous. Gran Canyon completes the same itinerary in 2860/2910ms versus 2611/2711ms synchronous despite better frame averages. Do not call the whole stutter objective complete or hide these regressions. GPU sample means vary with frame mix and include pipeline bubbles; no shader optimization is inferred from them.

Viewed A/B pairs for all six biomes retain their terrain, vegetation, water and shadows. Full-frame RGB MAE ranges from 0.00000072 to 0.002674 on the 0–255 scale, with localized maximum channel differences up to 65. The approved Mangroves moss/mud, fixed512 cache and fern LOD remain visible. Numerical closeness supplements this review; it does not prove all cameras, night or active simulation are equivalent.

## Distribution refreshed after streaming/context fixes

`npm run package:itch` passes at production source commit 539e82b34: 997 files / 491,962,778 bytes, 841 relative links and 17 runtime GLBs. ZIP size is 433,881,955 bytes with CRC verification. The nested-URL Chrome runtime test again reports isolation/shared memory true, worker identity 1 and successful publication. This remains a local packaging check, not a deployment to itch.io.

`npx tauri build --no-bundle -- --locked` rebuilds the release executable successfully. Both native Windows/WebView2 smoke modes then exit zero and report ok=true with no errors: pthread preparation/publication across six biomes, and normal full-game startup. See tauri-pthreads-current-20261024.json, tauri-game-current-20261024.json and distribution-current-20261024.json for artifact hashes and scope. No installer bundle or non-Windows target is validated here, and normal game startup does not itself assert its backend; the separate pthread test does.

## Tail attribution and application program retention

The GL-instrumented Gran Rio run (`tail-gran-rio.json`) records seven slow getProgramInfoLog calls, all with cache keys already present in the initial warmed set; one waits 95.5ms. Native publication peaks at 1.53ms, graphics installation at 11.3ms. The remaining long draw is shader recreation, not native generation.

An application-option ABAB in Gran Rio and Gran Canyon completes the same 50 installations per run (`matrix-program-retention/RESULTS.md`). Gran Rio retains 73 programs while 74 exist after warmup: one unretained cache key still recreates twice, producing two slow calls in both B runs. Maxima improve from 133/150ms to 100/116ms, but p95 is inconsistent. Canyon retains all 60 initial programs, eliminating the measured slow GL calls; maxima improve from 166/166ms to 133/133ms. retainPrograms remains opt-in; this is not sufficient evidence to enable it globally.

The Canyon CPU profile with retention (`tail-canyon-horizon.json/cpuprofile`) isolates another cost: horizon update peaks at 107ms, including natural-water shore-mask preparation up to 88.7ms. Full syncChunks peaks at 190.9ms. CPU samples attribute about 144ms over both jumps to native removals and about 152ms to surface sampling; sampling totals are diagnostic, not standalone timings. No material simplification is made. Shore-mask preparation remains synchronous and is still pending work.

## Experimental atomic batch eviction

Repeated individual removals refresh neighboring navigation borders even when those neighbors will immediately be removed too. New spatial_remove_chunks input/API removes the full requested set first, refreshes surviving boundary sectors once each, and repopulates the selected visual payload at most once. It runs synchronously in one short main-thread call; it does not expose partially updated navigation between frames. Residency revisions invalidate in-flight preparation. Input staging is main-thread-owned, bounded to 4096 coordinate pairs (32 KiB), reused across calls; worker scratch never reads it. Older standalone binaries fall back to individual removal through the JS facade.

The renderer uses this only with `chunkEviction=batch`, off by default. Meshes are removed and native eviction finishes in the same syncChunks call. No navigation queries or awaits are introduced in between. Other eviction paths retain their existing behavior.

`check-spatial-thread-batch-eviction.mjs` passes 5292 exact route comparisons across six biomes/six profiles against the unchanged standalone module, with a worker-permeable barrier and polygon present. It tests retained/removed boundaries, duplicate/missing requests, invalid inputs, selected-payload consistency, resident prop/sector counts, full eviction, and an observed-running pthread job rejected after eviction then successfully retried. Nineteen targeted renderer/stream/retention tests pass. The initial draft fixture supplied barrier arguments incorrectly; corrected to the actual center/half-extents API with explicit success and barrier-count assertions before accepting the result.

Real Canyon ABAB (`matrix-batch-eviction/RESULTS.md`, no program retention) completes 50 identical installations in all runs. Individual eviction totals 127.4/114.4ms over 50 calls; batching totals 9.13/9.34ms over two calls. RAF maximum falls from 183.0/166.3ms to 116.5/116.4ms, and total observed interval from 2860/2860ms to 2727/2727ms (~4.7%). p95 is mixed (16.98/16.95 versus 33.18/16.88ms); do not claim uniform tail improvement. One image pair is byte-equivalent in RGB, the other differs by at most one channel level; reviewed Canyon terrain/water/shadows are preserved.

Batch eviction is promising but still opt-in pending active-world, camera-continuous and wider rendered-biome validation. The refreshed pthread binary includes this API; the previous packaged/Tauri reports predate it and are not acceptance evidence for the new binary. Remaining horizon-mask and other graphical installation stalls prevent closing the primary objective.

## Incremental horizon shore map: measured, not adopted

`prepareNaturalWaterBed` separates CPU sampling/packing from texture/material adoption. The default synchronous wrapper drains the same algorithm without yields. With `horizonBed=staged`, a streaming horizon prepares its map in bounded batches (128 surface queries per yield, 1024 encoded texels per yield); initial loading remains synchronous. The old horizon, clipping bounds and resident region stay in place until the complete new map is ready. Camera/key, terrain revision or material-type changes discard private preparation. Disposal returns the iterator and releases its uninstalled geometry. Adoption uses the finished map without resampling. This is incremental main-thread **graphics preparation**, not pthread generation; native chunk generation remains on the existing shared-memory worker.

Eighteen relevant tests pass, including exact packed bytes/range/bounds against the original Canyon implementation at maximum 513² size, no repeat sampling during adoption, retention of old clipping/region, revision cancellation and disposal. The game comparison waits for pending shore preparation as well as horizon/native queues. `horizonBedBudget` is an experimental clamped 0.5–8ms scheduling budget; default 2ms. It bounds the sampling work between checks, not all geometry/adoption work or the whole frame.

Both real ABAB series use pthreads, batch eviction, no program retention, 50 identical installations and medium 720p Intel UHD. A is synchronous shore preparation; B is incremental:

| Budget | A total RAF ms | B total RAF ms | A max frame ms | B max frame ms |
|---|---|---|---|---|
| 2ms | 2760 / 2644 | 3991 / 4057 | 132.9 / 116.4 | 66.6 / 83.0 |
| 6ms | 2811 / 2794 | 2960 / 3309 | 116.3 / 132.9 | 82.9 / 116.3 |

The 2ms variant reduces large frame stalls but delays completion by 45–53%. At 6ms the delay is 5–18%; the second B run also worsens mean/p95 (18.59/33.20 versus 18.26/16.91ms). Adoption still peaks around 21–25ms inside horizon.update despite the smaller sampling budget. **Do not enable this by default:** splitting work alone does not provide a convincing overall tradeoff. Keep as a reproducible QA alternative, not an achieved optimization. Next investigation should reduce or offload the map computation rather than continue tuning small budgets.

Reports/captures: `matrix-horizon-bed` and `matrix-horizon-bed-6ms`. Viewed images preserve Canyon terrain, water and shadows. Larger full-frame differences occur in animated right-side UI; excluding only x1000..1249/y360..549 gives exactly equal RGB for both 2ms pairs and MAE 0.00000839/255, max 5 for both 6ms pairs. Full-frame statistics are retained separately; UI exclusion is supplemental and explicitly recorded. No map resolution, lighting or vegetation reduction was used. Current distribution acceptance still needs fresh builds after the experimental changes.

## Batched native height queries for Canyon horizon (experimental)

The remaining Canyon shore-mask sampling repeatedly crossed JS/WASM and recalculated the same integer interpolation corners. `spatial_surface_grid` batches a regular grid in the authoritative runtime, caches corners only for the duration of the call, and restores selected sampling state with the existing scoped sampler. It does not run on a worker or mutate navigation. Only Canyon is supported; other biomes, old standalone binaries and oversized requests return null and preserve scalar sampling. No geometry, material resolution, normals or lighting changes.

The buffers are main-thread-owned and reused. Queries accept at most 513x513 outputs and 524288 corner cells: logical storage is at most about 5.51 MiB (float outputs, double corners, validity bytes), excluding vector spare capacity. No cache survives a query as valid, so world edits cannot leave stale heights. The returned WASM view is borrowed; shore packing consumes it synchronously with no yields, before another grid query. Whole-WASM capacity remains 16 MiB in all four rendered comparison runs, not a measurement of exact heap allocation or GPU memory.

`check-spatial-surface-grid.mjs` compares 578438 heights exactly for two seeds, negative/fractional coordinates, resident/nonresident boundaries and a placed settlement, while a native job starts in observed-running state. Snapshot/selected chunk remain unchanged; worker identity and successful publication are checked. This is correctness evidence, not a controlled timing benchmark. Twenty-three relevant rendering/stream tests pass, including native-grid/scalar packed-byte equality and fallback.

Real Intel UHD 720p medium ABAB, both pthreads plus batch eviction, completes the same 50 installations (`matrix-horizon-native-grid/RESULTS.md`). Horizon.update maximum drops from 81.43/89.35ms to 35.00/36.92ms. Frame maxima drop from 132.92/116.40ms to 83.15/83.15ms; means from 18.31/18.50ms to 17.85/17.61ms. Total itinerary falls from 2710/2959ms to 2677/2677ms (1.2% and 9.5%). The variable total improvement warrants caution. Full-frame RGB MAE is 0.000008/0.000011 on a 0–255 scale; viewed terrain, water and shadows match. GPU sample means do not demonstrate a shader improvement.

`horizonBed=native-grid` remains opt-in. This reduces repeated work, but leaves synchronous preparation around 35ms and frame tails around 83ms; it does not close the streaming-stutter objective. Active-world validation and current package builds remain required. The main shared-memory pthread chunk pipeline, fixed512 Mangroves cache and fern LOD are unchanged.

## Active-world smoke after batch eviction and native grid

`check-spatial-active-batch-grid.mjs` passes in all six biomes at medium 720p. Each 144m continuous camera traversal incorporates 15 new chunks with the simulation advancing, real pthread publication, batch eviction, zero synchronous native generation calls, valid GPU timer samples and no unexpected browser errors. These short runs are functional smoke tests, not equivalent-state A/B benchmarks or full campaign validation. The native grid option affects only Canyon horizon water sampling. See `active-batch-grid/summary.json`.

## Far-background capture gate correction

The user identified apparently floating distant trees in the settled streaming screenshots. The old QA completion gate waited for near chunks and NativeHorizon, but omitted far-vegetation regional workers, seam/GPU preparation and standby preparation. Thus earlier matrix "completed itinerary" totals measure the near/horizon itinerary and may end before all far scenery is ready. Pairwise pixel similarity alone did not establish fully settled background correctness. Preserve the raw measurements, but do not treat them as full-scene streaming acceptance or adopt optional optimizations from those totals alone.

A dedicated frozen-camera probe captures initial loading, 300 additional frames, and an outward/return trip with 300 frames per stop. In Sabana the late screenshot has terrain under the distant trees; after return all far preparation flags are false and the ground mesh remains present. The same late-camera check now passes in Gran Rio and Volcanes with pthreads, and Sabana with standalone WASM: both far ground and seam meshes are present, every far preparation flag is false, no unexpected errors, and viewed late screenshots show ground under distant trees. These checks do not reproduce a persistent hole; the earlier capture issue is consistent with unfinished far preparation. They do not guarantee zero transient gaps during travel. The benchmark gate now additionally waits for every far adapter's preparationPending() and records final status/errors. Updated full-background measurements are required.

## Native-grid ABAB with the corrected far-completion gate

`matrix-horizon-native-grid-far-settled` repeats the four-run Canyon comparison while waiting for every far adapter. Both variants finish with no far preparation pending or adapter errors. A/B frame maxima are 132.98/66.52ms and 116.30/83.10ms, but total RAF intervals are 2710/2760ms and 2744/3209ms. The second B p95 is worse (33.15 versus 16.85ms). Thus the reduced shore calculation still does not establish a consistent overall streaming improvement. **Keep native-grid opt-in; do not adopt it as the default solution.** This supersedes the earlier near-only completion totals for adoption decisions. Viewed captures retain Canyon ground/water/shadows; full-frame RGB differences are retained rather than hidden. The current binary also passes the six-biome batch-eviction/navigation differential again. The independent shared-memory pthread generation remains enabled where supported; this decision concerns the optional horizon optimization only.


## Complete far-scene benchmark and refreshed distributions (3f21b8353)

The replacement `matrix-media-full-far/RESULTS.md` contains all 24 sequential Intel UHD 720p medium ABAB runs, with identical 50 installations and final 25 residents. Each stop now waits for near chunks, horizon and every far adapter plus twelve stable frames. All runs finish with far preparation settled and no adapter errors. Previous near-only completion times must not be treated as full-scene latency.

Mean frame time improves in all twelve pairs. Mangroves changes from 53.04/49.54 ms to 29.53/28.66 ms; p95 from 116.38/99.67 to 66.36/66.67 ms. Synchronous native generation averages 44.75/40.84 ms per chunk; pthread publication averages 0.69/0.70 ms without regeneration. Graphics installation remains 17.23/16.23 ms in B. Several other biomes have worse maximum frames despite lower means. Full itinerary completion is not uniformly faster. This demonstrates off-main generation and improved average cadence, not elimination of all graphics streaming stalls.

Full-frame image differences are recorded, including HUD. Reviewed Mangrove A1/B1 retain ground color, moss/mud transitions, fern density, water and shadows. The settled Sabana, Gran Rio and Volcanes images have terrain beneath distant impostors. Transient missing far ground during movement remains a production limitation; extending the QA readiness gate is not a visual fix.

Fresh `package:itch` passes: 997 files, 491976315 uncompressed bytes; ZIP 433886209 bytes. The package probe rejects stale emitted runtime artifacts, then tests six biomes both under a nested path and inside a delegated isolated cross-origin iframe. Both use shared memory and native worker identity 1, publish successfully, and release workers. Each observes 16 MiB linear capacity and 64 KiB reserved worker stack, not peak stack/heap use. See `thread-package-iframe-3f21b8353.json`.

The release Windows executable rebuilt successfully with `npx tauri build --no-bundle -- --locked`. Both actual WebView2 smoke modes exited zero, report ok=true and no errors: six-biome pthread preparation/publication and ordinary game startup. Reports and SHA256 hashes are in `tauri-pthreads-3f21b8353.json`, `tauri-game-3f21b8353.json`, and `distribution-3f21b8353.json`. These validate local packaging and Windows; actual itch hosting, installer bundles, other desktop platforms and broad campaign soak remain unclaimed. PR159 remains draft.


## Mangrove remaining streaming attribution (complete far gate)

`tail-mangrove-full-far.json` records a diagnostic pthread run with 50 installations, all far adapters settled, CPU sampling and detailed wrappers. This instrumented run is attribution evidence, not an uninstrumented performance comparison. `tail-mangrove-full-far-attribution.json` retains the compact breakdown and exclusive profile samples.

There is no synchronous native generation. Publication averages 0.83 ms, while graphical installation averages 19.81 ms and reaches 59.19 ms. Water-bearing chunks spend 8.52 ms mean / 18.19 ms maximum in natural-water preparation; mangrove bank preparation averages 2.98 ms, mud-edge interpolation 4.38 ms. Fixed512 cache update averages only 0.12 ms CPU (GPU cache execution is separate). Do not sum nested function timings or interpret these as shader GPU cost.

Individual native evictions total about 193 ms over 50 calls; syncChunks reaches 137.78 ms. Five getProgramInfoLog calls exceed 20 ms, including a 78.28 ms wait, and all five use keys that were already warmed. Shader lifetime/recreation remains another independent tail cost. Neither observation supports simplifying fern density or the approved ground material. The next controlled experiment is atomic batch eviction with the full far-completion gate; it must improve whole-frame metrics, not just the removal function.


The completed Mangrove ABAB is in `matrix-mangrove-batch-full-far/RESULTS.md`. Batching reduces summed native removal CPU from 120.77/110.96 ms to 7.25/8.76 ms and maximum syncChunks from 67.07/63.68 ms to 8.73/9.41 ms. However, frame maxima remain 99.84/116.36 versus 100.12/116.44 ms; p95 stays about 66.5 ms. Complete itinerary is 4456/4606 versus 4473/4407 ms, and means are mixed. Therefore keep batching opt-in: it removes a redundant CPU burst but does not by itself solve the measured whole-frame tail. Investigate the independently confirmed shader recreation and graphical preparation next. No production default or artwork changed in this checkpoint.


## Retained obstruction variants during loading (experimental)

The complete-far Mangrove retention ABAB (`matrix-mangrove-programs-full-far`) lowers p95 from 82.85/66.53 to 49.94/49.91 ms. It retains 79 initially warmed programs, but an obstruction partial-blend variant appears later and still causes 68-87 ms getProgramInfoLog waits. This variant is outside the opening snapshot, rather than a failure of the acquired references.

New opt-in `warmObstruction=1` prepares the exact live partial-blend material recipe during loading. It borrows resident LOD geometry in compile-only representatives, shares the material factory with live fades, and retains those private materials until `retainPrograms=1` acquires the bounded program snapshot. Teardown/quality/context-loss paths release owned resources without disposing borrowed geometry. No visible meshes, shaders, fade behavior, density or dynamic lighting are changed. The first experimental collection used merged groups before they existed and did not cover the missing variant (`matrix-mangrove-obstruction-warmup`); that failed result is retained and is not acceptance evidence.

The corrected resident-source ABAB (`matrix-mangrove-obstruction-warmup-resident`) retains 81 programs instead of 79. Both B runs have zero instrumented GL calls above 20 ms; A has the recurrent partial-blend compilation waits. Maximum RAF changes 116.56/99.64 to 83.08/100.06 ms; p95 remains about 50 ms. Total itinerary changes 4224/4207 to 4307/4124 ms, so this is not a consistent end-to-end win on its own. Keep opt-in. The independent eviction burst and water preparation remain. A combined test is warranted before adopting either option, because each removes a different confirmed blocking interval.

Viewed corrected A1/B1 retain ground, vegetation, water and shadows; full-frame RGB MAE is 0.000348/0.002565 on the 0-255 scale, including HUD. Twenty-six targeted tests pass (asset grouping/culling/dirty ranges, preparation lifetime, program retention, fade warmup and SFX inventory). Web build passes. Existing packaged WebView2 evidence predates this optional warmup; no new desktop release validation is claimed. The shared-memory pthread runtime itself is unchanged.


## Combined reuse and direct wetland queries

`matrix-mangrove-stream-reuse` compares default pthread streaming with batch eviction + retained programs + resident obstruction warmup. In medium quality, maxima fall from 99.74/99.78 to 66.56/83.24 ms, but full itinerary changes from 4490/4423 to 4091/4473 ms and mean/p95 are not uniformly better. The low-quality repeat (`matrix-mangrove-stream-reuse-low`) has means 24.79/24.74 versus 23.64/24.05 ms and maxima 99.68/83.36 versus 66.53/83.14 ms; total completion is 4140/4057 versus 3924/4257 ms. This supports fewer blocking bursts, not a consistent whole-itinerary acceleration. Keep opt-in pending broader active-world validation.

Natural water preparation calls the composite waterInfo only to consume its wetland mask. New opt-in `waterBedDirect=1` instead queries that mask and reads the native constant fluid level once per map. The legacy path remains default and remains the fallback for terrain views without the optional mask method. The packed-map test asserts exact equality across more than 9000 samples, including bounds/range/bytes, with zero composite calls in the direct path. Existing six-biome native terrain-view tests also pass (11 targeted tests total); web build passes.

`matrix-mangrove-direct-water` isolates this option with batch eviction/retention/warmup enabled in both arms. Graphics installation averages 16.45/17.80 ms in A versus 15.65/15.56 ms in B. Frame means are mixed (27.38/28.91 versus 27.64/28.05), p95 remains about 50 ms, and total completion is 4024/4423 versus 4090/4123 ms. The limited saving does not justify presenting this as the structural solution to streaming. It is retained only as a reproducible disabled QA option. No density, geometry, material shading, map resolution, lighting or shadow changes are involved; full-frame pixel differences are recorded separately and include HUD. Do not claim new visual acceptance from the pixel metric alone.

These experiments narrow the remaining work: redundant calls and shader recreation are measurable but are not sufficient on their own; resident graphics preparation still averages about 16 ms. The primary pthread/stutter objective remains open. No additional distribution validation beyond the earlier explicitly recorded checkpoint is implied by a web build.


## Full suite and active default-path low-quality validation

At source checkpoint `1a63ad399`, `npm test` finishes with exit 0: 4791 tests, 4729 pass, 62 skipped, zero failures/cancellations, 400.37 seconds. `full-suite-1a63ad399.json` records the command, totals and local log hash. Skips are not passing evidence, and Node campaign cases do not substitute for rendered concurrency validation.

`check-spatial-active-default.mjs` runs the unchanged default pthread path (single eviction, no retention, no obstruction warmup, no direct-water query, synchronous graphics installation). Six daytime low-quality 720p Intel UHD cases each publish 15 chunks over a continuous 144m/360-frame camera path. Simulation advances 6.3-10.1 seconds, actors are ready, no sampled frame is paused, synchronous native generation count is zero, all far preparation settles without adapter errors, and WASM capacity stays 16 MiB. Reports are split between `active-default-low` (Sabana, Desert) and `active-default-low-remaining` (Rio, Volcanoes, Mangroves, Canyon).

The initial Rio attempt failed before generating chunks because Chrome reported ERR_NETWORK_CHANGED across asset fetches; the game showed Failed to fetch. Its terminal failure is preserved as `active-default-low/gran-rio-network-failure.json`. The new-directory repeat passed; results were not overwritten or silently filtered.

The first night fixture advanced simulation but generated zero chunks because the production raid camera superseded the QA camera movement. It is preserved in `active-default-mangrove-night` and is explicitly rejected as streaming evidence. The corrected case, `active-default-mangrove-night-controlled`, starts at time/elapsed 450 and disables only the raid-camera update in the QA browser while the authored path runs. It publishes 15 chunks with simulation advancing 12.24 seconds, all 360 sampled frames ready/unpaused, no synchronous generation or unexpected errors, final far scenery settled and 16 MiB WASM. This is controlled nighttime streaming, not the dusk transition or ordinary user interaction with the night camera. The screenshot was inspected: night ground, vegetation and water are rendered; a guardian overlay is present.

Active-run frame means/p95/max are diagnostic, not A/B acceptance, because simulations evolve by wall-clock time. Day Mangroves still reaches 182.76 ms maximum (28.50 ms mean, 50.06 p95); controlled night reaches 116.46 ms maximum (34.04 mean, 50.44 p95). These strengthen functional evidence without claiming graphics streaming stalls solved. No artistic changes or renderer defaults were made in this validation pass.

## Adopted: pthread preparation of Mangroves water maps

The user approved this direction after the controlled `matrix-mangrove-prepared-water` experiment. Mangroves now requests the existing water-bed texture data from the native preparation worker by default. `waterBedWorker=0` remains a QA baseline. Other biomes and standalone/no-isolation runtimes retain the existing path. Initial resident chunks also retain the original preparation path. Lighting, normals, shadows, geometry and GPU texture representation are unchanged.

The worker owns its temporary data; publication still checks revisions. JavaScript copies the compact bytes before publication/release. It does not regenerate the map at incorporation. Cancellation and stale publication discard the job's data. This adds no GPU texture beyond the one already used by the original path.

`check-spatial-prepared-water.mjs` checks 128 chunks across eight seeds, including negative and distant coordinates: 46 nonempty maps / 719188 bytes exactly matched the original implementation; 82 were empty. It also checks disabled preparation, cancellation, stale world revision/retry and another biome.

Controlled A/B/A/B at 720p on Intel UHD: mean water preparation for the 32 water-bearing chunks fell from 7.22 ms to 0.06 ms (remaining texture setup). Mean whole graphics installation across 50 chunks fell from 15.55–15.86 ms to 11.11–11.93 ms. Native generation increased from 44.85–45.09 ms to 47.26–49.09 ms, off the main thread. Shared WASM capacity stayed at 16 MiB; the 32 copied maps totalled 576348 bytes over the route, not simultaneously resident memory.

Whole-frame averages remained mixed (A: 26.94/27.71 ms; B: 27.57/27.49 ms), with roughly 50 ms p95 in both. This is an adopted reduction in main-thread installation cost, **not proof that all streaming stalls are solved**. Other reuse/eviction experiments remain opt-in. Images and full records are in `matrix-mangrove-prepared-water/`; package runtime evidence is `prepared-water-package-runtime.json`.

Next attribution target: `prepareMangroveBank` still samples `waterInfo` per water vertex on the main thread. Moving its static shore attribute into the same revision-checked worker payload is a plausible next experiment; preserve exact attributes and measure total installation before adopting. Mud geometry and mud-edge masks remain separate costs, not yet moved.

Default-path check: `active-prepared-water-default` ran 360 frames on low quality with active simulation, installed 15 chunks, and received eight prepared water maps (109820 copied bytes). All 25 targeted stream/terrain/water/audit tests passed. The refreshed package runtime check is `prepared-water-adoption-package-runtime.json`; it verifies the built runtime in nested and cross-origin-isolated iframe contexts, not an uploaded itch.io deployment.

Windows release was rebuilt after adoption. `prepared-water-adoption-tauri-pthreads.json` validates the packaged shared-memory runtime across six biomes in WebView2; `prepared-water-adoption-tauri-game.json` records the ordinary game smoke test. These are smoke/runtime checks, not full campaign acceptance or tests on other desktop platforms.

## Follow-up candidate: prepared bank attributes (not default)

`waterShoreWorker=1` requests one float per native water vertex from the same revision-checked pthread job, alongside the adopted water map. It preserves the float ABI and the existing `wetShore` attribute, material shader, dynamic lighting and shadows. The main thread copies the array before publication and release, then binds it without per-vertex terrain queries. The fallback remains the original `waterInfo` loop. No new worker, WASM world, GPU texture or rendering pass is introduced.

The expanded differential check covers 128 chunks/eight seeds, including distant and negative coordinates: all 181101 shore values matched the original Float32 attributes exactly; the original 46 water maps / 719188 bytes also remained identical. Cancellation, stale publication/retry, disabled options and non-Mangroves still pass. The cancellation test now observes the queued-to-running transition without a scheduled delay that could miss the running state; this bounded spin exists only in the native concurrency test, never the application.

`matrix-mangrove-prepared-shore` uses the adopted water preparation in both A and B, otherwise default streaming (individual eviction, normal shader lifetime). Four serial runs, same Intel UHD, medium quality, 720p, 50 installations each, paused populated world, same completed far/near scenery and camera. Bank installation: 2.55/2.46 ms -> 0.042/0.039 ms; whole graphics installation: 11.86/11.62 -> 10.26/9.84 ms. Shared WASM capacity remained 16 MiB. The 32 copied shore arrays total 536460 bytes across the itinerary, not simultaneous resident usage. They replace the Float32 arrays previously allocated by the renderer.

Whole itinerary: 4389.89/4456.32 -> 4373.12/4273.60 ms (0.4%/4.1% shorter). Mean frame time: 28.69/29.13 -> 28.58/29.07 ms. p95: 66.40/50.02 -> 66.47/66.48 ms; worst frame: 116.31/116.35 -> 116.40/99.78 ms. Thus CPU installation improves consistently, but two pairs do not establish a robust frame-tail improvement. Keep the shore option experimental; the previously approved water-map path stays on by default. Do not claim the complete streaming objective finished.

Both first-pair real screenshots were visually inspected: water bank, ground cache, ferns and shadows remain consistent. Pixel comparisons are supplemental (full-frame MAE 0.00482/0.00011 on a 0–255 scale); they include UI and timed visual effects. No density, texture resolution or lighting was reduced. The next remaining measured preparation cost is `bindMangroveMudEdges` (~3.4 ms per affected chunk), whose clipping/mapping inputs require a separate exactness analysis before moving them.

`active-prepared-shore-night` also passed on low quality: 360 frames with active simulation, 15 incorporated chunks, eight prepared bank arrays (96900 copied bytes), zero paused frames and continued actor readiness. The night fixture fixes initial time and overrides raid camera motion for the authored route; this is a functional check, not a matched A/B benchmark or dusk-transition test. The real screenshot was inspected. Current native code additionally retains the water-only mode with no bank output.

The candidate runtime was rebuilt and repackaged for web; `prepared-shore-package-runtime.json` passes six biomes under nested and cross-origin iframe deployment locally. Windows/Tauri was validated for the preceding adopted water-map checkpoint, not rebuilt for this optional bank candidate. That and additional matched low-quality measurements remain adoption gates.

## Bank candidate: low-quality follow-up

`matrix-mangrove-prepared-shore-low` repeats A/B/A/B at 720p on the same Intel UHD. Installation means: A 12.22/11.71 ms, B 10.34/9.94 ms. Completed itinerary: A 4340.13/4224.64 ms, B 4140.49/4090.58 ms (4.6%/3.2% shorter). Mean frames: A 24.52/24.85 ms, B 24.79/24.49 ms. Maxima: A 83.26/116.39 ms, B 99.71/83.04 ms. Both pairs have roughly 50 ms p95. Geometry/work counts match and both first-pair screenshots were inspected; RGB MAE 0.000315/0.000175 on 0–255 scale. Thus the bank candidate consistently reduces installation CPU and completion time across four medium/low pairs, but does not independently eliminate frame stalls.

The recorded `getProgramInfoLog` calls still block for 20–70 ms in both variants, including recreated ground, mud and partial-obstruction programs. These timings include driver synchronization/compilation and are not shader execution GPU time. Next controlled comparison combines prepared bank attributes with the existing bounded program retention, obstruction warmup and batch eviction, **against the currently adopted water-map baseline**, not the obsolete all-synchronous baseline. This is a combined integration comparison, not attribution of its gain to any single component.

## Combined prepared-bank/reuse result on the current baseline

`prepared-stream-reuse` holds adopted worker water maps on in both variants. B additionally uses worker bank attributes, batch eviction, bounded warmed-program retention and obstruction warmup; A uses the present default. No scene simplification. Four runs each at 720p low and medium on Intel UHD, with matched completed scene inventories, identical camera/fixture and GPU timers without disjoint results.

| Quality | Pair | A/B mean frame ms | A/B p95 ms | A/B maximum ms | A/B completed itinerary ms |
|---|---|---|---|---|---|
| Low | 1 | 24.27 / 23.32 | 49.98 / 33.46 | 83.18 / 83.03 | 4223.63 / 3708.06 |
| Low | 2 | 27.29 / 23.40 | 49.98 / 33.51 | 133.03 / 66.50 | 4639.42 / 3907.86 |
| Medium | 1 | 28.80 / 27.25 | 66.50 / 49.88 | 116.58 / 99.79 | 4406.60 / 3924.37 |
| Medium | 2 | 28.22 / 27.67 | 66.43 / 49.95 | 116.06 / 83.19 | 4290.17 / 4123.54 |

The combined candidate improves completion by 12.2%/15.8% low and 10.9%/3.9% medium, with lower p95 in all four pairs. Slow GL calls (>20 ms) fall from 5/5 and 7/6 to zero in each B run. This is evidence for the combined configuration; do not assign all gains to pthread bank work. The initial retained snapshot contains 74 low or 81 medium programs, below the cap of 96. Driver program memory cannot be measured reliably through WebGL; 16 MiB WASM capacity is not GPU memory. Warmup moves some compilation into loading, whose full overhead is not included in these streaming windows.

Both first-pair images for each quality were inspected. Full-frame RGB MAE stays below 0.002/255; animated/UI pixels prevent universal exact screenshot equality. Geometry, material composition, fixed512 cache, fern density and dynamic lighting remain unchanged.

`active-prepared-reuse-night` passes the combined configuration with active night simulation and continuous camera, 15 publications, batch removals, eight prepared bank arrays, no paused frames, and actors ready throughout the measured frames. This remains a finite functional test with a QA raid-camera override, not a full campaign or matched night performance claim. Thirteen targeted retention/obstruction/stream tests passed. The Windows release was rebuilt at 7d2bab914, and `prepared-shore-tauri-pthreads.json` passes the packaged shared-memory runtime for six biomes; it does not exercise the optional rendered bank configuration in Tauri.

Decision: the combined configuration is a supported candidate for default adoption in Mangroves. Keep the current defaults until the adoption change itself is checked (including actual default selection, context/quality lifecycle and loading overhead). Do not generalize these performance gains to other biomes or mark the overarching pthread/streaming objective complete. The dominant remaining recorded stalls are shader synchronization and graphics/far-scene installation, not synchronous procedural chunk generation.

## Adopted Mangroves streaming configuration

Following the four positive low/medium A/B pairs, `streaming-options.js` now selects prepared water/bank data, batch eviction, obstruction warmup and bounded program retention by default for Mangroves only. QA may explicitly select the former configuration (`waterShoreWorker=0&chunkEviction=single&warmObstruction=0&retainPrograms=0`); disabling worker water also disables its dependent bank payload. Other biomes keep their old defaults. `auto` behaves like an omitted option. The shared resolver prevents the native-input and renderer policies from diverging.

`active-reuse-adopted-default` removes all five streaming QA parameters from the URL and verifies actual runtime options and nonempty retained programs. Mangroves and Sabana each passed 360 active-simulation frames with 15 installations: Mangroves uses prepared bank attributes and batch removal; Sabana retains individual removal and no prepared water. The preserved fixed512 terrain cache and fern LOD remain unchanged.

`reuse-adoption-loading` measures serial A/B/A/B browser launches on the same host. A explicitly selects the previous water-only default; B omits all streaming overrides. Low-quality ready times are A 27053.22/27561.76 ms and B 27553.53/27304.68 ms (+500.31/-257.08 ms). This includes presentation, I/O and driver variability, not pure CPU work or a controlled cold-cache study. The additional obstruction phase is recorded separately in the report. The evidence does not show a consistent total-loading regression; do not claim loading became faster. Streaming benefits are the previously measured 4–16% shorter completed itineraries and lower p95, not these loading totals.

Quality changes and context loss release/abandon the initial program snapshot instead of holding stale handles. Automatic rewarming/re-retention after such changes is not yet implemented: rendering falls back to the ordinary program lifecycle until the next world load. This limits the duration of the reuse optimization, rather than changing world correctness or imagery.

Adoption checks: 19 targeted tests passed. `reuse-adoption-quality.json` cycles media/baja/media/baja, releases all 81 retained references, preserves the authoritative snapshot and continues drawing without GL errors. Program count stabilizes at 104 after the first quality transition; this is the normal renderer collection, not the capped retained snapshot. `reuse-adoption-context.json` abandons all 81 old retained handles, restores a new GL resource epoch and draws the unchanged world. Both logs contain only the already-known f_environment4 shader warnings. `reuse-adoption-fallback.json` removes isolation headers and loads the real standalone fallback with the adopted rendering options; no new browser errors. This fallback remains synchronous and does not inherit the pthread streaming-latency benefit.

Measured obstruction warmup was 130.78/138.63 ms in the two default-loading runs. This is an explicitly measured loading cost exchanged for the verified streaming-tail benefit, not a claim of free optimization. The total-loading A/B difference was mixed.

Final adoption distribution checks: `reuse-adoption-package-runtime.json` passes the rebuilt web runtime at a nested URL and in an isolated cross-origin iframe (six biomes each). The package contains 997 files / 491990051 uncompressed bytes and passes link/resource validation. `reuse-adoption-tauri-pthreads.json` and `reuse-adoption-tauri-game.json` both pass the rebuilt Windows release with no errors. These are local packaging/runtime/game-smoke checks; no actual itch upload, non-Windows execution or full campaign acceptance is claimed.
