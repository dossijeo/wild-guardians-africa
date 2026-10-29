# Current presentation-only ABBA measurement

Run after e14c77f03 on Intel UHD, 1600x900, pixel ratio 1, 20 beasts, no hidden frames or errors, maximum one Guardian. Eight balanced blocks, each 1.2 s warmup and 4 s measurement, identical Attack commands every 600 ms. Navigation is disabled: this isolates presentation and is not moving-raid acceptance. No recording was active.

Reference block average FPS: 24.95–26.13; Guardian: 23.81–24.11. Reference frame p95: 49.98–50.03 ms; Guardian: 66.30–83.01 ms. Guardian VFX CPU p95: 1.35–1.63 ms, skeletal animation p95: .205–.240 ms. Draw-call p95: 93 versus 104. Render CPU p95 does not explain the frametime-tail increase by itself. No causal conclusion about GPU, scheduling or allocations is justified by these aggregates.

This result does not meet fluency acceptance. Baseline engine work remains assigned elsewhere. Extended the QA collector to distinguish cast CPU duration and the next requestAnimationFrame interval from other intervals, to investigate the added presentation cost. That extension has not yet been run; the saved JSON is the pre-extension result.

## Cast-attribution repeat

Repeated with the extended collector (abba-cast-attribution.json). The reference itself degraded across blocks: average FPS 21.37, 18.98, 17.01, 17.99. Guardian blocks were 18.07, 18.56, 15.84, 15.59. These are not directly comparable to the earlier run as a before/after optimization result.

Cast CPU p95 was generally 2.93–4.95 ms, with one Guardian block at 14.20 ms. Guardian non-post-cast frame p95 remained 83.14–116.31 ms; post-cast p95 was 66.49–99.68 ms. Therefore command-call duration alone does not explain the frame-tail cost. Each block contains few casts, making its cast p95 especially noisy. The collector labels the next RAF interval after the command; deferred presentation/update and GPU scheduling can fall elsewhere. This does not identify a causal subsystem.

No runtime optimization or performance acceptance follows from this measurement. The unrelated baseline investigation remains separate. Further comparison needs stable reference conditions and component timing, not attribution from these aggregate FPS figures.
