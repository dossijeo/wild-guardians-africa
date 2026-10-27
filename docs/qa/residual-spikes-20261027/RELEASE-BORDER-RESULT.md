# Incremental native residency boundaries — first real-game decision

Status: experimental, not adopted in production binaries or main.

The complete A/B/A/B sequence is in `release-border-abab-v2/comparison.json`. All four runs completed with no page errors, console errors or failed requests. Same fixture and harness hashes, Intel UHD, 1280×720, medium quality, live simulation and two 40-second camera sweeps. Native worker timing makes resident chunk arrival non-identical; see per-run residency counts. No shader program waits were observed.

| Measurement (ms unless count) | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Presentation P95 | 33.415 | 33.425 | 33.400 | 33.405 |
| Presentation P99 | 50.020 | 50.060 | 50.010 | 50.070 |
| Presentation maximum | 116.405 | 116.465 | 133.055 | 116.525 |
| CPU render maximum | 79.550 | 63.425 | 80.825 | 66.355 |
| Median recorded release call | 9.235 | 2.155 | 13.895 | 2.095 |
| Median CPU render on recorded release frames | 34.510 | 25.490 | 34.585 | 27.875 |
| CPU render frames >33.333ms | 8 | 5 | 8 | 2 |
| Presentation intervals >50ms | 69 | 80 | 65 | 81 |

Release statistics are conditional on calls >=1ms (13 per run), not all calls. CPU render excludes simulation/UI and asynchronous preparation outside World.render. GPU query P95 remains about25–26ms; no GPU benefit claimed. Maximum CPU render is at the initial camera reposition in all runs, so it is not a steady-state percentile.

Conclusion: repeatable local CPU savings on eviction frames, but no demonstrated improvement in global presentation percentiles. Counts just above50ms are worse in both candidate runs and must not be hidden; thresholds are close to refresh quantization. Two repetitions do not establish a broad regression or improvement. Do not label this a completed fluency optimization.

Correctness: candidate pthread versus original standalone passed all six biomes in `release-border-concurrency.json`, including six navigation profiles, obstacle-preserving batch removal while generation runs, rejection of stale publication, retry, duplicate/missing removals, complete eviction and disposal. The separate cell-by-cell differential also passed six biomes. This is not a full campaign/save-load acceptance suite.

Visual scope: first paired capture inspected; approved fern coverage and nearby roots/rocks retained. Tutorial overlay is present in both. Simulation clock differs slightly; not a pixel-exact image test. Further captures remain to inspect.

Next: record native removal calls with whether the selected chunk is included. The existing code regenerates another resident chunk's visual payload when removing the selected chunk. Isolated native timings implicated this cost, but the real-game23.5ms release has not yet been attributed. A new diagnostic run records this distinction; it must not be mixed into the completed ABAB sequence.

Reproduction: build candidate as recorded in release-border-candidate.json; run tools/experiments/run-release-border-abab.mjs with a fresh WG_RELEASE_ABAB_OUT, then compare-release-border-abab.mjs on that directory. The completed sequence used the harness SHA in each provenance record; later attribution instrumentation is a distinct harness revision.
