# Recovery CPU attribution after ed13eb145

Added opt-in profileRecovery=1 to the browser fixture. Wrappers time authored pose application, solid resolution, exact skin bounds and cloth correction; they are restored in finally and never ship in production. Values are inclusive/nested, not additive. No runtime algorithm changed.

Reproduced the mixed hyena/three-lion four-hit scenario with real Game.tick. Completed, zero remaining down actors and zero errors. Pose: 723 calls / 3175.76 ms total / 8.185 ms p95. Solid resolve: 1099 / 3161.865 ms / 5.025 ms p95. Skin bounds: 1099 / 1131.425 ms / 1.54 ms p95. Cloth: 510 / 310.51 ms / 1.015 ms p95. Totals span the full diagnostic run; they are not per-frame costs. Solid resolution is also called outside authored pose application, hence its larger call count.

This identifies the collision path as a substantial contributor; it does not isolate peer refresh from support sampling, obstacle checks or fallback search yet. Next investigation should split those stages before changing precision or skipping contacts. The instrumentation and fixture support tracing perturb timing; no speedup or acceptance is claimed. Raw report: recovery-profile-ed13.json. Syntax checks passed for both fixture modules.
