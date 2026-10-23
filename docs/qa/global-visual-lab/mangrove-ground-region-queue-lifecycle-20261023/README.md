# Incremental material bake ownership

## Scope and result
The detailed-region QA prototype now uses `MaterialBakeQueue`. One step submits one tile; requests are versioned, duplicate versions coalesce, partial obsolete targets are cancelled, and prior published targets remain available until replacement completion. Admission reserves old plus new mipmapped texture storage within a 32 MiB cap, including the fixed coarse-cache reservation. Owners remove a key on material disposal. The default renderer is unchanged.

This is a generation/lifecycle milestone, **not completed dynamic material LOD**. Coarse generation still uses the previous installer. Camera selection is still frozen. World event registration, camera-driven region relocation, transition blending, eviction of coarse caches and active-streaming performance remain pending. No new FPS claim is made.

## Verification

- `node --test tests/material-bake-queue.test.js`: six tests pass. Coverage includes replacement peak memory, duplicate invalidation, cancelling stale work, unload/reload, failed generation preserving the old target, and owner removal during a draw preventing late publication. An over-budget invalidation cancels obsolete pending data while retaining the resident target.
- Real Chrome/WebGL targets: counts relative to the existing scene are 1 → 2 → 1 → 2 → 0 → 1 → 0 across initial publication, partial replacement, superseding invalidation, latest partial target, unload, reload and disposal. Only revisions 1 and 4 publish. No GL or browser errors.
- Region bake: all 4,210,704 channel values still equal the single-pass reference exactly.
- Whole captured image is pixel-identical to `mangrove-ground-region-tile-verification-20261023/media-regionverify-day-0.png`.
- Near-view cache estimate is 12,654,704 bytes; reservation/peak includes coarse cache plus fine target. The small lifecycle probe separately peaks at 2,048 bytes. Neither figure is driver-level VRAM measurement.

The `bytes` counter includes reservations before allocation. Consequently the cancellation snapshot can show one resident texture and two reserved target allocations. This is intentional conservative budgeting, not a texture leak.

## Reproduce
Run the hybrid measurement harness with WG_VARIANT_SEQUENCE=regionverify, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=near, WG_MODES=cadence, WG_SAMPLES=60, WG_WARMUP=60 and WG_REVIEW_OUT set to this directory. Clear WG_DRAW_CENSUS and WG_FRAME_STEP. The regionverify variant enables QA-only readback and the small render-target ownership probe. Do not use its timing as a performance benchmark.

## Next integration boundary
`scene.installChunk` and `scene.removeInstalledChunk` already identify replacement/removal, and `BiomeGround.attach` owns compact ground/shore masks. Use those lifecycle events rather than polling entities. Quality materials can share masks through `retainBiomeGround`; any persistent cache needs matching ownership so disposal of a clone cannot invalidate another live owner. This linkage is not implemented in this milestone. Keep PR #159 draft and remain on Mangroves.
