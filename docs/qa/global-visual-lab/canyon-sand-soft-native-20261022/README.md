# Native soft Canyon sand option

Enable visualLab=global-lighting&canyonSand=full&canyonSandBlend=soft. Explicitly gated; original deposit response remains default. BiomeGround carries the option to resident/horizon materials, AfricanToon selects the expression and distinct shader cache key. No extra textures/samples/buffers/draws. Only scalar weighting changes.

Twelve fresh game captures, seed918271, medium1280x720, same wide poses/day/night as QA source. Ten are pixel-identical; candidate elevated day/night differ by at most1/255 per channel, mean absolute channel delta below0.000017. No visible discrepancy. All original controls exact. No captured browser/GL errors. Three targeted tests pass (opt-in gates, full/reduced variants, soft cache isolation).

The sand shader is native in this fixture, but adaptive geometry and warm-floor/other V11 adapters remain QA dependencies. This does not claim full renderer integration or six-biome completion. Other quality profiles and reliable GPU measurements remain pending; no FPS claim. Prior near and motion evidence is in canyon-sand-soft-near-20261022 and canyon-sand-soft-motion-20261022.

Reproduce with Vite5190:
```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/capture-canyon-sand-soft-native-20261022.mjs
node --test tests/global-canyon-sand.test.js
```
Native option retained for review, no main merge.
