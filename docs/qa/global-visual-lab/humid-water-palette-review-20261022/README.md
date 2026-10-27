# Humid water: warmer pigment comparison

24 real captures, seed 712, medium, 1280x720, three poses, day/night. Compare previous regional palette with a warmer base ink: Mangrove #546747 → #879a42; River #326768 → #487f70. No reflection, ripple, shadow, geometry or shore changes between variants. Global water currently uses ink 0 as base; the other inks remain recorded for reproducibility.

The river camera now targets the main channel at z=102. Mangrove retains the moss/sediment shore; both use QA worldbank edges. Twelve paired views match camera, target and time. See audit.json for geometry counters. No browser/WebGL errors. This is an artistic test, not a timing benchmark; constant changes add no shader instructions or resources, but no measured speedup is claimed.

Warmer pigment fixes the gray cast in Mangrove and remains visible at night. Its daytime body is still too uniform and opaque-looking; retain as a candidate, not a final palette. The River adjustment is restrained and keeps clear reflections and the soil-bank contrast. It is a good candidate for the next native opt-in integration alongside Canyon mineral blue and Savanna subdued pond color.

Reproduce with `node tools/experiments/capture-humid-water-palette-20261022.mjs`, then `python tools/experiments/audit-humid-water-palette-20261022.py` (Vite 5190). Side-by-side sheets put previous regional palette left and warm variant right. Production rendering defaults remain unchanged. Do not interpret these static captures as proof of streaming stability, resource lifetime or GPU timing equivalence.
