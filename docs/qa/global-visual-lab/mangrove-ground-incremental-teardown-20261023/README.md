# Incremental cache full-owner teardown

Real Chrome WebGL run, medium quality, normal view, populated paused Mangrove fixture. After the initial cache finishes, the QA controller is disposed and the original world renderer draws again.

Before: 25 registered chunk states, ten published cache targets, 16,969,744 reserved bytes, 145 renderer textures and 280 geometries.
After: zero states, cache targets, pending jobs or reserved bytes; 134 textures and 279 geometries. The difference is exactly ten cache targets, one independently owned fallback texture and one bake quad geometry. No GL or browser errors. Original material hooks and the original render function are restored.

This validates resource release for this complete cache owner. It is not a long-duration whole-game leak test, quality-switch validation or GPU driver-memory measurement. The diagnostic cadence window is after teardown, so it must not be cited as cached-renderer performance.

Reproduce the hybrid runner with WG_VARIANT_SEQUENCE=incrementalteardown, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=cadence, WG_SAMPLES=30, WG_WARMUP=30 and this output directory. Clear WG_DRAW_CENSUS and WG_FRAME_STEP. Evidence is at sceneAudit.ablation.teardown in benchmarks.json.
