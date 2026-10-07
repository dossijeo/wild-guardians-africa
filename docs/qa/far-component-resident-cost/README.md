# Category isolation with residency kept active

Sourcefa9698ee, same renderer and fixed220m baobab pose throughout four sequential component-vs-all ABBA runs. Owner, chunks, GPU-prepared banks, logical selection and readiness stay active; only the selected visual category is hidden inA1/A2. Ten directed tests and fixture syntax pass. Four CPU campaigns remain background load; root reports no concurrent GPU/benchmark/build.

| Omitted category | A1 | All1 | All2 | A2 | Removed calls / triangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sprites |5.718333|5.065000|5.194479|4.832083|4 /2682|
| Prepared3D bridge |4.014479|5.283541|5.116354|4.502291|4 /15734|
| Far ground |4.549010|5.231562|5.059947|4.104218|1 /26010|
| Backdrop |4.950885|5.051302|5.245416|4.922552|1 /128|

GPUmilliseconds,120queries per lot,480 per run;1600×900 framebuffer. All resolve withzero disjoint/skipped, no hidden document, state unchanged, errors[]/GL0 and warning/error logs[].

Every run has exact A1/A2 submission traces, exact All1/All2 traces and exact recorded camera/light/chunks/bounds. Each surviving draw is identical across omitted/all traces including object/geometry/material/program identities, CPU active-instance hashes, versions and matrices. No warm shadow submissions occur. The raw reports retain the full descriptors. This is materially stronger than the prior native-vs-far run where toggling recreated five nativeLOD identities. It still does not prove GPU buffer-byte or framebuffer equality.

Sprites do not yield a consistent marginal saving: the omitted controls drift and straddle full rendering. Bridge and ground omission reduce local medians, and backdrop omission a smaller amount. These images are deliberately incomplete; omission is not an optimization candidate or visual acceptance. Marginal times cannot be summed into an additive model because removing occluders/coverage changes remaining fragment work. No generalFPS/GPU attribution from triangle counts. Combined candidate still regresses; no gameplay activation/PR acceptance.
