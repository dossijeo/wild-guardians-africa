# Animal initial-rig CPU attribution

Run on local Windows / Node with runtime source `d65e7dc3`. The benchmark tool was added in the working tree; its exact SHA-256 is recorded in `report.json`, alongside hashes of the production runtime modules and the five original authored GLBs. No game code changed.

Reproduce from the repository root:

```
node tools/benchmark_animal_rig_preparation.mjs OUTPUT.json
```

The test calls the real `prepareAnimalClips` and `AnimalPreload.create` for each of the five species, eight times, disposing each owned skeleton/mixer. It keeps original geometry, skinning and animation tracks, with the normal default `skinEnvelope=false`. It removes material texture references solely to make the original GLBs parsable in Node without browser image APIs.

| Species | Original skinned vertices | First clips + rig (ms) | Repetitions 2–8 mean (ms) |
| --- | ---: | ---: | ---: |
| Warthog | 26,422 | 64.75 | 17.47 |
| Hyena | 23,576 | 18.34 | 20.33 |
| Buffalo | 26,860 | 26.27 | 17.09 |
| Lion | 24,506 | 27.00 | 18.84 |
| Rhino | 24,792 | 14.91 | 17.21 |

Geometry-only parse elapsed times were 50–95 ms. The first-use and later measurements include differing JIT/cache effects, so they are not an AB comparison.

This diagnostic does **not** measure downloads, image decoding, production Meshopt GLB decoding, uploads, GPU rendering or the CI Microsoft software renderer. It cannot explain away or quantitatively apportion the native 15-second awaited animal phase. It supports separating asset decode from spare-rig construction in further native attribution rather than assuming the entire phase is CPU rig work. No performance acceptance or production optimization follows from this result alone.

Validation: `python docs/qa/windows-loading-regression/animal-rig-cpu-root/verify.py` passed. Existing animal action and preload suites passed **39/39**, zero failures, in 13,423.0632 ms. Their coverage includes the original five GLBs, grounding poses, reserve ownership, disposal and failed preparation; it does not prove browser rendering.
