# Intermediate Canyon bank cost

Medium1280x720, Intel UHD, full far backgrounds, fixed camera, seed712. Original/balanced/original/balanced, day/night each. Both use opaque core. 60 warmup +90 GPU samples and a separate cadence measurement per pass. Reloaded worlds, paused simulation, no streaming within samples.

| Phase/pair | Original GPU ms | Balanced GPU ms | Delta |
|---|---:|---:|---:|
| Day1 |12.702|14.565|+1.863|
| Day2 |11.095|12.176|+1.081|
| Night1 |13.785|14.099|+0.314|
| Night2 |14.332|14.515|+0.183|

720 valid timer samples; no query errors/disjoint. All paired frame cameras, draw calls and triangle counts match, zero workload mismatches. CPU means3.7–4.15ms, mixed; summary.json contains percentiles/cadence. No FPS improvement claim. Repeated daytime increase supports a real cost, but run-to-run thermal/order variation remains; two pairs are not a general upper bound.

Retain visual candidate rather than discard on performance alone. Broader transparent rim can weaken opaque-core savings; that mechanism is an inference, not an isolated timing of individual passes. Next measure/optimize rim fragment work and validate camera movement before integration. No production change. Additional native elevated daytime inspection shows continuous banks without transverse stripes; not temporal certification.

Reproduce: node tools/experiments/measure-canyon-balanced-bank-cost-20261022.mjs then python tools/experiments/audit-canyon-balanced-bank-cost-20261022.py, with dev server5190 and no competing browser benchmark.
