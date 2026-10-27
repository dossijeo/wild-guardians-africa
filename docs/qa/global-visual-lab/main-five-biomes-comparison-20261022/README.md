# Main versus experimental: six-biome review

Baseline frozen at origin/main b2497b069, isolated detached checkout on port5191. Candidate uses previously captured native selected recipes (source directories recorded in comparison.json). No baseline source edits. Same dependency lockfile. This is whole-product artistic evidence, not a same-workload performance benchmark.

Five additional biomes:60 real baseline captures (warmup/native repeats),30 selected paired comparisons. All30 camera, target, visual time and render-origin checks pass exactly; no recorded page/GL errors. Seed712, medium quality,1280x720, day150/night350, game/elevated/reverse cameras. Desert supplies another six pairs from the populated fixture in ../main-desert-comparison-20261022.

Main deliberately retains its own behavior: it disables far vegetation when Wild Engine spatialSession exists. Experimental includes connected distant impostors. Do not hide this feature difference or interpret draw counts as equal-workload performance. Same pose and seed do not prove every procedural entity matches: source engine binaries differ, though principal visible layouts align in inspected normal day frames. Other five scenes are new campaign openings, not the populated Desert fixture.

Reproduce baseline: node tools/experiments/capture-main-five-biomes-comparison-20261022.mjs with unmodified frozen main served on5191. Compose/audit: python tools/experiments/compare-main-five-biomes-20261022.py. The compositor asserts camera/time/origin/error controls, not artistic quality. Source directories and draw/triangle counts are retained in comparison.json. Panels are uncropped, same size, no color correction; main left, candidate right.

## Initial normal-day artistic review

- Sabana: visibly deeper continuous grass and shadow separation; softer, less saturated water boundary. Retain. Far appearance and temporal checks still matter.
- Gran Rio: denser collective grass, exposed soil shore and stronger depth separation. Retain; broad soil bands and distant continuity need whole-scene judgment.
- Mangroves: water and moss shoreline integrate better; cupped leaves add relief, but broad repetitive patches and recognizable alignments remain a significant normal-view defect. Preserve approved deep-blue water/moss while correcting cover distribution/material variation. No performance-based rejection.
- Volcanoes: less blue cast and broader rock/ash structure. Difference is more restrained than Desert/Canyon; lava's geometric pattern and bank remain conspicuous. Do not claim the same magnitude of improvement in every biome.
- Grand Canyon: substantial wall stratification, warm ground and shadow volume; river better integrated. Repeated highlights remain optional unless dominant; inhabited framing and animation evidence still required.
- Desert: see populated pilot; substantial dune/shadow improvement.

Only normal daytime pairs were visually inspected in this pass. Day/night elevated/reverse pairs are supplied, not yet certified perceptually. This is not biome closure, motion validation, GPU timing or full campaign validation.

## Paired images

### sabana

day: [normal](side-by-side-sabana-day-0.jpg) · [elevated](side-by-side-sabana-day-1.jpg) · [reverse](side-by-side-sabana-day-2.jpg)

night: [normal](side-by-side-sabana-night-0.jpg) · [elevated](side-by-side-sabana-night-1.jpg) · [reverse](side-by-side-sabana-night-2.jpg)

### gran-rio

day: [normal](side-by-side-gran-rio-day-0.jpg) · [elevated](side-by-side-gran-rio-day-1.jpg) · [reverse](side-by-side-gran-rio-day-2.jpg)

night: [normal](side-by-side-gran-rio-night-0.jpg) · [elevated](side-by-side-gran-rio-night-1.jpg) · [reverse](side-by-side-gran-rio-night-2.jpg)

### manglares

day: [normal](side-by-side-manglares-day-0.jpg) · [elevated](side-by-side-manglares-day-1.jpg) · [reverse](side-by-side-manglares-day-2.jpg)

night: [normal](side-by-side-manglares-night-0.jpg) · [elevated](side-by-side-manglares-night-1.jpg) · [reverse](side-by-side-manglares-night-2.jpg)

### volcanes

day: [normal](side-by-side-volcanes-day-0.jpg) · [elevated](side-by-side-volcanes-day-1.jpg) · [reverse](side-by-side-volcanes-day-2.jpg)

night: [normal](side-by-side-volcanes-night-0.jpg) · [elevated](side-by-side-volcanes-night-1.jpg) · [reverse](side-by-side-volcanes-night-2.jpg)

### gran-canon

day: [normal](side-by-side-gran-canon-day-0.jpg) · [elevated](side-by-side-gran-canon-day-1.jpg) · [reverse](side-by-side-gran-canon-day-2.jpg)

night: [normal](side-by-side-gran-canon-night-0.jpg) · [elevated](side-by-side-gran-canon-night-1.jpg) · [reverse](side-by-side-gran-canon-night-2.jpg)

[Desert paired images and controls](../main-desert-comparison-20261022/README.md)

## Follow-up: normal night views inspected

All six normal night pairs inspected. Sabana/River retain visible grass depth and recognizable silhouettes; darker, less saturated water fits surroundings. Mangrove leaf-patch repetition persists at night, while water/shore integration improves. Desert dune relief remains readable. Canyon wall detail and softened shoreline remain visible; broad dark-blue river and repeated highlights still need motion judgment. Volcano ground separates rock/ash more clearly, but lava dominates both images and geometric glowing cells remain conspicuous. No normal-night catastrophic loss of readability identified; this is qualitative review, not a luminance or playability certification. Elevated/reverse visual review and temporal checks remain pending.
