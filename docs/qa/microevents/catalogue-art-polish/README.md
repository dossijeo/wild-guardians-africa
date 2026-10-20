# Microevent catalogue art review â€” 2026-10-20

Experimental follow-up to #177. All 40 events were captured in the real game at 1280Ã—720 in Chrome / ANGLE Intel UHD D3D11, with the existing paid `wood`, `wet`, and `rocks` fixtures. `catalogue-before.webp` and `catalogue-final.webp` contain the full audit. `comparison.webp` shows selected before/after crops at their original pixel scale; four full-viewport captures provide camera context. Images are captured WebGL output, not mockups.

## Changes selected from the audit

- Butterflies: four-lobed wing silhouette, warm ochre membranes, restrained dark margins and veins. Orienting the offline model towards the authoring camera preserves the open-wing silhouette instead of baking a narrow side view. All four flap frames remain.
- Fire: crooked tongues with bevelled depth and a pale inset core replace the repetitive cones. Five frames bend the tips; modest deterministic width/height variation breaks the identical row.
- Snake: fuller longitudinal overlap, a tapered tail, dorsal marks and a distinct head replace the separated green beads. Particle centres, chain spacing, simulation and hit radii remain authoritative and unchanged.
- Ants: horizontal presentation follows the existing termite treatment, with darker legs and abdomen. Shared insect legs also help beetle, locust and flying insect contrast.
- Feather: overlapping barbs and a darker tip replace the generic diamond leaf.
- Branch/debris: jointed forks, a broken end and sparse leaves replace the symmetrical cross.
- Smoke, fog and dust: rising smoke lobes, a low flattened mist bank, and broken curved dust banks separate effects previously using the same cloud. Storm clouds receive a cooler, darker palette. The dust contrast was increased again after reviewing the first render against savanna ground.

The other events were reviewed in the catalogue and retained. Seeds, birds, fireflies, termites, raincloud, dew, flower, spirit, goldenleaves, star, pollen, rainbow, rareseed, weeds, burrow, pathleaves, spores, web, grain, thornseeds, hail, gust, heat and fallingdebris retain their art and presentation from main. In particular, this preserves the three sprites polished in #177 and the night-speed handling validated in #178.

## Evidence and constraints

`results.json` includes the before/after observations for every event, seed 178 and particle time 0.75 seconds. The final butterfly/fire/dust captures were refreshed after refinement. Every event spawned, all produced instances, and there were no page errors. Selected particles were advanced and frozen through existing development hooks for reproducible views; this is not a campaign run. The contact sheets crop the farm area for comparison; the termite anchor lies partly outside that crop, and its full existing evidence remains in `../visual-polish/wood-termites.png`.

Atlas resolution, slots, animation frame counts, texture count, single instanced mesh and instance counts are unchanged. `atlas-diff.json` identifies the changed cells; the other cells match main byte-for-byte after decoding to RGBA. Full renderer draw calls are identical in matched captures: 76 for wood, 68 for wet, 55 for rocks. Instance counts are identical for all 40 events (1â€“36). These are draw-call observations, not a claim about GPU frame time or all hardware. Additional authoring geometry is baked offline.

Validation:

- `node --test tests/microevent-billboards.test.js tests/microevent-interactions.test.js tests/microevent-feedback.test.js`: 29 passed. Includes all 40 events through projected touch ownership and a new catalogue-wide check that rendering cannot mutate the particle simulation or definition in normal/reduced-motion mode.
- `npm run build`: passed (existing chunk-size and mixed static/dynamic-import warnings).
- Browser primary gestures: 5/5 completed without hold fallback (butterflies, fire, ants, dustdevil, snake). Results are in `gestures.json`; these replay the existing development pointer path with fallback hold disabled.

Limits: one normal camera, three fixture biomes, selected primary gestures, and original sprite resolution. The smallest insects remain tiny at normal zoom. This is an experimental art iteration for review, not proof of every camera/lighting combination or a redesign of the particle formations.

## Reproduce

Run the dev server, set `WG_QA_PLAYWRIGHT_MODULE` to an installed Playwright `index.mjs`, and optionally set `WG_QA_URL` (default `http://127.0.0.1:5237`). Then run:

```
node tools/experiments/audit-microevents-art-browser.mjs test-results/microevents-art
```

An optional third argument limits the wood fixture to a comma-separated event list. Set `WG_QA_GESTURES=1` to run the primary gesture after each capture. The authoring helper `render-microevents-atlas.mjs` runs the existing browser atlas renderer; follow with `node tools/generate_microevent_assets.mjs` to regenerate the shipped lossless atlas and manifest.
