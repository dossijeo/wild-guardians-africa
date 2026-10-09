# One bounded next-change proposal, not implementation approval

Current source remains frozenf92; no additional dispatch/GPU/recipe change. Archive run38002516951 first. All previous collective/union/shared-ground/prefetch/menu-pause/full-resource-overlap negatives remain valid. This proposal does not reactivate them.

## Why not change the compiler now

The existing original compiler serially submits batches of eight actual objects, against the complete target scene, then waits all variants stored for materials returned by that submission. It finally performs the existing CPU-budget yield. Some already-ready programs recur among selected materials, but their immediate isReady checks are not demonstrated as meaningful wall cost. This run's current pending program20 is ground resident, newly first selected at job14; eliminating already-ready checks does not make that program ready. Poll/readiness CPU in previous evidence was tiny; tuning the10ms poll is unsupported.

Program19 is shared by many bridge material objects, but binding material/geometry/object distinctions (instancing, batching, morph/skinning, receiveShadow, clipping, stock flags, lights/targetScene) remain real. A dedup key built from customProgramCacheKey or material name alone cannot preserve all generated variants. Conservative identity dedup by exact material+geometry+object envelope would still retain cloned bridge materials and unique chunk geometries; no current count supports a large reduction. Submitting many groups before one union barrier repeats an already tested negative rather than an isolated new insight. No compiler change is selected.

## Proposed isolated scheduling change

Remove only the prelude dependency that waits sky.load before starting the existing catalogue-to-maize-model/bridges chain. Run sky and that existing chain concurrently, join both before the current soil step. Leave soil then mountain atlas strictly serial, keep native batch construction/all warm variants/compiler/fences identical and in their current order. No texture/atlas request overlap, world-stage prefetch, prototype filtering or asset derivative. It is a narrower contrast than failedf738, which additionally launched soil+atlas concurrently with models and changed their adoption order.

Source basis: LoadingDiorama.prepare normal branch first awaits world.sky.load; then loads three catalogues; then existing Promise.all(model,bridges); only then soil, atlas and unchanged warm tail. The maize/catalogue chain does not read sky. GPU warm/material mounting tail needs sky and models, so retain a join before all remaining work. Current early raw: sky6.8603s serial before catalogues.6431s and model pair dominated by bridge11.2116s. Maximum overlap opportunity is bounded by6.8603s in this run, NOT a predicted saving, and less under resource contention. Full combinedf738 showed delivery variability; narrowing concurrency is intended to isolate this dependency, not declare its previous failure solved.

Existing shared Assets cache/URLs remain exact and ownership unchanged. The same World.loadReady calls retain abort/error/deadline semantics. Both sibling rejections must be immediately observed; on first failure real owner error/dispose cleanup still executes, and late shared models remain World-owned, never disposed by the presentation. No visible first frame or readiness is released before both are ready. Memory peak may increase from simultaneous sky+model decoding; physical RAM remains unknown. Keep opt-inOFF initially; no additional flag/wiring until parent review.

## Required evidence before one native comparison

CPU invariants: OFF request/adoption order byte-equivalent; opt-in only changes sky/catalogue/model starts, preserves original model pair and serial soil/atlas/warm tail; exact URLs/one request/cache reuse; real prepare path sky rejection with pending models and inverse model rejection with pending sky, cancel and late decoded model disposal handled by shared Assets exactly once; all siblings observed/no unhandled rejection; successful path requires both completions; no new renderer/GPU calls/readiness weakening. Tests prove dependencies/ownership only, not speed or memory.

If approved, one source-frozen original native90s run with bounded observers should determine whether prelude shrinks without delaying later models/warm path. No timing causal claim from different New seeds/runners/cache/order. Passing native primary and original minimization remains required; no deadline extension or promotion based on a favorable phase alone.

If parent prefers a true request-work reduction over this isolated scheduling change, do not implement it silently. A maize-only GLB/bridge derivative would require an asset pipeline and net duplicate-byte/decode ownership analysis and is intentionally outside this small proposal. Current post-responseEnd observations alone do not justify such a resource rewrite.
