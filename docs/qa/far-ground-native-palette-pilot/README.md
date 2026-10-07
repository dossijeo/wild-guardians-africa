# Mapped material average — unaccepted Sabana pilot

Opt-in `ground-palette=native`, Sabana only. The regional worker mixes the same mapped turf average and groundSample417 cover/wear recipe over the original terrain colors, then approximates its fixed diffuse sunlight/filmic output. Flat normal, no environment specular, no texture detail, no near shadows: it is explicitly **not** a native lighting-equivalence implementation. The existing night grading remains approximate and requires visual checking. Defaults and other biomes remain unchanged.

A single existing regional RGBA map is uploaded and sampled; geometry, tree IDs/transforms, water mask and shader are unchanged. The extra material sampling and grading happen only when generating a region in the worker. Their CPU cost is not yet accepted. A real Node worker test confirms the buffers and alpha coverage remain exact and all four output buffers detach.

`python tools/experiments/prepare-native-ground-palette.py --output docs/qa/far-ground-native-palette-pilot/palette.json` reproduces the average input metadata from the listed original base/ARH images; hashes and recipe source are saved. No source image is modified. These means are arithmetic averages of encoded texels, not a claim about mean rendered radiance. Native day/night contrast and movement/cost evidence are still pending.
