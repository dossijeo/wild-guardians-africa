# Transparent RGB corruption in premultiplied far atlases

Confirmed 2026-10-26 on Intel UHD / Chrome, real Manglares renderer.

## Cause

The lossless WebP encoder defaults to `exact:false`: it may replace RGB in fully transparent pixels. The runtime format stores sRGB-encoded **premultiplied linear** RGB and uploads without another alpha multiplication. Its GPU mipmaps therefore require zero RGB wherever alpha is zero. The generated WebPs violated this invariant, including arbitrary magenta RGB behind alpha 0. Filtering/mipmap generation mixed that RGB into visible foliage.

This was not a generated-image color choice or a failure unique to ImageBitmap. HTMLImageElement and ImageBitmap showed the same behavior. The first CPU scan missed it by excluding alpha below .35; that scan was insufficient.

Manglares day slots 0/1/2/3 had 48,683 / 44,486 / 0 / 14,578 magenta pixels at alpha 0 in the decoded file. None passed the opaque CPU threshold. A GPU texture probe deliberately rendering the RGB opaque exposed 46,426 / 43,357 / 0 / 14,570 magenta pixels. These diagnostic counts are not visible world pixel counts.

## Fix and evidence

- Runtime WebP encoders now use `lossless:true, exact:true`.
- Downsampling and generated-atlas conversion clear RGB after quantization when alpha becomes 0.
- Both direct-raster and generated-atlas pipelines use this invariant; shaders and lighting remain unchanged.
- GPU probe after regeneration: **0 magenta pixels in all four slots**, using the original ImageBitmap path.
- Actual 1920×1080 ground-level screenshot: magenta count in tree region x[0,1600), y[300,650) decreases **258 → 0**. Same camera, seed and lighting. See `magenta-fixed/ground.png` and earlier `ground-comparison/day-raster/ground.png`.
- Two regression tests pass: quantized transparent RGB clearing and exact WebP roundtrip.

Raw GPU evidence: `magenta-diagnostic/gpu-atlas-audit.json`, `magenta-html/gpu-atlas-audit.json`, `magenta-fixed/gpu-atlas-audit.json`.

## Complete-only staging

`prepare-imagegen-tree-atlas.mjs --biome NAME --slot N --phase day|night` converts each candidate, records source/output SHA256 and the exact-transparent-RGB contract. Legacy positional `day`/`night` still targets Manglares slot0.

`stage-imagegen-tree-atlases.mjs` derives the required entries from the actual candidate manifest: 22 species / **44** day-night atlases (Gran Cañón has two original species, not four). It writes an inventory and publishes the experimental imagegen manifest only when every entry and hash is valid. It never modifies the production manifest or activates missing entries.
