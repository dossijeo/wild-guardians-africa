# Fixed512 quality-switch lifecycle

Real renderer, Intel UHD, 720p, seeded paused Mangrove fixture. First probe alternates media/baja/media/baja/media; second alternates media/muy_baja/media/muy_baja/media. 45 RAF waits after each switch. The latter exercises actual ground-material replacement, unlike low/medium which retains the material class.

All steps retain 25 cache targets, 35,209,000 bytes (33.58 MiB), 30 lifetime publications (including initial streamed replacements), with no additional bakes. All current ground materials remain patched, hook count equals tracked count (25), and GL error is zero. Very-low/medium global texture counts alternate 161/163 and geometries 281/285; no monotonic growth observed in this short sequence. This is not a long-duration whole-game leak proof.

Code review found disposed material objects remained in the cache hook map until chunk unload. The integrated owner now removes its hook record/listener on material disposal and detaches the listener on chunk release. The very-low probe validates the resulting bounded references through repeated replacement. Existing texture ownership stays with the chunk cache.

These checks establish lifecycle and shader compilation, not artistic parity between different quality profiles. Harness screenshots/cadence are captured BEFORE the switch probe; they must not be presented as post-switch visual evidence. Final quality is restored in finally. Current probe uses the very-low sequence; the earlier low sequence is retained as evidence. Pending: post-switch image equivalence and sustained live-world validation before default promotion.

Reproduce WG_FIXED_QUALITY_PROBE=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=cadence, WG_SAMPLES=10, WG_WARMUP=30, WG_REVIEW_OUT=<new directory>, measure-mangrove-ground-hybrid-20261023.mjs.
