# Microevent flower, feather and spore finish

Follow-up to merged PR #184, baseline `39a50ca2b`. Reviewed its complete 40-event catalogue before selecting three remaining silhouettes. This iteration does not repeat its water, cloud, foliage or grain work.

## Art changes

- Feather: broader asymmetric vanes, a dark tip and visible central shaft. This is a small improvement at normal camera distance.
- Flower: six cupped petals surround a contrasting ochre disc. The bloom faces the atlas authoring camera so its centre remains visible in game.
- Spores: round airborne fungal motes replace the paired leaf/seed shape. They now remain visible over dry terrain; the denser appearance is intentional and needs art review.

A rodent face experiment was rejected because the normal burrow state conceals the animal and the change offered little visible benefit. No burrow change ships.

Only cells 32, 34 and 48 have changed visible pixels (`atlas-diff.json`). The other 61 cells preserve all nontransparent pixels and alpha. WebP may recode RGB underneath fully transparent pixels. The final source atlas incorporates just these three baked cells against the shipped baseline; `patch-microevent-art-finish.mjs` preserves the existing assets while authoring.

## Real-game evidence

`comparison.webp`: before on left, after on right; rows feather, flower, spores. Crops are at original 1:1 scale from real Chrome/WebGL game frames at 1280x720, normal camera, wood fixture, random seed 178, age 0.75 seconds. Full frames accompany the comparison (WebP quality 86); the comparison was composed before that compression. The paired script swaps atlas textures inside the same frozen scene.

`before.json` and `gestures.json`: matched renderer observations and real browser primary gesture replays. All three changed events complete without hold fallback; a fourth burrow control also passed. Draw calls remain 76 and instances remain 1 / 3 / 19. There are no browser page errors. The gesture results predate only restoration of unrelated atlas cells, not the final three artwork cells.

82 directed microevent tests pass. Production build passes with existing large-chunk and mixed-import warnings. No runtime, simulation, camera, audio, gesture, hit-radius, instance-count or geometry code changes. Runtime atlas remains 512x512; lossless WebP grows from 66,088 to 67,648 bytes.

## Benchmark and limits

`benchmark.json` contains 240 samples per atlas, eight alternating A/B blocks, ten warmup draws per block, identical frozen full scene with 19 spores. Each measurement wraps renderer.render and gl.finish, so it includes CPU submission and GPU completion; it is not a pure GPU timestamp measurement. Chrome headless uses Intel UHD Graphics through ANGLE/D3D11.

Final sequential run: baseline median 3.30 ms / p95 73.60 ms; candidate median 3.10 ms / p95 79.00 ms. Median does not indicate a material cost increase, but large tail noise prevents a tight performance-equivalence claim. Earlier runs under concurrent tests were discarded. The test adds no runtime work or draws; alpha coverage is changed. This is one fixture/GPU and does not establish every biome or lighting condition.

## Reproduce

Set WG_QA_PLAYWRIGHT_MODULE to the installed Playwright index.mjs and WG_QA_URL to the dev server (default port 5248 for the new tools). Write the baseline atlas binary from git revision 39a50ca2b to public/content/microevents/atlas-before.webp before running the pair capture or benchmark. Do not package that temporary baseline file.

Run tools/experiments/capture-microevent-atlas-pairs.mjs, then tools/experiments/benchmark-microevent-atlas.mjs sequentially. For rebaking: render-microevents-atlas.mjs, patch-microevent-art-finish.mjs, then tools/generate_microevent_assets.mjs.

Draft for art review. Do not merge automatically.
