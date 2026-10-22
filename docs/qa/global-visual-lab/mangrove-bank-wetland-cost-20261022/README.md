# Mangrove combined shore candidate ABAB cost

Reproduce `node tools/experiments/measure-mangrove-bank-wetland-cost-20261022.mjs`; set WG_BENCH_OUT to this folder and run `python tools/experiments/audit-canyon-native-composition-resident-cost-20261022.py`.

Intel UHD ANGLE D3D11, Chrome headless, 1280x720, media, seed 712, representative bank. Native baseline versus corrected-owner water sediment + land substrate mask, ABAB. Identical four-unit looping camera, coverage and geometry. 60 warmup/90 samples per GPU and separate cadence pass; 720 valid GPU samples, no disjoint/errors, exact corresponding camera/draw/triangle signatures, simulation unchanged. Resident scene, chunk sync suspended during measurement; excludes cold generation/streaming. No simultaneous screenshots.

Means in ms, baseline / candidate:

| Pair | CPU submission | GPU | RAF interval |
|---|---|---|---|
| Day 1 | 4.234 / 4.401 | 14.650 / 15.125 | 17.556 / 17.816 |
| Night 1 | 4.152 / 4.024 | 15.369 / 15.871 | 18.259 / 18.373 |
| Day 2 | 4.277 / 4.446 | 14.837 / 15.969 | 17.737 / 19.063 |
| Night 2 | 4.487 / 3.934 | 15.005 / 16.141 | 18.918 / 18.661 |

GPU overhead positive in all four pairs: .475, .502, 1.132, 1.136 ms. Magnitude varies; CPU and cadence are mixed, so no FPS improvement claim. Raw percentiles and samples retained. Draw parity does not imply equal shader cost.

Decision: RETAIN visual candidate and optimize before native adoption. Two procedural water noise evaluations plus the land-side mask lookup are possible contributors, not yet isolated causes. Next compare a precomputed/noise texture representation or ablation without changing geometry/density, preserving day/night images as the artistic target. Do not discard attractive shoreline solely for measured cost. Live streaming texture lifetime remains to be exercised beyond the controlled material-owner test. Global objective incomplete.
