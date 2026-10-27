# Six-biome incremental water functional validation

All six historical populated fixtures completed low/medium/low quality transitions with active simulation and 240-frame moving camera. Each created 15 chunks; simulation advanced on every sampled frame, no pause, failed chunk, or pending queue at completion. summary.json is regenerated with tools/experiments/summarize-chunk-water-six-biomes.mjs and asserts these invariants.

The incremental water route ran in five biomes. Desert exercised no applicable water: absence of regression only. Manglares exercised just one call/yield in this historical fixture; broader water coverage comes from the separate integrated ABAB and live probes, not this row. Compiler X4000 warnings are retained (15–28 per biome); no other captured errors.

These diagnostic timings include correctness work and are not performance evidence. This run does not establish current-layout artistic equivalence, night coverage, or final fluency. No screenshots were produced by this mode. Main promotion remains subject to those relevant evidence gaps and final integration checks.
