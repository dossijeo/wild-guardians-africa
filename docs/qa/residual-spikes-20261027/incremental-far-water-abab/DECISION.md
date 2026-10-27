# Incremental far-water scheduling: do not adopt

Four real-game runs A/B/A/B on Intel UHD, matching source hashes, fixture, 720p medium quality, camera and initial residency; active simulation, 40-second/144-unit streaming. All completed without page/console errors, failed chunks, dropped instrumentation or GPU disjoint events. A1 has one audio ERR_ABORTED request of unproven cause/timing: cleanRequestGate is false. Raw evidence is retained, not relabeled clean. These measurements do not establish across-device causal performance.

| Metric | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Presentation P95 ms | 116.54 | 116.50 | 49.98 | 116.44 |
| Presentation P99 ms | 166.37 | 166.23 | 66.58 | 166.32 |
| Main callback maximum ms | 49.39 | 33.82 | 47.69 | 32.76 |
| GPU render mean ms | 33.59 | 35.25 | 23.08 | 33.77 |
| Chunks completed in window | 19 | 21 | 23 | 20 |
| Chunks still pending | 11 | 9 | 7 | 10 |

Candidate preserves exact original queries/attributes but executes 97 scheduler units for the 6,114 streaming vertices. B1/B2 CPU totals 17.835/20.530 ms, max unit 0.330/0.370 ms, elapsed preparation 1357.575/1981.915 ms. Small units reduce indivisible CPU work but introduce substantial admission latency. The containing regional attachment interval includes waits and must not be reported as CPU. Publication still waits for separate GPU preparation.

Matched completed chunk latencies are worse on average by 240.8 ms in pair1 (19 common keys) and1974.0 ms in pair2 (20 keys). Pending work is retained in comparison; no cherry-picking only early completions. CPU callback maxima improve, but overall presentation does not consistently improve. Large baseline/candidate GPU variation means the full difference cannot be attributed to this CPU-only treatment. Do not claim precise performance regression or an improvement from isolated maxima.

Decision: keep production unchanged; reject this 64-vertex scheduler treatment. Do not repeatedly retune tiny batch sizes without addressing admission/throughput or eliminating unnecessary calculations. The next distinct source hypothesis is the existing native fluidInside predicate: it can avoid unused shore/mask queries while preserving the authoritative inside value. This has not been benchmarked or adopted. The whole-game fluency objective remains open.

Reproduce with run-incremental-far-water-abab.mjs and a fresh output directory, then summarize-incremental-far-water-abab.mjs. Scripts and source hashes preserve treatment. Per-run reports are gzip archived. GPU queries cover World.render, CPU includes synchronous driver waits, RAF intervals are not physical display latency. No memory or final pixel-equivalence acceptance claimed.
