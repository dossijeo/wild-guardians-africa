# Buffalo v4 eyelid runtime samples

Actual Three.js captures from `actor-expression.html?actor=buffalo`, loading the uncompressed v4 candidate through the ignored scratch path. The active catalog remains unchanged. The fixture explicitly labels this as eyelids only; no mouth channel exists yet.

- `partial`: rest pose, both blink controls at 0.65, three-quarter view. This exercises interpolation between corrective targets, not only the authored endpoints.
- `running-closed`: native Running at 0.35 seconds, both eyes fully closed. No obvious eyelid separation or exposed white eye is visible in this sampled view. The pain preset also sets the mouth slider to 0.85, but there is no mouth binding and this is not evidence of mouth deformation.
- `running-neutral`: same animation time, zero blink values, frontal view. Original eyes reopen without a visible lid patch obscuring them.

Six native clips and eight eyelid bindings loaded; fixture reports no errors. These are sampled poses, not a continuous-cycle clearance proof. Other attack poses, opposite-profile partial closure, game event triggering and compression remain to be checked after the facial asset is complete. No production skinning or catalog changes were made by this fixture extension.
