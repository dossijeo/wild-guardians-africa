# Facóquero embedded color installed

The reviewed Tinify color image is now embedded in the runtime facóquero GLB.
It preserves the current 2048×2048 resolution and exact alpha. The GLB shrinks
from 7,092,700 to 6,927,276 bytes: 165,424 bytes saved. Its SHA-256 matches the
[native A/B candidate](../tinify-embedded-color-pilot/README.md) exactly.
The image is lossy (38.6441 dB PSNR against the resized original, formerly
42.4695 dB with the quality-90 texture). The inspected close day/night views
showed no obvious detail degradation; this does not imply pixel equality.

## Actual rebuild and checks

- Full `compress_web_assets.mjs` run completed with exit 0 in the original
  session 61324. All twenty GLBs were rebuilt; the other nineteen GLB hashes
  and their entire per-model manifest records are unchanged. `rebuild.json`
  compares the actual result against the committed baseline `c6919b6`.
- `verify_web_assets.mjs` completed successfully for all twenty models, including
  decoded original geometry/animation equality, alpha and texture gates, local
  Meshopt decoder and absence of new conformance errors. The inherited zero
  tangent described in the pilot is still preserved.
- 17 directed tests passed for approved recipes, original-image preparation,
  independent decoded verification and replacement storage. The modified
  browser fixture also passes script syntax checking.
- Vite build passed: 225 modules, 20.02 seconds; the usual >500 kB bundle warning
  remains. Web package check passed: 641 files / 382,537,500 bytes, 859 relative
  links and twenty runtime GLBs, with originals excluded.
- Direct itch ZIP generated with CRC verification: 332,756,255 bytes, 641 files,
  root `index.html`, no inner ZIP, and the exact accepted runtime GLB hash.
  The offline source image is outside `public/` and is not duplicated in the ZIP.

Compressed logs and structured rebuild/ZIP proofs accompany this report.
The full package byte count is an actual current measurement; only the GLB
165,424-byte delta is claimed against an exact baseline, not a historical build
with potentially different generated bundles.

## Reproducibility and limits

The [approved offline recipe](../tinify-embedded-color-pilot/REBUILD.md) makes
rebuilds independent of API keys or provider access. The original source,
baseline, prepared input and reviewed output are checked by hash. The runtime
manifest now records the Tinify encoding provenance, not quality 90.

The historical A/B fixture refuses stale baseline/candidate hashes after this
installation, rather than comparing the installed candidate with itself and
claiming equality. Its archived native evidence predates installation, and its
candidate bytes are the exact bytes now distributed. New comparisons require a
matching regenerated receipt or the frozen original source.

This is one embedded color image out of the remaining model-image optimization
work. It is not an FPS, GPU-memory, total-RAM or mobile acceptance result. No
itch.io deployment occurred; CI for the eventual asset commit is a separate
verification.
