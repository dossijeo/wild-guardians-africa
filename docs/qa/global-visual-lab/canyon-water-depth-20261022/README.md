# Canyon shallow-water edge prototype

Adds two floats per existing river-water vertex: signed distance to river center and local canyon water half-width. Coordinates are evaluated in absolute chunk space during creation. Shader interpolation derives a soft shallow-water band and blends the base water pigment toward turquoise before existing lighting/reflection/shadows. This is approximate lateral shallowness, not measured bathymetry or transparency. No terrain, navigation or simulation changes.

Reproduce: WG_REVIEW_BIOMES=gran-canon; node tools/experiments/capture-canyon-water-depth-20261022.mjs; python tools/experiments/package-canyon-water-depth-20261022.py. Seed 712, media 1280x720, three views/day/night. Twelve real campaign captures, six pairs with matching camera/target/time/draws/triangles; no console/network/GL errors.

Costs: 8 bytes per existing water vertex, one vec2 varying, riverX/canyonFrame evaluation per vertex on chunk creation, fragment interpolation/smoothstep/mix. No extra texture sample, texture, triangle, draw or pass. CPU/GPU/streaming cost is not yet measured. Far horizon water is deliberately unchanged in this initial pilot, so near/far continuity is unresolved.

Decision: retain as a candidate. It gives a modest visible turquoise shore transition without the prior dark trench, but the geometric boundary remains straight and does not yet match the rocky irregular reference. Requires chunk/origin/near-far continuity tests and cost attribution before native integration. Do not claim full shoreline quality. Original runtime unchanged; prototype is QA only.
