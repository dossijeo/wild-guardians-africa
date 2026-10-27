# Native fixed-view planting region

Integrated the QA presentation region into the diffuse loading option through a placement predicate, without patching methods or changing simulation. Original radial placement remains the default. Camera distance, zoom and FOV do not change when planting. View matrices are prepared once; placement validation runs only on planting gestures.

Reproduce: `node tools/experiments/capture-loading-native-region-20261022.mjs`, Vite 5190. Seed 712; 240 deterministic placement attempts; eight mature plants. Twelve real captures cover day/night, landscape/portrait and orbit -10/0/+10 degrees. No console/GL errors. Static captures: 6 calls, 44154 triangles. These are counters, not GPU timing claims. Twelve focused tests pass.

The predicate is the intersection of the two QA aspect ratios and three orbit poses, with a conservative crop envelope. Other aspect ratios and intermediate poses still need coverage. Three original roots fail that conservative envelope; initial composition is intentionally preserved. Portrait edges need further visual refinement for initial leaves. The full-region UI message is not implemented; the capture suppresses the planting hint and leaves an empty parchment. Sky and horizon mist still use QA adjustments. Full mockup quality is not yet established.
