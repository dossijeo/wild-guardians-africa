# Sequential hand-fired attacks

2026-10-29. Replaces the simultaneous attack presentation shown in native-four-hit/native-mixed-hit videos; those are historical diagnostics, not the intended art direction.

The Guardian remains at the firing position until projectile impact and afterglow finish (0.52 simulation seconds). Other presentations wait in FIFO order; scene reset/disposal clears the queue. Replacing the body no longer retains projectiles at the old position. Each active projectile is computed from the live hand world transform.

Production Attack retains its existing 12-second cooldown and single selected target. The stress fixture bypasses that cooldown intentionally, but now issues each actual Game.cast at least 0.6 simulation seconds after the previous one. This also spaces authoritative impacts, rather than merely delaying visual effects after simultaneous damage. The renderer queue is presentation-only and does not implement a new economic command queue.

Validation: 26 focused tests (combat and singleton), production build. New four-presentation regression checks ordering, one beam, hand origin, no retained projectile, and cleanup. Native spatial-WASM WorldScene recording: one hyena and three rhinos, four sequential attacks, maxVisibleGuardians=1, errors=[], completedSimulation=true, finalDownCount=0. Inspected contact sheet: individual beams appear with the spirit at each successive firing position, no simultaneous detached beams. Recording is silent. The recording covers the attack sequence and recovery; report metrics start after the four casts and are not a full-sequence performance comparison.

Follow-up: removed the obsolete detached-projectile pool entirely (three instanced meshes and their shared material, prewarm and update); queued vanished victims are skipped before presence audio and without delaying the next valid presentation. 27 combat/singleton tests pass, including this cancellation path. Production build: 536 modules. No FPS improvement inferred.

## Full-cycle measurement follow-up

`full-cycle-report.json` starts before the first command and records command times/targets. It supersedes the original report for measuring the complete sequence. Removing the old pool exposed two stale browser-diagnostic references (status serialization and isolate-effects mode); these have now been removed. This was a fixture runtime regression, not detected by the prior production build or unit tests.

Real native-world repeat, unrecorded, with recovery profiling enabled: 388 frames, 16.0963 simulation seconds, four different victims at 0 / 0.681625 / 1.345845 / 2.024725 seconds; three physical bodies plus one baked fallback, zero hidden frames, errors and final down actors. Full-frame p95 66.61 ms, max 199.53 ms; render CPU p95 39.18 ms. Guardian animation p95 0.265 ms; Guardian VFX p95 0.705 ms. Physics total p95 17.365 ms, solver p95 3.8 ms. Inclusive recovery timings overlap and must not be added. The trace is diagnostic, not a paired comparison or performance approval; different measurement window and profiling prevent attributing a difference to the pool removal. Existing baseline-engine investigation remains outside this change.
