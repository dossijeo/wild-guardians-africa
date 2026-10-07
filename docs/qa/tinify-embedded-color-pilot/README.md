# Tinify embedded color pilot

Follow-up: [offline rebuild recipe and current execution checkpoint](REBUILD.md).

This is an offline compression pilot, not an accepted runtime asset change.
The production facóquero GLB and asset manifest remain unchanged. Native A/B
appearance and the production Assets loader have now been checked in an isolated
fixture. Accepted rebuild recipe, runtime installation and package verification
are pending.

The input is the original embedded 4096×4096 PNG, resized proportionally with
Sharp to the existing 2048×2048 runtime resolution and encoded as lossless PNG.
It is not a recompression of the already lossy runtime WebP. Only an exclusively
color image with matching original/runtime material consumers is eligible.
Normal maps, data textures, external image storage, invalid ranges, changed
aspect ratios and enlargement are rejected before the provider is used.

The actual cached Tinify result reduces image 1 from 306,700 to 141,274 bytes.
The complete GLB changes from 7,092,700 to 6,927,276 bytes, saving 165,424 bytes.
Resolution is unchanged and decoded alpha has no differences. Color is lossy:
mean absolute RGB difference against the resized original is 1.6093 on the
0–255 scale; maximum difference is 66. These numbers are not visual acceptance.

`report.json` contains source, upload, output and candidate hashes, safe provider
receipt fields and pixel comparisons. `structural.json` records a separate
offline comparison of the actual baseline/candidate: all 1,521 compressed
Meshopt blocks, the other two embedded images and animation/skin/mesh/material
metadata are exact. Both containers have zero glTF-validator errors. The tool
does not decode and recompress geometry when replacing the color image.

The subsequent independent decoded gate is recorded in
`decoded-verification.json`: 2,691,410 geometry bytes across 1,521 views match
the original exactly, all other images remain byte-exact, alpha is unchanged,
and the actual candidate reaches 38.6441 dB PSNR (existing asset gate: 32 dB).
Decoded validation exposes one pre-existing zero-length tangent in both runtime
and candidate (`ACCESSOR_VECTOR3_NON_UNIT` at `/meshes/0/primitives/0/attributes/TANGENT`).
There are no new errors. The earlier zero-error figures refer specifically to
the packed containers; they do not supersede this decoded result.

## Reproduce the candidate

Provide `TINIFY_API_KEY` through the environment, never in source or arguments:

```powershell
node tools/optimize_embedded_image_pilot.mjs assets/web/cb7a23479fb9210b6cda1ab13cbddd85b3ebce10cad863f1dd8ae1d9d66e4869.glb 1
```

Only ignored `.cache/tinify-embedded-pilot/<original-image-hash>-1/` is written.
The Tinify cache reuses an existing response for identical upload bytes. The
candidate is never installed automatically, regardless of its size reduction.
Provider locations and credentials are excluded from this evidence directory.

## Checks

```powershell
node --test tests/embedded-color-input.test.js tests/web-glb-image-repack.test.js tests/tinify-image-cache.test.js tests/tinify-color-policy.test.js tests/image-pixel-comparison.test.js
node --test tests/embedded-color-candidate.test.js
node tools/check_browser_script_syntax.mjs
```

The directed run passed 29/29 tests. The tracked browser script syntax gate
also passed; its report records the parsed scripts and hashes. Neither run
executes the browser fixture or proves native rendering.

The independent gate adds three passing tests: a provider-free lossless color
candidate, rejection of a valid compressed replacement block that changes
decoded geometry, and rejection of altered animation metadata. The pilot CLI
runs this gate before writing a candidate receipt; container validity alone is
insufficient. Its receipts include the full inherited/new validator errors.

After generating the ignored candidate, the local Vite QA page is
`/tests/browser/embedded-color-pilot.html`. It uses separate actual baseline
and candidate GLBs, a frozen Walking pose, production toon palettes and fixed
light with a flat QA floor. Its paired readbacks cover six palettes day/night.
It does not reproduce a complete biome, HDR environment or gameplay scene and
is not a FPS, RAM, mobile or perceptual audio test. Initial browser attach failures
were followed by a successful native run in tab 650, which was closed afterwards.

## Native A/B evidence

The final `native/` evidence contains four inspected 1280×720 JPEG captures,
the terminal twelve-pair readback report and the error/warning console export.
The report completed with zero errors and zero GL errors in every pair.
The console contains one shader compiler warning about a potentially
uninitialized `environment4` return in the existing shader path; this is
preserved in `native/console.json`, not treated as a clean warning-free log.
The header report was moved to the bottom before the final captures so that it
does not obscure the animal's head. Both models remain aligned, with visible
textures and shadows; no obvious detail degradation was found in these views.
This is a limited visual observation, not pixel equality or general acceptance.

The readback mean absolute RGB difference over the entire frame is 0.05392
during day and 0.03673 at night on the 0–255 scale, with maximum difference 18.
The six biome uniform settings produce identical paired results within each
lighting state for this animal recipe. They are not six complete biome scenes.
Background pixels dilute the full-frame mean; it is not a texture-only metric.

Before adoption, verify native appearance and loading, add a reproducible
accepted-image recipe so asset rebuilding cannot silently restore the old
texture, update the manifest and rerun asset/build/package checks. No reduction
of GPU work, decoded texture memory or frametime follows from this byte saving.
