# Integrated chunk-water A/B/A/B

Four interleaved runs completed; identical source hashes, Intel UHD hardware, initial camera/target and resident keys verified by the comparator. Active agricultural Manglares, medium 720p, 40-second camera travel, warmed and settled before recording. Original synchronous fallback is explicitly restored only in A via QA interception. B uses the integrated shared sampler with counters.

| Metric | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Maximum water unit ms | 24.50 | 6.38 | 25.76 | 6.24 |
| Completed demands / 30 | 19 | 22 | 18 | 23 |
| Pending demands | 11 | 8 | 12 | 7 |
| Completed-demand P95 ms | 11273 | 5563 | 8774 | 5813 |
| Render CPU P95 ms | 20.90 | 20.54 | 20.22 | 21.22 |
| Presentation P95 ms | 99.77 | 99.88 | 99.77 | 99.82 |
| Presentation P99 ms | 133.21 | 133.02 | 132.86 | 133.05 |
| Frames above 100 ms | 27 | 37 | 35 | 33 |
| GPU query P95 ms | 56.91 | 57.71 | 57.24 | 56.27 |

Matched completed keys prevent an overly favorable interpretation of censored latency: B1 improves 18/19 (median delta -3441 ms), B2 improves only 2/18 (median +301 ms). The second candidate completes more tail chunks but does not uniformly deliver common chunks earlier. No cancellation or instrumentation drops; all runs encounter 40 distinct chunks. Dynamic state and instantaneous residency are not identical.

Decision: retain the integrated change on the experimental branch as a demonstrated reduction in indivisible water preparation cost and increased completed throughput. Do not describe it as a whole-game fluency or GPU improvement, and do not promote on that claim. P95/P99 presentation remains poor; the earlier faster series cannot be directly substituted for this one. The cause of between-series slowdown is not established.

Before main promotion, finish broader regression acceptance and assess the delivery tradeoff. Next performance work should target the remaining large attributed costs, not continue tuning sub-millisecond water yields. Preserve art, sampling and native prepared-bed reuse. All raw reports and provenance are retained; run compare-chunk-water-bed-abab.mjs against uncompressed reports to reproduce, including matched-key results and source identity assertions.
