# Extended live-world cache stability

Medium / Intel UHD / 720p / seed 712 / normal static camera. 1,800 animation frames per initial lighting condition. Real canonical Game.resume/pause; no simulation algorithm modifications. Separate uncached control in ../mangrove-original-live-extended-20261023/. The time of day continues to advance: day/night identify INITIAL conditions, not frozen lighting throughout. Fern/material shader time remains fixed by the harness.

| Variant / initial phase | Wall seconds | Simulation elapsed delta | Geometries before → after | Textures before → after |
| --- | ---: | ---: | ---: | ---: |
| Fixed512 day | 61.32 | 57.05 | 280 → 308 | 163 → 164 |
| Original day | 61.05 | 58.20 | 279 → 305 | 136 → 137 |
| Fixed512 night | 56.63 | 98.05 | 280 → 279 | 163 → 161 |
| Original night | 59.41 | 111.97 | 279 → 278 | 136 → 134 |

All fixed-cache samples retain 25 entries, 35,209,000 bytes and 30 cumulative publications. No extra publications during live simulation; peak equals resident cache bytes. Worker positions change and simulation advances. No browser/GL errors in any run. Resource counters are Three.js object counters, not complete GPU memory accounting.

Scene resource counts increase during both daytime runs and decrease during both initially-night runs. This contradicts attributing daytime growth solely to the cache. It does NOT establish absence of a leak elsewhere or identify the exact owner of those changing resources. Active effects are visible near the crops in the final daytime cache capture. Cache targets themselves remain bounded.

Inspected final daytime cache image: approved moss, localized mud and fern cover remain. Final images are NOT an equivalence pair: wall times and simulation advancement differ. Existing frozen ABAB remains the performance and image comparison evidence. The ten-frame cadence preambles here are not benchmark evidence.

Limits: approximately one minute per condition, static camera, no commanded construction or planting, no continuous streaming, no campaign completion. Event-driven invalidation and resource teardown are covered separately by their synthetic probes, not proved by this live run. Longer scenario coverage and actual construction remain open.

Reproduce: WG_VARIANT_SEQUENCE=fixednative (or base for control), WG_PHASES=day,night, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=cadence, WG_SAMPLES=10, WG_WARMUP=30, WG_STATIC_VIEW=1, WG_LIVE_CACHE_PROBE=1, WG_LIVE_CACHE_FRAMES=1800, WG_REVIEW_OUT=<new directory>; node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. The probe validates frame count 1..18000 and defaults to requiring the cache; only the explicit base harness variant allows absence.
