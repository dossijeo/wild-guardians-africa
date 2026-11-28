# Complete 60 Hz capture: evidence and remaining cadence failures

This supplements the [ordinary admission/pick correction](native-ordinary-admission-pick-20261120.md), under the integrated migration plan. Target: **1000/60 ms**. It closes a trace-collection defect, **not A5, A6, C4 or the cadence investigation**. See the [handoff](native-60fps-capture-handoff-20261120.md).

## Implemented and tested

Commit `708eaf6cc` changes only the existing Farm auditor and reporting/tests. CDP now records into an explicit, bounded 512 MiB buffer (`QA_NATIVE_TRACE_BUFFER_MB`, integer 1–1024), with the same requested categories and `recordUntilFull`. The original recording is exported as gzip in awaited 1 MiB reads/writes, without retaining all chunks or concatenating the whole trace. No rolling buffer, sampling, dropped categories or hidden bad frames. Existing evidence cannot be overwritten.

The completion sidecar records browser version, recording options, peak buffer usage, export size/SHA and `collectionComplete`. Missing streams, interrupted exports, format mismatch and any `dataLossOccurred` value other than false fail the auditor. A lossy recording remains archived even when fully exported; an interrupted export cannot become complete evidence merely because CDP reported no recording loss. The reporter accepts raw or gzip, rejects ambiguous pairs, and reports no interval window when no interval exists.

15/15 selected tests pass in `native-trace-stream-tests5.log`: binary streaming, resource closure, idempotent stop, loss/interruption negatives, raw/gzip reporting equivalence, ambiguous evidence rejection and full-history checks. Initial development failures are retained: asynchronous file-open/cleanup race (corrected with explicit FileHandle lifetime), and the report's null interval on a one-frame trace (corrected without inventing a measurement). Syntax check of the original auditor passes. This QA-only change does not claim a new production build or full suite; the prior 1,310-test/build validation retains its stated scope.

## Real GPU result

The [manifest](performance/native-60fps-capture-20261120/manifest.json) preserves 28 artifacts, including the full trace, receipt, checkpoint, exact environment, all 9,065 input fingerprints, reports, logs and desktop restoration receipts. Original source/decoded SHA and stored SHA are verified. Historical failed/overflowing captures remain in the earlier archive unchanged.

`native-ordinary-60hz-stream1`: original Farm cancel-after-task → action → consequence → settlement → next task scenario, youngMale, seed 983, NVIDIA GTX 1660, Edge 157.0.4341.60. Temporary **3840×2160/60 Hz**, no concurrent CPU/GPU work during measurement. Started at `16df3d82d`; production corrections `f9af19d9c` and `7493b4374` unchanged. All frozen inputs unchanged during this run. Sol's subsequent native rebuild is separate work and is not covered by this historical freeze.

| Observation | Result |
| --- | --- |
| Original auditor exit / functional journey / disposal | 0 / passed / drained |
| CDP recording loss / complete export | false / true |
| Peak trace buffer usage | 38.98%, 121 reports |
| Full trace | 84,124,541 bytes gzip; SHA `9ca03333628e9674eeeb4678f1bcd7c45b1d20f21fa1f326791e9ed659699aec` |
| Contiguous terminal draw / opportunity ordinals | 4,964 / 5,008 |
| Draw triggers | 4,962 RAF + 2 mutation-release |
| Opportunities | 4,962 submitted, 32 awaiting preparation, 2 mutation-hold, 12 hidden |
| Ordinary admission sequences | 1,096, all 18 stages complete |
| Maximum draw CPU span / draw-start interval | 8.185 / **168.275 ms** |

Windows was restored to its original 4K/30 Hz mode using the saved original configuration; the registry was not changed. The product target remains 60 fps. The capture is instrumented and headless with a physical adapter: it is not a measurement of pixels scanned out by a visible application. Strict counts above 1000/60 (2,472 draw starts, 2,479 callbacks) include timer/callback jitter and do not by themselves count missed physical refreshes. The large gaps and blocked opportunities nevertheless reject cadence acceptance. No 50 ms threshold is used.

## Confirmed failures, separate causes

1. **Hold 1:** 23.849854 ms, including 6.654785 ms queue drain; blocks opportunity 509.
2. **Hold 11:** only 8.175049 ms, including 3.815186 ms drain, but blocks opportunity 4,961. Its preceding callback interval is 7.830078 ms. A callback arriving late or in a catch-up sequence does not grant a whole refresh period to an asynchronous transaction. The existing post-draw opportunity is useful ordering, not a deadline guarantee. Merely reducing all holds below 16.67 ms would not prove absence of misses. Quiescence/retirement guards must not be removed to improve the counter.
3. **Bootstrap gap:** ordinal 146, sequence 4, clock 10, no installed world boundary: 168.275146 ms between draw starts, drawing itself 0.280 ms. No ordinary admission or causal hold spans this interval. On GPU process 3536/thread 5220, `SkiaOutputSurfaceImplOnGpu::EndAccessImages` spans 178.760 ms with only 2.141 ms CPU. Concurrent `DawnPlatformImpl::RunWorkerTask` on thread 1192 spans 161.961 ms with 161.165 ms CPU. `DXGISwapChainImageBacking::Present` itself is only 0.109 ms. These observations locate a blocking graphics path; they do **not** identify the exact worker task, lock, shader or driver call. Neither wallpaper nor shader compilation is established as the cause by overlap alone.
4. **Other live gaps:** 43.109863 ms (ordinal 2,353), 42.199951 ms (410), 36.834961 ms (4,808). Their causes remain open. Earlier 30 Hz GC observations are not proof of the allocation source in this run. Growing QA history copies are a testable observer-overhead hypothesis, not an established production defect.

The bootstrap interval is retained in the complete history and not excluded from the maximum. Initial preparation cost, incremental demand, hot reuse, transaction blackout and presentation cadence remain independent measurements.

## Source investigation and limits

Pinned public Chromium `671d6af90da4ab79e89cabbd7220cae70025cc11`: [SkiaOutputSurfaceImplOnGpu::EndAccessImages](https://chromium.googlesource.com/chromium/src/+/671d6af90da4ab79e89cabbd7220cae70025cc11/components/viz/service/display_embedder/skia_output_surface_impl_on_gpu.cc) calls each image context's end-access method. [ImageContextImpl](https://chromium.googlesource.com/chromium/src/+/671d6af90da4ab79e89cabbd7220cae70025cc11/components/viz/service/display_embedder/image_context_impl.cc) can retain concurrent read access, otherwise releases its scoped representation. [D3DImageBacking](https://chromium.googlesource.com/chromium/src/+/671d6af90da4ab79e89cabbd7220cae70025cc11/gpu/command_buffer/service/shared_image/d3d_image_backing.cc) has distinct Dawn/D3D end-access, synchronization and fence paths. [DawnPlatform](https://chromium.googlesource.com/chromium/src/+/671d6af90da4ab79e89cabbd7220cae70025cc11/gpu/command_buffer/service/dawn_platform.cc) dispatches generic worker callbacks; the outer trace label does not identify the operation.

Pinned public Dawn `f71aade802862921933aa26ed83c9e15aa249ced`: [CreatePipelineAsyncEvent](https://dawn.googlesource.com/dawn/+/f71aade802862921933aa26ed83c9e15aa249ced/src/dawn/native/CreatePipelineAsyncEvent.cpp) runs pipeline initialization via the async task manager; backend device implementations choose initialization behavior. This supports investigating driver/synchronization work beneath an asynchronous API. It does not prove that the observed task was that pipeline path or held a particular lock. These public revisions are source comparisons, **not a verified match to the installed Edge binary**. Revision receipts are archived.

Next corrections require separate evidence: isolate observer allocations without losing full trace/terminal evidence, attribute the GPU blocking path, and reduce or restructure the existing causal handoff without rendering revoked generations. Sol retains Game/WASM/producer ownership; Astra coordinates any production frontier changes before editing. No new renderer, authority, global cache or scheduler has been introduced.
