# Mud terrain lookup: continuous-path ABAB

Intel UHD, 720p, medium/day, fixed512 integrated in both variants; 30 warmup / 240 recorded cadence frames. A=fixednativelegacy serves original formatted-string lookups in the two call sites. B=fixednative uses the numeric lattice key, including the signed-zero fix. No visual quality, density or cache resolution changes.

| Pair | A mean frame ms | B mean frame ms | A p95 ms | B p95 ms | A max ms | B max ms |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 40.673 | 38.201 | 104.2 | 93.1 | 130.4 | 137.0 |
| 2 | 38.876 | 37.706 | 95.9 | 91.6 | 133.7 | 144.5 |

Mean/p95 improve in both repetitions; maxima do not. Render CPU mean goes 14.122 → 13.128 ms and 12.929 → 13.133 ms, so improvement of that metric is not consistent. Chunk installation occurs also outside the render callback, hence render CPU is not total CPU preparation.

Identical camera paths and start/end cache counters in all runs; each ends with 25 resident targets, 33.58 MiB and no rejected requests. No browser/GL errors. Strict per-frame workload equality does not hold: pairs have 17 and 20 frames with different calls/triangles due to asynchronous scene readiness (exact contributors not traced here). Therefore timings are provisional end-to-end evidence, not a causal acceptance claim. Earlier direct preparation measurements support reduced lookup cost. This small change does not solve streaming stalls.

Final captures differ in 5 and 21 pixels, respectively (RGBA MAE 0.0000193 and 0.000246). Exact full-frame equality is not claimed. Coordinate-equivalence unit tests pass; green substrate, fern density, material maps and lighting recipe remain unchanged.

Keep the low-complexity key optimization provisionally; continue with measured natural-water preparation cost rather than repeatedly tuning this lookup. Fixed512 selection is unchanged. No main integration.

Reproduce: WG_VARIANT_SEQUENCE=fixednativelegacy,fixednative,fixednativelegacy,fixednative; WG_STREAM_PATH=1; WG_PHASES=day; WG_COVER_QUALITY=media; WG_VIEW=normal; WG_MODES=cadence; WG_SAMPLES=240; WG_WARMUP=30; WG_REVIEW_OUT=<new directory>; run measure-mangrove-ground-hybrid-20261023.mjs. No preparation instrumentation is enabled during this run.
