# Canyon sand material blend study

Seed918271, medium1280x720, three wide views day/night, twelve real campaign captures. Both arms use the same optimized adaptive mesh and smooth normals. Camera/time/draw/triangle counts match in all six pairs; no captured errors. Only the sand deposit weighting changes.

Source: global-canyon-sand.js uses a thresholded two-frequency noise signal to blend soil and sand at full strength regardless of projected scale. The QA route blends deposit towards0.55 using existing world-footprint derivatives, transitioning between0.16 and0.65 world units/pixel. The soft variant retains a0.35 lower bound on contrast. This is an artistic screen-footprint response, not mathematically exact noise integration or physically based filtering.

Retain QA candidate: preserves35% of original deposit variation at the far end, reducing camouflage-like contrast while retaining visible variation. Near/gameplay and moving-camera fade validation remain pending; not integrated.

No additional textures, texture samples, geometry, draw calls or passes. Adds scalar smoothstep/mix arithmetic; no measured GPU/frame cost or FPS claim. The chosen0.55 midpoint is not a measured material-average value. Material still has stylized broad patches and the overall six-biome goal is not complete.

Reproduce with Vite5190 and WG_REVIEW_BIOMES=gran-canon: node tools/experiments/capture-canyon-sand-soft-blend-20261022.mjs, then python tools/experiments/package-canyon-sand-soft-blend-20261022.py. Production shader unchanged.
