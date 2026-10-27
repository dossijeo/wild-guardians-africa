# GPU sampler calibration

Five samples completed with zero invalid counters. Wall11.711s, samplerCPU3.078s (~0.263 core equivalents): not negligible, so do not use it as invisible benchmark instrumentation.

With no game benchmark running, ChatGPT pid42388 reports approximately90–92% on the 3D engine in this calibration, unlike the preceding5–8% idle observation. This demonstrates changing non-game GPU activity now; it cannot retroactively establish contention in each previous ABAB run. Do not attribute the change to a particular UI feature without evidence.

Use bounded standalone diagnostics to establish conditions before further performance acceptance. Keep interleaved raw results and do not reclassify failed/inconsistent candidates as successes based on this observation. Source and raw samples retained.
