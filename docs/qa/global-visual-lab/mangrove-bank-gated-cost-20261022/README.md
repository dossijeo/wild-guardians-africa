# Gated sediment ABAB benchmark

Run measure-mangrove-bank-gated-cost-20261022.mjs, then generic audit-canyon-native-composition-resident-cost-20261022.py with WG_BENCH_OUT=this directory. Intel UHD ANGLE D3D11, media,1280x720,seed712,4-unit moving camera. Both arms include land-mask substrate and sediment; B gates noise outside maximum shore influence. 60 warmup/90 samples per separate GPU/cadence pass, ABAB day/night,720 valid GPU queries, exact corresponding camera/calls/triangles, no errors/disjoint, paused simulation unchanged. Resident scene only, no streaming during measurement.

Means in ms, original/gated:

| Pair | CPU submission | GPU | RAF interval |
|---|---|---|---|
| Day1 | 4.127/4.331 | 14.952/15.095 | 17.114/17.363 |
| Night1 | 4.087/3.920 | 15.862/15.482 | 18.704/17.722 |
| Day2 | 4.369/4.272 | 14.680/13.991 | 17.926/17.000 |
| Night2 | 4.041/4.122 | 15.478/14.789 | 18.103/17.001 |

GPU improves in three pairs (.380-.689ms), regresses .143ms in first day. Cadence follows the same sign; CPU mixed. No guaranteed FPS gain; magnitude varies and baseline drift exists. Six static captures pixel-exact, no extra memory. Retain gated version as preferred QA candidate, preserve original for comparison. This does not prove procedural noise accounts for all prior cost, and cross-run absolute times must not be used to claim full cost recovery versus native. Next live streaming/continuity validation, then consider opt-in native integration.
