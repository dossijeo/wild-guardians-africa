# Volcanoes geometry residency diagnostic

Run `node tools/experiments/audit-volcano-geometry-lifetime-20261022.mjs`, then `python tools/experiments/summarize-volcano-geometry-lifetime-20261022.py`.

Same saved populated Volcanoes fixture, seed 712, full background, fixed normal camera, early simulation pause, medium/low/medium/low, day/night. QA-only instrumentation observes Three's onGeometryDispose listener registration/removal to enumerate GPU-resident geometries. Every snapshot asserts that the census count matches renderer.info.memory.geometries. Snapshot after 90 stable frames and again after 180 additional frames. No production imports or rendering changes; these runs are not timing evidence.

All eight records are error-free. Both medium runs have 334 resident geometries; both low runs have 308. No additions/removals during the observation interval and no differences between repeated profiles in the recorded descriptors (type, index and attribute counts, parameters, scene owner paths and local positions). This does not hash vertex contents or prove universal resource ownership; unreferenced geometries can belong to auxiliary scenes or caches.

The earlier benchmark's 335-versus-334 medium discrepancy did NOT recur. Its cause remains unidentified; do not retrospectively accept that benchmark, claim a leak is fixed, or infer performance from this diagnostic. Ground mask preupload was not applied here, so texture counts are not controlled benchmark evidence. Keep the earlier strict failure and original data. A fresh uninstrumented controlled benchmark is the next step; broader active-play and streaming validation remains outstanding.

Artistic selections remain unchanged, including the user's original dense Mangrove leaves (left side of the leaf-treatment comparison).
