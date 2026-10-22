# Ambient silhouette and weather review

Baseline: main `d53f71bf9`, including #197 and the earlier catalogue, material, flower and small-wildlife passes. This review captures all 40 events again in the real game before selecting eight for refinement. The resulting PR is a draft for visual review; do not merge automatically.

## Selected art

- **Birds:** pointed flight feathers, a forked tail, a warm breast and a clear head replace the paddle-like wing silhouette. All four original flap frames remain.
- **Raincloud, storm and lightning:** one shallow scalloped cloud volume replaces separately shaded spherical lumps. Broad soft shading retains volume without the rock-like cluster appearance. A flat extruded icon and a strongly faceted dome were both rejected during review.
- **Burrow:** an irregular soil lip surrounds a dark entrance. The rodent gains ears, a muzzle and brighter eyes, although those small details remain subtle in the crowded formation; the entrance is the main improvement at the normal camera.
- **Spirit:** a curled tip, swept lower fins and inset face distinguish the nocturnal wisp from a water drop.
- **Gust and heat:** tapered ribbons retain open space while increasing readability against terrain. Heat uses a restrained ochre edge and warm light centre.

All added geometry and material work is baked offline. No runtime source changes: camera, time, event definitions, animation timing, particle centres, hit radii, gestures, instance counts, shader and the single instanced mesh remain unchanged. The atlas stays 512×512. Only cells 2–5, 17, 28, 35, 43, 44, 58 and 61 change visible pixels; the other 53 retain their alpha and nontransparent RGB. Lossless WebP changes from 68,326 to 70,364 bytes (+2,038 bytes).

## Real-game evidence

- `pairs/comparison.webp`: before left / after right, original pixel scale. Rows: birds, raincloud, storm, burrow, spirit, gust, heat, lightning.
- `night/comparison.webp`: same eight rows under night lighting. Day-only events are spawned under their valid day clock, then the development clock is changed to night to test contrast. Spirit is nocturnal in both sheets.
- `hidden/comparison.webp`: ordinary 0.75-second burrow state, without advancing to a visible animal. The other burrow pairs advance its actual reveal cycle; no reveal values are assigned manually.
- `catalogue-before.webp` / `catalogue-after.webp`: all 40 events, with labelled crops at 80% scale, across wood, wet and rocks fixtures. The termite anchor lies outside most of this crop and retains the previous reviewed art.
- Paired full frames and `captures.json` retain camera context, particle age, reveal values and renderer observations. Comparison sheets are lossless; full frames are WebP quality 86. These are Chrome/WebGL captures, not mockups.

Seed 178, normal 1280×720 camera, and existing development freeze hooks make the observations repeatable. The atlas is swapped inside the same frozen scene for each A/B pair. One transient QA startup timeout was retried; all retained captures completed and their error arrays are empty.

## Validation

- 83 directed microevent tests pass (`tests.txt`), including all 40 definitions through projected touch ownership and normal/reduced-motion presentation immutability.
- 40/40 events spawn before and after with no page errors. `catalogue-metrics.json` records identical calls and instances for every event: 76 calls in wood, 68 in wet and 55 in rocks; event instances range from 1 to 36.
- All eight affected events complete their primary browser gesture without the accessible hold fallback (`gestures.json`).
- Production build passes (`build.txt`); existing large-chunk and mixed-import warnings remain.

## Performance evidence and limits

Tests use Chrome / ANGLE Intel UHD D3D11 and the frozen full game scene with raincloud. `render + gl.finish` measures CPU submission plus GPU completion, not a pure GPU timestamp. rAF measurements include the whole presentation loop and unrelated work; they are not live campaign FPS.

The initial alternating atlas test has 240 render samples per atlas: baseline median **4.2 ms**, candidate **4.5 ms**; p95 **121.3 / 91.7 ms** (`benchmark.json`). The initial ABBA frame test records baseline blocks **59.2 / 53.9 FPS** and candidate blocks **51.9 / 48.4 FPS** (`frames.json`). Those slower candidate blocks prompted a separate control experiment rather than an equivalence claim.

The counterbalanced ABC/CAB/BCA test restores the old cloud cell into a third copy of the new atlas. Raincloud uses only that cloud and the unchanged raindrop, so control C has the baseline's visible artwork. Each arm has 120 render samples and 180 rAF intervals (`control-benchmark.json`):

| Arm | Median render + finish | Mean presentation FPS |
| --- | ---: | ---: |
| A: baseline atlas | 1.7 ms | 32.7 |
| B: candidate atlas | 1.4 ms | 37.2 |
| C: candidate with baseline cloud | 1.4 ms | 30.6 |

The initial slowdown does not persist, and the identical visible-art control also varies substantially. These observations show environmental/temporal variability and do **not** establish either a speedup or tight FPS equivalence. Cloud nontransparent coverage actually decreases from 1,282 to 1,039 pixels per cell (−19%); antialiased fringe pixels decrease from 68 to 61 (`atlas-diff.json`). No runtime transparency layer or draw is added. Other changed events have not received isolated GPU benchmarks, and this evidence covers one GPU and a small fixed fixture, not every biome, zoom, device or campaign load.

## Reproduce

Set `WG_QA_PLAYWRIGHT_MODULE` to an installed Playwright `index.mjs` and `WG_QA_URL` to the dev server. Temporarily write `d53f71bf9:public/content/microevents/atlas.webp` as `public/content/microevents/atlas-before.webp` for A/B tools, and remove it before building or packaging.

```
node tools/experiments/render-microevents-atlas.mjs
node tools/experiments/patch-microevent-visual-polish.mjs
node tools/generate_microevent_assets.mjs
node tools/experiments/capture-microevent-atlas-pairs.mjs OUTPUT birds,raincloud,storm,burrow,spirit,gust,heat,lightning
node tools/experiments/capture-microevent-atlas-pairs.mjs OUTPUT_NIGHT birds,raincloud,storm,burrow,spirit,gust,heat,lightning night
node tools/experiments/capture-microevent-atlas-pairs.mjs OUTPUT_HIDDEN burrow day hidden
node tools/experiments/audit-microevents-art-browser.mjs OUTPUT_CATALOGUE
node tools/experiments/benchmark-microevent-atlas.mjs OUTPUT_RENDER_JSON raincloud
node tools/experiments/benchmark-microevent-atlas-frames.mjs OUTPUT_FRAMES_JSON
node tools/experiments/benchmark-microevent-atlas-control.mjs OUTPUT_CONTROL_JSON
```

Run benchmarks sequentially after capture/build work has ended. Set `WG_QA_GESTURES=1` for the audit tool to replay primary gestures. The pair tool now uses the valid night phase for nocturnal events, verifies spawn success, records metrics, and advances the real burrow reveal cycle instead of setting a value which the next frozen tick overwrites.
