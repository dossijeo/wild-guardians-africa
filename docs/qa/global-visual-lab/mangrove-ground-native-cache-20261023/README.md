# Fixed512 integrated renderer lifecycle

The selected cache now resides in src/rendering/mangrove-material-cache.js, with the same shared bake/live shader and chunk event observer moved into src/rendering. The QA adapters reuse these modules. New runtime option: visualLab=global-lighting&groundCache=fixed512, additionally gated on the existing Mangrove substrate and shoreline features. No default/main behavior is changed.

Scene.drawRenderFrame creates the owner lazily and performs its bounded update outside floating-origin drawing, including loading frames. Scene.dispose releases it before material and renderer disposal. No runtime dependency from the new modules to QA tools remains. The old QA adapter can still install the same owner for controlled tests.

Real load smoke, Intel UHD / 720p / medium / day: 30 chunks registered, 5 removed during loading/camera setup, 25 targets resident; 35,209,000 bytes resident and peak, no rejected requests or browser errors. Capture inspected: no obvious missing terrain or vegetation. Compared with the earlier post-load QA installation capture, ground crop is pixel-exact; full image differs in 5,126 pixels, MAE 0.0891, max 130. Those differences have not been attributed and full-scene equivalence is not claimed. Different installation timing is now part of the tested path.

Nine queue/chunk tests pass after relocation. npm run build passes (bundle-size and pre-existing mixed static/dynamic import warnings). The short cadence sample is a functional smoke, not performance evidence. The approved fixed512 benchmarks remain applicable to shader selection, not proof that all loading/streaming costs are closed.

Pending: continuous streaming CPU/GPU and generation spikes through this integrated path, full image discrepancy attribution, and broader quality/night integration validation. PR remains draft; this option is not promoted to default.

Reproduce via WG_VARIANT_SEQUENCE=fixednative, WG_PHASES=day, WG_COVER_QUALITY=media, WG_VIEW=normal, WG_MODES=cadence, WG_SAMPLES=30, WG_WARMUP=60, WG_REVIEW_OUT=<new directory> and tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs. The harness sets groundCache=fixed512 before loading the world, without invoking the QA cache installer.
