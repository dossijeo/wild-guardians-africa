# Approved native Mangroves versus frozen main

Lab d564bd0c6 plus QA harness only; main b2497b0695218652672c805c40971ea830686e3a (also local origin/main at capture; no network fetch, not claimed newest remote). Medium1280x720,seed712,same saved populated campaign. Three cameras:game/elevated/reverse, day150/night350. Warmup and final passes. Current native holly fronds with approved lighting; NO prelit/composite/screenLOD experimental replacement. global-accepted-recipe-20261023 records latest native artistic choices without modifying historical benchmark recipes or game defaults.

24fresh screenshots across main/lab.12paired controls pass exactcamera,target,time,origin,elapsed,workerpositions; no page/WebGL errors. Six final side-by-side images generated. Inspected full game day/night pairs: lab adds continuous recognisable fronds, richer solar shadows, muted varied moss ground and softened regional-water shoreline; main has brighter uniform ground, hard turquoise water boundary and lacks continuous fern cover. Night retains visible green frond mass. Silhouettes of original buildings remain authored; obstruction fading differs intentionally. No pixel-difference metric used as artistic approval. Existing user acceptance of Mangroves remains unchanged.

| Final view | Main calls/triangles | Lab calls/triangles |
|---|---|---|
| Game |71/358658|91/421040|
| Elevated |34/227858|47/303322|
| Reverse |56/363566|72/376263|

Same final counts day/night. Counts describe final color pass, not total shadow work, FPS or efficiency. Added features have different workloads; use existing approved-native CPU/GPU studies for cost, not these screenshots.

## Important baseline limitation: backgrounds

Lab full distant impostors and mountains enabled and ready. Main production code disables farVegetation whenever spatialSession exists (`src/app/main.js` load options). Main metadata correctly reportsfarEnabled=false,mountainsVisible=false even with settingsfarVegetation=true. Thus this is an honest production-main versus lab comparison, NOT equal full-background feature settings.

Tested a narrowly scoped QA main override removing only the spatialSession disable condition (backend main-full-background). It fails during loading: `Far world preparation failed: TypeError: field.moisture is not a function`. See main-full-background/load-failure.json. No screenshot or performance claims for failed variant. This confirms simply toggling main's old far profile is incompatible with its native spatial field. Do not fabricate field values, change simulation, substitute a different world, or call default-main a fully populated distant-background baseline. Porting lab's field compatibility into main would cease to be an unchanged old-renderer baseline. Keep limitation explicit in final six-biome comparison.

Reproduce with Vite lab5190/main5191: node tools/experiments/capture-accepted-main-populated-20261023.mjs; repeat with WG_COMPARE_BACKEND=main; python tools/experiments/compare-accepted-main-populated-20261023.py manglares. WG_FIXTURE_BIOME currently supports existing generic populated-frozen fixtures; Desert/Canyon need their dedicated fixture paths before extension. main-full-background is retained as failure reproducer, not functional candidate.

This completes refreshed static Mangrove comparison only; horizon inspection, current other-five-biome combined comparisons, broader live-world performance and final PR closure are not established here. No native renderer/simulation/main edits. Raw PNGs local; paired images/metadata tracked.
