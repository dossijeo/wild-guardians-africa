# Parallel rays, island haze, fixed zoom

Reproduce: `node tools/experiments/capture-loading-parallel-fixed-20261022.mjs` with Vite on port 5190.

User direction supersedes automatic framing trials. This candidate uses the native fixed distance per aspect, with no framing adapter. Original portrait distance 1.65 is preserved.

Eight real-renderer captures compare original atmosphere against four soft parallel shafts and peripheral soil haze: landscape/portrait, day/night, seed 712, progress .75, four original maize plants. Camera/resolution identical within pairs. Existing garden backdrop, contact and native-shadow QA fixtures are shared. Mist and maize/soil lighting share the ray footprint; haze only affects the ground perimeter.

All eight captures: 6 draws, 16002 triangles, GL error 0, no console/page errors. Static shadow-cache counts, not GPU timing; extra shader arithmetic is not benchmarked. Artistic projected light, not physically occluded volume.

Audit verifies identical camera position, zoom 1 and FOV 40 after planting from 4 to 18 in portrait with reduced motion. Existing orbit and aspect-dependent framing are preserved. Capacity screenshot exposes edge clipping: future composition/planting-bound tuning must respect fixed zoom, never retreat. No claim all leaves fit.

Retain this as a QA candidate: beams remain more graphic and island larger than the mockup. Default runtime and single-shaft opt-in are unchanged. Historical auto-framing helpers are reproducible discarded trials, not candidates for integration.
