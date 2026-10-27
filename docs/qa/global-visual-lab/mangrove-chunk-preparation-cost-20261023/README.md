# Streaming CPU preparation attribution

Intel UHD, 720p, medium/day, fixed512 integrated, 144 m out-and-back, 30 warmup / 240 recorded frames. QA wrappers time synchronous calls during measurement and restore originals afterward. These are inclusive wall-clock CPU times, not GPU times; nested totals must not be added. First folder is coarse attribution, second adds nested terrain components.

Coarse run: 30 chunk installations, mean 18.59 ms / max 41.7; terrain construction mean 18.11 / max 41.0. Ground-detail registration mean 0.297 / max 1.7. The second run confirms the concentration: install mean 18.08 / max 33.7, terrain mean 17.63 / max 33.2.

Detailed run: mudPatches.chunk 89.4 ms total over 30 calls (2.98 ms mean); buildPropSlot 37.8 ms total over 600 calls (1.26 ms per installed chunk on average); biomeGround.attach 21.5 ms over 31 calls (also includes an observed non-chunk attachment). Ground-detail registration 8.5 ms total. Most terrain preparation time remains outside these nested spans. Potential remaining sites include native buffer construction, bank/water preparation and mud-edge binding; these must be measured before assigning causality. Removal itself averages 3.60 ms, max 9.5.

This evidence redirects investigation away from reducing fern density or revisiting fixed512 resolution. It does not yet identify a single root cause for all long frame intervals. No production rendering, visual parameters or simulation changes are introduced. Raw preparation events include frame indices and start timestamps to support subsequent attribution.

Reproduce with WG_STREAM_PATH=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=preparation, WG_SAMPLES=240, WG_WARMUP=30 and WG_REVIEW_OUT=<new directory>; run tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. Current instrumentation includes the detailed nested spans. Measurement windows do not establish full workload equivalence across independent runs.
