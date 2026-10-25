# manglares: active populated scene

Source4c176f8d5,seed712,medium,12paid crops/two workers. Ordinary app simulation; QA save skips tutorial explicitly. Twenty wall seconds per phase,8m lateral camera sweep, live wind/material clocks, streaming enabled, full far impostors and mountains. Night continues daytime state; not an A/B comparison.

day: 354 observed frames; 16.298 simulation seconds advanced; workers changed. Geometry range [284, 304], textures [129, 129]. Video 349 decoded frames, 19.870140 seconds.

night: 346 observed frames; 35.843 simulation seconds advanced; workers changed. Geometry range [236, 306], textures [110, 129]. Video 341 decoded frames, 19.811617 seconds.

Audit: no paused frames, page or GL errors, or coverage overflow. Videos decode at1280x720. Recorder drops some requested frames; capture/checkpoint overhead precludes FPS claims. Resource ranges do not prove absence of leaks.

Visual review: midday checkpoint and five nighttime checkpoints inspected. Terrain/vegetation and path separation retained. Small crops have low contrast, particularly at night. Mangrove medium selected dense cupped leaves are unchanged; use mangrove-approved-recheck-20261022 for the exact approved close camera. These overview views do not replace it.

Limits: sampled visuals cannot exclude brief transition artifacts between checkpoints. This is a short active-game probe, not prolonged streaming or six-biome closure. No rendering or simulation source changes. Reproduce using capture-populated-active-play-20261022.mjs with WG_FIXTURE_BIOME and a fresh WG_REVIEW_OUT, then audit-populated-active-play-20261022.py <output directory>.
