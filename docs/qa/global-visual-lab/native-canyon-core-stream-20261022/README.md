# Native Canyon core streaming comparison

Twenty real captures, shore/core, day/night, river-following 0/96/192/96/0-unit checkpoints. All ten corresponding shore/core images are RGB exact. No browser/WebGL errors. Both variants exhibit the same first/day return difference (4193 pixels) already observed before core integration; night returns are exact. This test does not resolve that residual origin/stream difference.

Warm night resident counts return exactly within each variant: shore 94 geometries/67 textures; core 94/66. Cross-session texture counts differ by one and initial counts differ more; do not claim a texture-memory saving from this. Counts are not VRAM bytes, and a short loop is not a long leak test. Core shares geometry and shader texture ownership by implementation.

Reproduce `node tools/experiments/capture-native-canyon-core-stream-20261022.mjs`, then `python tools/experiments/audit-native-canyon-core-stream-20261022.py` with Vite 5190. Native ABAB GPU evidence is in ../native-canyon-core-cost-20261022. Retain the Canyon-only opt-in while continuing construction/performance and quality-profile validation.
