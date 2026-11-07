# Recovery blocked by neighbouring get-ups

## Finding

The previously failing three-hyena variable-rate test is a contact case, not just a directional case. All three directions pass separately at fixed 60 Hz and at the variable 30/60/20 Hz sequence, both at the common origin and the corresponding separated positions. The isolation results are preserved in the two isolation JSON files.

In the shared solver the middle animal contacts both neighbours while those neighbours recover as kinematic bodies. Before this change it timed out at 3.5167 seconds with torso error 0.4886 radians. The captured pre-change diagnostic counted contact in 78 sampled rolling frames for the middle actor; the neighbouring actors had 46 and 11. A stronger torque did not solve this reliably.

## Change

Track collider handles belonging to recovering kinematic animals. Near the roll deadline (last 0.1 seconds onward), actual contacts with those colliders accumulate a bounded delay. Maximum additional time is 2.5 seconds; ordinary rolls retain the 3.5-second timeout. Collisions, angle/speed/quiet thresholds and articulated motion remain active. Static terrain and buildings cannot grant this grace. Collider handles are removed on release and the set is cleared on disposal.

The middle actor in the executing regression now completes its physical roll in 4.4167 seconds, with errors 0.3292/0.3627 radians and angular speed 0.1027 rad/s, then uses its authored get-up. The TODO was removed. `concurrent-contact-trace.json` records the corrected run; its Node timing figures are diagnostic and not browser performance measurements.

## Validation

- `node --test tests/beast-combat-physics.test.js tests/beast-ragdoll.test.js`: **36 passed, zero TODO**.
- The concurrent test checks all three authored recoveries, a positive bounded contact delay, finite poses, an upper bound on roll duration, and release of all animals/solver ownership.
- The collision lifecycle test checks retained collider handles are removed when the kinematic actor is released.
- Production build passed, with the existing large-chunk warning.
- Actual WorldScene graphical four-impact run: 3 physical + 1 baked actor, zero roll failures, zero final down states/worlds/bodies, maximum one Guardian, no reported errors. 348 frames, 0 hidden frames. Physics mean/p95/max: 3.536/8.065/27.435 ms. Not a paired performance benchmark.

`four-impacts.mp4` and the contact sheet show the impacts, falls, recovery and resumed movement at the strategic camera distance. The black final tile is padding after the video ends. The graphical run did **not** use contact grace (maximum delay zero), so it proves no observed regression in that scenario, not visual validation of the exact obstructed configuration. That exact contact case is currently proved by the real-rig automated simulation only. Close-up contact quality, all species/obstacles/slopes and overall performance remain broader validation tasks.
