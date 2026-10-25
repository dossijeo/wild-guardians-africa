# Native diffuse loading light

Opt-in: `?loadingBeam=diffuse`. Existing default and `loadingBeam=oblique` are preserved. The native diorama now owns the diffuse multi-shaft atmosphere, day vignette adjustment, local maize/soil illumination, dynamic island fade, deterministic night stars and a 512px native shadow map. The source direction used by normals and the shadow light is the same camera-relative vector, preserving alignment with the projected ray as the camera orbits. Camera zoom is unchanged.

The effect is installed before crop-stage prewarm. Its update and planting invalidation are explicit diorama lifecycle calls, not camera-method/onPlant monkey patches. Disposal releases its shadow hook, target and fallback once; the world's scoped shadow hook remains intact. No changes to simulation or original maize meshes.

Four paired 1280x720/390x844 day/night images match the prior QA implementation pixel for pixel (equivalence.json), with 6 cached-shadow draws / 16002 triangles and no GL/JS errors. These captures still use QA backdrop/contact/sky fixtures to isolate shader equivalence. Duplicate matching PNGs are reproducible, not committed. The native option alone does not yet include the central mesa, contact registry, fixed planting region or QA global sky grading.

Actual menu-to-load-to-game and cancel flows also pass, see ../loading-diffuse-flow-20261022/flow.json. Read-only canvas observations are not performance measurements. The late canvas screenshot shows the native option's current backdrop, not the final central mesa composition. Twenty-four existing loading tests and two new option/resource-ownership tests pass.

Reproduce: node tools/experiments/capture-loading-diffuse-native-20261022.mjs; node tools/experiments/verify-loading-diffuse-flow-20261022.mjs. Vite port 5190. Timings for changing shadow-light direction, all-stage load cost, full composition integration and broader device validation remain pending.
