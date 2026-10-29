# Sequential hand-fired attacks

2026-10-29. Replaces the simultaneous attack presentation shown in native-four-hit/native-mixed-hit videos; those are historical diagnostics, not the intended art direction.

The Guardian remains at the firing position until projectile impact and afterglow finish (0.52 simulation seconds). Other presentations wait in FIFO order; scene reset/disposal clears the queue. Replacing the body no longer retains projectiles at the old position. Each active projectile is computed from the live hand world transform.

Production Attack retains its existing 12-second cooldown and single selected target. The stress fixture bypasses that cooldown intentionally, but now issues each actual Game.cast at least 0.6 simulation seconds after the previous one. This also spaces authoritative impacts, rather than merely delaying visual effects after simultaneous damage. The renderer queue is presentation-only and does not implement a new economic command queue.

Validation: 26 focused tests (combat and singleton), production build. New four-presentation regression checks ordering, one beam, hand origin, no retained projectile, and cleanup. Native spatial-WASM WorldScene recording: one hyena and three rhinos, four sequential attacks, maxVisibleGuardians=1, errors=[], completedSimulation=true, finalDownCount=0. Inspected contact sheet: individual beams appear with the spirit at each successive firing position, no simultaneous detached beams. Recording is silent. The recording covers the attack sequence and recovery; report metrics start after the four casts and are not a full-sequence performance comparison.
