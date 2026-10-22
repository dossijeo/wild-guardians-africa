# Volcano ash structure pilot

Reproduce: `node tools/experiments/capture-volcano-ash-structure-review-20261022.mjs`, Vite port 5190. Seed 712, media, 1280x720, three fixed views, day 150/night 350. Twelve real renderer captures; baseline and deposits share geometry, camera, time, calls and triangles in all six pairs, no captured errors.

QA-only route patches widen the existing ash threshold from .39-.66 to .30-.60, change ash albedo from (.30,.285,.265) to (.39,.32,.245), and retain .55 rather than .25 ash weight on high height-map samples. No extra textures, geometry or shader samples; existing shading/masks handle relief, normals and roughness. Actual GPU cost may still change through POM early exits and requires measurement.

Normal-camera day/night inspection: broad warm deposits separate bare softer ground from charcoal fractured rock more clearly than the preceding sunlight tint trials. Buildings and original silhouettes remain intact. Night changes too because this changes the surface, not the solar endpoint. Retain as a promising QA candidate; avoid native adoption before cost/motion and additional viewpoint review. Smooth deposits may be too extensive and reduce fine relief; compare against reference before deciding strength. This pilot changes three related controls, so attribution requires ablation if refining it.

No FPS improvement, full mockup match, or resource-leak validation is claimed. Next compare baseline/deposits ABAB and inspect elevated/reverse views before native integration.
