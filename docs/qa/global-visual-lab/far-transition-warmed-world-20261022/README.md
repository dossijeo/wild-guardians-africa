# Far transitions, warmed single-world control

QA only. Seed 712, Sabana, media 1280x720, full spatial far background. One loaded world, first traverse all three cameras day/night to finish representation preparation. Then capture dither reference, smooth alpha and return to dither. Water shaders are untouched. Registered impostor/standby materials toggle and recompile in place. Standby copies borrow runtime uniforms; excluded from a second material-registry pass to avoid applying AfricanToon twice. Prototype-only shader failure was diagnosed and fixed; load-failure files in earlier output describe failed attempts.

All six before/after pairs have equal calls and triangles. All six before/return images are RGB exact, with equal calls/triangles. Elevated view is unchanged under alpha, while normal and oblique views change only the transition regions: approximately 6k and 20k pixels respectively. No GL/page errors. This is much stronger control than the earlier reload comparisons, which changed representation while loading.

Smooth variant: impostor blend alpha, front-face standby shading, no depth writes for these transparent batches, no coverage dithering in those two routes. Resident near-obstruction recipe untouched. Retain as candidate, not production default: pending overlap/order checks in dense scenes, moving-camera validation and extension to other biomes. Front-face culling does not imply a single layer for complex foliage. Full-scene benchmark stored separately when complete; static capture alone is no performance evidence.

Reproduce with capture-far-transition-warmed-world-20261022.mjs. audit.json compares before/after; return-audit.json compares exact return. Warmup images are intentionally included to document the earlier transient representation.
