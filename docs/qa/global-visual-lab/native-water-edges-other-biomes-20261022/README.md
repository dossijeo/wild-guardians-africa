# Natural edges: remaining biome parity

48 real captures cover River, Mangrove, Desert and Volcano; seed 712, medium 1280x720, three matched poses, day/night. Alongside the prior Savanna/Canyon set, all six biomes now have static native/QA comparison evidence.

14/24 pairs are RGB exact. River is exact in all six views. Mangrove has 1–32 differing pixels in four views, mean RGB error below 0.000024. Desert unchanged control has 1–3 differing pixels in four views. Causes of these small differences are not isolated; do not claim pixel parity for them. Volcano night view 0 differs in 127 pixels with equal counters. Volcano night view 2 differs in 106949 pixels and has unequal calls/triangles; exclude it from equivalence and performance conclusions pending isolation. All records have no reported browser/WebGL errors.

This gate supports retaining the shoreline integration, not declaring it complete. Mangrove moss and olive water remain visible; uniform water body remains an artistic limitation. Native streaming is being validated separately. No new GPU timing result is claimed.

Reproduce with WG_REVIEW_BIOMES=gran-rio,manglares,desierto,volcanes and WG_REVIEW_OUT=docs/qa/global-visual-lab/native-water-edges-other-biomes-20261022; run `node tools/experiments/capture-native-water-edges-parity-20261022.mjs`, then `python tools/experiments/audit-native-water-edges-parity-20261022.py` with the same output variable. Vite 5190 required.
