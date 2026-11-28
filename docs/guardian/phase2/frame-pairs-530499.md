# Guardian incremental frame comparison at 530499a1a

Real browser WorldScene fixture, Intel UHD / D3D11, 1600x900, pixel ratio 1, 20 spawned beasts. Eight balanced ABBA/BAAB blocks, each with 1.2 seconds warmup and 4 seconds measurement. Same Attack commands every 600 ms with QA health/cooldown resets; the reference suppresses Guardian presentation. All blocks have zero hidden frames, runtime errors are empty, maximum visible Guardians is one.

| Measurement | Guardian off | Guardian on |
| --- | --- | --- |
| Block average FPS range | 25.99–27.47 | 25.74–27.11 |
| Frame p95 range, ms | 49.96–50.03 | 50.01–50.07 |
| Frame p99 range, ms | 50.02–66.54 | 50.05–66.54 |
| Animation CPU p95 range, ms | 0 | 0.22–0.39 |
| VFX CPU p95 range, ms | 0.005 | 1.48–1.78 |
| Draw calls p95 | 93 | 104 |

[Raw report](frame-pairs-530499.json). Ranges are across the four blocks of each condition, not pooled-frame quantiles. This is one counterbalanced session, not independent repeated trials or a confidence interval. The fixture uses presentation-only time: it does not validate navigation, ragdoll throughput, production balance, audio mixing or camera responsiveness under a live raid. Some spawned animals lie outside the fixed frame. No memory/GC or GPU timings were recorded. Frame tails remain substantial in both conditions; do not attribute baseline stalls to the Guardian. The new VFX component remains a measurable cost, and full performance acceptance is open. No runtime optimization is claimed by this measurement.
