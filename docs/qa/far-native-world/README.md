# Real native Sabana world integration experiment

Opt-in QA at tests/browser/far-native-world.html. Real WorldScene, terrain/chunk workers, sky, Mapungubwe village and seed 712; medium quality, desktop 1280x720. No save writes or normal gameplay activation. WorldScene adds only optional update/dispose calls; the experimental adapter is loaded by the QA fixture.

First region: 646 acacias sampled deterministically, 25 resident chunks, 18 nearby trees ready in visible native batches after one completed native GPU preparation. Moving 96 m replaces the region with 648 acacias, preserves 25 resident chunks and prepares visible native batches a second time. A requested suppression disables the matching billboard. Detaching removes regional visuals and restores native coverage. Four reports/screenshots saved. All runtime error arrays empty and WebGL errors zero. Console may contain ANGLE environment4 uninitialized-variable warnings; these are retained, not represented as an empty console.

The initial native GPU signature included merged instanceMatrix versions. Updating crossfade coverage changed those versions and retriggered preparation repeatedly. The adapter now tracks structural material/geometry/count and render origin identity while native CPU packing records track actual instance layout. It considers only chunks intersecting the color camera frustum. Preparation uses a zero-pixel native draw and fence, with cancellation on obsolete signatures. Rendering a CPU array is never taken as GPU completion.

A low-resolution regional ground proxy is necessary because the existing native horizon runs only in canyon/desert. The region therefore requests ground data at step 8, uses washed vertex colors, clips the live resident rectangle, and applies experimental fog from 160 to 380. Ground and billboard GPU resources are prepared before adopting the region. Resources are retired with the region; atlas/source assets remain caller-owned.

This is NOT visual success: distant grounding/terrain interpolation, colors, atmospheric transitions, angular/LOD silhouette and density still need adjustment. Only one desktop biome/culture is covered. Native shadows are not faded with these impostors. No mobile GPU/RAM, FPS, all-quality or successful full-horizon claim. The underlying gameplay remains unchanged by default.

Validation: 18 focused ground/layer/native-coverage/worker tests pass. Production build passes with the existing large-bundle warning. The full acceptance goal remains open.
