# Registry and motion CPU probe

Run `node tools/benchmark_camera_exclusion.mjs`. [Raw output](controller-cpu.jsonl) records 30, 200 and 1,000 synthetic yawed work-center roots with four modes: idle, constrained orbit, one moving root and one collapsing root. This does not load actual center GLBs, render the game, measure a GPU, or simulate a physical mobile device.

Each mode uses a fresh registry/controller, 100 warm-up iterations and 400 measured iterations. The measured operation is registry synchronization followed by one motion solve at a fixed simulated input delta of 1/60 second. Final point safety assertions and hashing occur outside the timer. Zero unresolved recoveries and no sphere overlap are required. Unchanged-root modes also require zero descriptor revisions after initialization. Motion paths intentionally touch the exclusion surface; recorded contacts are nonzero in every moving mode.

| Synthetic roots | Mode | Total p95 ms | Registry p95 ms | Motion p95 ms | Measured contacts |
| --- | --- | --- | --- | --- | --- |
| 30 | Idle | 0.20 | 0.06 | 0.12 | 0 |
| 30 | Orbit | 0.17 | 0.04 | 0.14 | 400 |
| 30 | Move one | 0.22 | 0.05 | 0.16 | 293 |
| 30 | Collapse one | 0.21 | 0.07 | 0.12 | 328 |
| 200 | Orbit | 0.16 | 0.08 | 0.08 | 400 |
| 1,000 | Idle | 0.48 | 0.40 | 0.06 | 0 |
| 1,000 | Orbit | 0.43 | 0.33 | 0.10 | 400 |
| 1,000 | Move one | 0.64 | 0.52 | 0.08 | 333 |
| 1,000 | Collapse one | 0.55 | 0.45 | 0.07 | 338 |

Quantiles of the separate phases do not add to the quantile of their sum. Registry revision counts in the raw output include the warm-up, whereas contact counts cover only the measured 400 iterations. `meanFinalSafetyQueryCandidates` describes the final stationary validation query, not all motion queries combined.

Two long campaign processes remained active; the impostor agent also had its own visual scene. Scheduling, allocation and runtime warm-up can affect these measurements. No A/B optimization or speedup claim follows from this probe. At the largest tested root count, synchronization dominates the median cost and is a candidate for explicit transform/state invalidation or shared-parent update caching. Any change must preserve replacement, parent transforms, state envelopes, removal and model bounds before being accepted.

The benchmark verifies geometry safety in its flat synthetic arrangements. It does not cover conflicting terrain/volume envelopes, visual margins, real input/event timing, Continue/Back/raid trajectories, all cultures, full orbit acceptance or RAM/GC cost. Normal gameplay protection remains off pending that work.
