# Natural-water distance preparation

Replace per-segment Math.hypot with squared-distance comparisons and one final square root per mask sample. Same spatial bins, clamped segment projection, 4 m range, mask resolution, encoding, geometry and dynamic shading. No vegetation or material-cache change.

Intel UHD / 720p / medium/day, 144 m streaming diagnostic, 30 warmup / 240 recorded. prepareNaturalWater over 18 calls: mean 5.811 ms, max 13.8 versus previous 8.883 / 22.9. This is a single before/after diagnostic, not causal ABAB or a total-frame acceptance claim. Final whole-path verification is still required.

Executable byte-equivalence check against git revision 4c8cf15fb passes 40 polygon-water cases of different sizes, shapes and positive/negative chunk origins: all 430,216 RGBA channels and bed metadata match. This covers representative synthetic masks, not every possible floating-point input. Real renderer reports no browser errors; image comparison is in summary.json. The approved green ground and shoreline recipe remain unchanged.

Run node tools/experiments/verify-water-bed-equivalence-20261023.mjs. It imports the pinned prior module in memory, creates both masks, compares them and disposes GPU-side owners; no repository files are checked out. Runtime reproduction: WG_PREP_DETAIL=1, WG_STREAM_PATH=1, WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=preparation, WG_SAMPLES=240, WG_WARMUP=30, WG_REVIEW_OUT=<new directory>, measure-mangrove-ground-hybrid-20261023.mjs.
