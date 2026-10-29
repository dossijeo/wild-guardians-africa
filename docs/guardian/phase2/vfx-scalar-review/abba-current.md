# Current presentation-only ABBA measurement

Run after e14c77f03 on Intel UHD, 1600x900, pixel ratio 1, 20 beasts, no hidden frames or errors, maximum one Guardian. Eight balanced blocks, each 1.2 s warmup and 4 s measurement, identical Attack commands every 600 ms. Navigation is disabled: this isolates presentation and is not moving-raid acceptance. No recording was active.

Reference block average FPS: 24.95–26.13; Guardian: 23.81–24.11. Reference frame p95: 49.98–50.03 ms; Guardian: 66.30–83.01 ms. Guardian VFX CPU p95: 1.35–1.63 ms, skeletal animation p95: .205–.240 ms. Draw-call p95: 93 versus 104. Render CPU p95 does not explain the frametime-tail increase by itself. No causal conclusion about GPU, scheduling or allocations is justified by these aggregates.

This result does not meet fluency acceptance. Baseline engine work remains assigned elsewhere. Extended the QA collector to distinguish cast CPU duration and the next requestAnimationFrame interval from other intervals, to investigate the added presentation cost. That extension has not yet been run; the saved JSON is the pre-extension result.
