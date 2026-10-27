# Microevent materials and readability — 2026-10-21

Follow-up to the merged #180, based on main `2e313bd63`. All 40 events were reviewed again in real Chrome/WebGL at the normal 1280×720 camera using the existing wood, wet and rocks fixtures. The full before/after catalogue sheets and selected unscaled crops are included here. These are captured game pixels, not proposed mockups.

## Changes

- **Web:** pale silk now has a restrained darker edge and an additional inner ring. The previous thin threads almost disappeared against dry terrain. The silhouette remains open and transparent.
- **Grain:** fuller ochre kernels, a dark crease and an overflowing sack make the gather objective distinguishable from the ground. Each particle keeps its existing centre and hit radius; presentation orientation varies deterministically.
- **Leaves and weeds:** folded asymmetric blades and veins replace the diamond silhouette. Fallen leaves now use their random phase as visual orientation rather than standing in a uniform upright row. Small size/tilt variation breaks up repeated weeds without moving their roots or interaction centres.
- **Pollen:** uneven matte motes distinguish it from the long grain kernels. Hard specular-looking highlights were removed after visual review; contrast was then restored so the small motes remain visible against savanna soil.
- **Water:** rounded drop contours, a cool colour and small baked highlights improve the water reading. Dew has modest presentation size variation.
- **Clouds:** unequal overlapping lobes and a scalloped underside soften the old cauliflower-like chunks. A first flattened underside was rejected because it resembled a saucer; the final version retains irregular, diffuse volume with no metallic material.
- **Seeds:** denser cream fibres make the floating seed head less like a bare twig. This is a subtle change at the normal camera distance.

Only 12 atlas cells change; the other 52 decode identically to main, including the butterfly/fire/snake/insect work from #180. Shared cloud and raindrop cells cover raincloud, storm and lightning. The remaining catalogue events were inspected and retained. No event definitions, simulation, audio, interaction radii, camera or nighttime speed code changed.

## Evidence and validation

- `comparison.webp`: before/after crops at original pixel scale, 10 representative events.
- `catalogue-before.webp`, `catalogue-after.webp`: all 40 events, overview crops at 80% scale. The termite anchor is partly outside this crop; its existing full evidence remains in `../visual-polish/wood-termites.png`.
- `results.json`: complete before/after observations. All 40 spawned with instances and no page errors. The six refined events and final pollen were recaptured after review. Seed 178 and particle age 0.75 seconds are fixed through development hooks; no campaign is simulated.
- `gestures.json`: seven primary gestures complete without hold fallback: raincloud, dew, pollen, weeds, pathleaves, web and grain. The pollen gesture was run before its final colour/size-only offline refinement; runtime geometry and interaction remained unchanged.
- `tests.txt`: 29 directed tests pass, including all 40 events through projected touch ownership and a normal/reduced-motion render-immutability check.
- `build.txt`: production build passes. Existing chunk-size and mixed import warnings remain.

Matched browser captures have identical instance counts and full renderer draw calls for every event: 76 wood, 68 wet, 55 rocks; 1–36 instances depending on the event. The same single instanced mesh, shader, 512×512 texture, atlas slots and frame counts remain. Additional source geometry is rendered offline. The shipped lossless WebP changes from 60,114 bytes to approximately 66 KB. Draw-call equality is not a GPU frame-time benchmark.

## Reproduce and limits

Use `tools/experiments/audit-microevents-art-browser.mjs` with `WG_QA_PLAYWRIGHT_MODULE` pointing at an installed Playwright `index.mjs` and `WG_QA_URL` pointing to the dev server. The optional third argument selects comma-separated wood-fixture events. Set `WG_QA_GESTURES=1` to replay primary gestures after capture. Render the source with `render-microevents-atlas.mjs`, then run `tools/generate_microevent_assets.mjs`.

Coverage is three fixtures and one normal camera, plus seven gesture replays. Tiny seeds and insects remain small by design. This is an art iteration for review, not validation of every biome/light/camera combination or a change to formation mechanics.
