# Mapped material average — unaccepted Sabana pilot

Opt-in `ground-palette=native`, Sabana only. The regional worker mixes the same mapped turf average and groundSample417 cover/wear recipe over the original terrain colors, then approximates its fixed diffuse sunlight/filmic output. Flat normal, no environment specular, no texture detail, no near shadows: it is explicitly **not** a native lighting-equivalence implementation. The existing night grading remains approximate and requires visual checking. Defaults and other biomes remain unchanged.

A single existing regional RGBA map is uploaded and sampled; geometry, tree IDs/transforms, water mask and shader are unchanged. The extra material sampling and grading happen only when generating a region in the worker. Their CPU cost is not yet accepted. A real Node worker test confirms the buffers and alpha coverage remain exact and all four output buffers detach.

`python tools/experiments/prepare-native-ground-palette.py --output docs/qa/far-ground-native-palette-pilot/palette.json` reproduces the average input metadata from the listed original base/ARH images; hashes and recipe source are saved. No source image is modified. These means are arithmetic averages of encoded texels, not a claim about mean rendered radiance. Native day/night contrast and movement/cost evidence are still pending.


## First native contrast, source6ac9f794

Explicit day/night at the held220m baobab pose, fog90–480, groundWash0, backdrop height110/fog mix.65/base1. The mapped average reduces the legacy green/brown blotches and looks closer to the near yellow turf in this comparison. This is a local visual observation, not pixel equivalence or full approval: flat cyan water, the continuous backdrop band and tree dither remain. The backdrop height differs from the rejected240m control, so its sky improvement is not attributed to palette grading. The original isolated seam run used fog30–300; comparisons across those images are not a matched preset A/B.

A subsequent20-second approach reaches25m, unchanged state, GL0/errors[]/console[]. Of1,748 near observations,1,573 are prepared and175 initially are not; the existing impostor is retained until preparation. Target readiness has zero subsequent descents. Global99 descents are all classified offscreen, zero potentially visible/unknown. The route pauses at5seconds before continuing; these frame counts include stationary observations and are not FPS measurements. No CPU/GPU timings were collected. Day/night reports, images, final approach and logs are preserved. CPU generation and combined GPU cost remain unaccepted; gameplay stays off.
