# Small wildlife and burr silhouette polish

Baseline: main `1ede45dd6`, after both #184 and #188 were merged. Reviewed their catalogue and evidence before choosing three remaining generic silhouettes. This pass retains the material, foliage, cloud, flower, feather and spore changes already integrated. The previous burrow experiment was not repeated.

## Art

- **Golden beetle:** broad split gold carapace, dark green thorax, segmented legs and antennae replace the single gold body blob. The body remains the dominant mass at normal camera distance.
- **Locusts:** long tapered abdomen, large eye, jumping-leg profile and three wing poses replace the shared front-facing generic insect. This produces the clearest silhouette improvement of the three.
- **Thorn seeds:** rounded ochre seed body with sparse short hooks replaces a pale faceted star. The rounded core remains visible between the hooks; these are small burrs, not blades or a different hazard.

The source models are baked offline. Only cells 12, 13, 14, 15 and 56 change visible pixels. The other 59 cells retain all nontransparent pixels and alpha; RGB underneath fully transparent pixels may be recoded by lossless WebP. `patch-microevent-wildlife-art.mjs` patches just the selected cells onto the shipped baseline. The atlas stays 512×512, growing from 67,648 to 68,326 bytes (+678).

No runtime code, mechanics, hitboxes, event definitions, audio, camera or nighttime speed code changes. No added instances, textures, meshes, shaders or animation frames.

## Real-game evidence

`comparison.webp`: before left, after right; beetle, locusts, thorn seeds from top to bottom. The crops retain original pixel scale from Chrome/WebGL at 1280×720, wood fixture, normal camera, seed 178, particle age 0.75 s. The script swaps the two atlas textures inside the same frozen scene. Full frames accompany the lossless comparison (full frames compressed separately to WebP quality 86).

`night/comparison.webp`: the same three assets tested under night lighting. These are normally daytime events; the development clock is moved to night after spawn only to stress visual contrast, without changing event eligibility or production code. The beetle legs remain small/dark, while the shell, locust profile and seed core remain legible.

`before.json` and `gestures.json`: all three primary browser gestures complete without hold fallback, with no page errors. Full-scene calls remain 76 and instances remain 1 / 16 / 10. This is focused new evidence for three events, not a fresh 40-event browser tour.

83 directed microevent tests pass. Production build passes with existing chunk-size and mixed-import warnings.

## Performance

`benchmark.json`: 240 samples per atlas, eight alternating A/B rounds, ten warmup renders per block, identical frozen full scene with 16 locusts. Each sample wraps renderer.render and gl.finish and includes CPU submission plus GPU completion; it is not a pure GPU timestamp or live-game FPS measure. Chrome headless uses Intel UHD via ANGLE/D3D11.

Baseline median 4.60 ms / p95 125.60 ms; candidate median 4.30 ms / p95 81.80 ms. There is no observed median increase, but the broad tails prevent a tight performance-equivalence or speedup claim. The benchmark ran sequentially after this pass's other browser and build work. Coverage is one fixture and GPU.

## Reproduce

Set `WG_QA_PLAYWRIGHT_MODULE` to an installed Playwright index.mjs and `WG_QA_URL` to the dev server. Write the baseline atlas binary from revision `1ede45dd6` to `public/content/microevents/atlas-before.webp` temporarily; remove it before packaging.

```
node tools/experiments/render-microevents-atlas.mjs
node tools/experiments/patch-microevent-wildlife-art.mjs
node tools/generate_microevent_assets.mjs
node tools/experiments/capture-microevent-atlas-pairs.mjs docs/qa/microevents/small-wildlife beetle,locusts,thornseeds
node tools/experiments/capture-microevent-atlas-pairs.mjs docs/qa/microevents/small-wildlife/night beetle,locusts,thornseeds night
node tools/experiments/benchmark-microevent-atlas.mjs docs/qa/microevents/small-wildlife/benchmark.json locusts
```

Create output directories first. The capture and benchmark tools retain their prior default event/output options and now accept event/output arguments for focused reviews. This is an experimental art PR for review, not every biome/lighting/camera combination. Do not merge automatically.
