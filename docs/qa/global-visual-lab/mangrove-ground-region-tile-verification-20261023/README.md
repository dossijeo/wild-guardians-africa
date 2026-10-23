# Tiled material bake equivalence

Near view, medium quality, day, real Chrome WebGL renderer. Variant regionverify renders the same detailed cache twice: 16 scissor tiles and one complete draw, at the same viewport and resolution. Raw RGBA8 level-zero texels are read back only for this diagnostic.

All 4,210,704 channel values match exactly: maximum difference 0, different channels 0. This verifies that tiled generation does not alter shader derivatives or introduce tile seams for this scene. It does not prove live streaming or temporal LOD behavior.

The temporary reference target adds 4,210,704 GPU bytes and the two CPU readback arrays add 8,421,408 bytes during this QA-only check. They are released after comparison; these readbacks are never enabled in performance measurements. Cache resident estimate remains 12.068466 MiB. Shader compile, warmup and generation measurements are in benchmarks.json but this diagnostic is not a performance claim.

Reproduce standard hybrid runner with WG_VARIANT_SEQUENCE=regionverify, WG_VIEW=near, WG_PHASES=day, WG_COVER_QUALITY=media, WG_MODES=cadence, WG_SAMPLES=60, WG_WARMUP=60. Clear WG_DRAW_CENSUS and WG_FRAME_STEP.
