# Selected Mangrove cache review entry

[Open selected visual laboratory configuration](http://127.0.0.1:5190/?visualLab=global-lighting&skyAtmosphere=clouds&grassCoverage=continuous&riverSoil=1&riverYards=islands&mangroveSubstrate=full&mangroveMoss=layered&canyonSand=full&canyonSandBlend=soft&canyonNormals=smooth&canyonFloor=warm&canyonShadows=horizon&sandRelief=1&sandWear=residual&sandMeso=1&volcanicAsh=mask&volcanicRock=layered&volcanicNight=spectrum&spatialFar=1&farTransitions=smooth&waterEdges=natural&waterPalette=regional&riverBank=soil&mangroveShore=sediment&mangroveLeaves=cupped&mangroveFerns=holly&groundCache=fixed512)

Requires the lab Vite server on port 5190. Select a Mangrove campaign in the game. This link configures the renderer; it does not install the benchmark save, force a camera, or freeze the world. Use the documented experiment harness for controlled seed/camera/quality comparisons. The cache is opt-in and does not change the default game. Historical globalClosureQuery/globalReviewedQuery are intentionally frozen as benchmark references; do not silently enable the cache in those controls.

## Verification at 89b46bc22

- npm run build: passed, 458 modules, 9.15 seconds. Vite warns about mixed dynamic/static far-atmosphere imports and a >500 kB main chunk; no build error. Build success is not packaged-runtime validation.
- node --test tests/mangrove-cache-budget.test.js tests/material-bake-queue.test.js tests/mangrove-chunk-events.test.js: 10/10 pass.
- Selected fixed512 recommendation and limits: [decision report](MANGROVE-FIXED512-DECISION.md).

## Scope still open

Resident static day/night ABAB and art checks pass at medium/low; actual planting, single-wall shadows, live resource smoke, and 49-chunk saturation have evidence. This does not complete the wider six-biome objective. Continuous streaming still has native generation stalls. Interactive initial-load smoothness, full-scene quality-switch differences and extended gameplay scenarios remain open. Keep PR159 draft and do not merge main.
