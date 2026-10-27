# Material-cache replacement crossfade smoke test

## Implemented
Optional QA variant `incrementalsmooth` blends old/new coarse caches and old/new detailed regions for 180 ms with smoothstep interpolation. It blends the cached material weights/AO/roughness before the existing color/normal/lighting response. It does not blend final lit images or modify scene lighting, shadows, geometry or fern density.

`MaterialBakeQueue` can retain one previous target per key after publication. Both targets remain in its byte budget until explicit release. A further replacement for that key returns `transition` and is reconsidered when the blend completes. Unload/disposal releases current and retained data. Default callers still release old targets immediately; the game default remains unchanged.

## Evidence
Chrome/Intel UHD, medium quality, day, 720p, same moving populated Mangrove fixture. No browser or GL errors. 25 publications, one cancelled generation, zero budget rejections. Peak reserved texture storage is 23,991,008 bytes (22.879 MiB). This includes retained cache targets but not driver overhead or shared original textures. The independent 1×1 fallback texture is additional.

The static resulting screenshot was inspected and retains the approved ground/fern direction. The run has a cadence window but is only a smoke test, not a controlled performance comparison. Nine targeted tests pass (`material-bake-queue.test.js` plus `mangrove-chunk-events.test.js`), including retained-target budget, deferred replacement, release and disposal.

## Not yet proven / incomplete
- No captured temporal sequence yet proves perceptually smooth transitions.
- Initial original-to-cache publication is still atomic.
- Fine-region removal when projected importance falls is still atomic.
- Two extra sampler bindings and transient samples may reduce GPU savings; need controlled ABAB versus both original and atomic cache.
- Night/low/elevated views, pressure handling and teardown during a live blend need real-renderer verification.

Do not enable this variant by default or claim all LOD popping solved. Keep PR #159 draft and continue the Mangrove investigation.

## Reproduce
Set WG_VARIANT_SEQUENCE=incrementalsmooth, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=cadence, WG_SAMPLES=120, WG_WARMUP=120, WG_REVIEW_OUT to this directory. Clear WG_DRAW_CENSUS and WG_FRAME_STEP; run the hybrid measurement harness. Raw stats are sceneAudit.ablation in benchmarks.json.
