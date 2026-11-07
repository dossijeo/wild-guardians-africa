# Bounded compensation for physical roll alignment

This is an incremental improvement, not completion of the ragdoll recovery requirement.

The physical roll now accumulates bounded orientation error only near rest (angle below 0.9 radians, angular speed below 0.8 rad/s). The extra torque scales with mass and collider radius. Integral gain is 3 and accumulated error is capped at 0.6 rad-seconds. It resets with each roll/impact and allocates no vectors per step. This compensates sustained gravity/contact bias; it does not remove joints, disable contacts, or snap the animal into the clip. Original completion tolerance (0.45 radians), speed threshold (0.65 rad/s), quiet time (0.15 s), and timeout (3.5 s) remain unchanged.

## Graphical evidence

Two actual WorldScene/Game.tick fixture runs on the Intel UHD GPU used three physical ragdolls and one baked overflow. Each completed with zero roll timeouts, all four actors using AuthoredBeastRecovery, no reported errors, at most one Guardian, and zero retained physical worlds/bodies at the end. The fixture resets cooldowns and uses legacy navigation; these are not full campaign or balance tests.

| Capture | Roll failures | Peak physical + baked | Final down | Frames | Hidden frames | Physics mean / p95 / max (ms) |
|---|---:|---:|---:|---:|---:|---|
| runtime.json | 0 | 3 + 1 | 0 | 468 | 0 | 3.197 / 7.310 / 31.750 |
| recording.json | 0 | 3 + 1 | 0 | 338 | 0 | 3.376 / 7.670 / 22.740 |

These measurements are diagnostic and not paired performance comparisons. Frame-time spikes still exist; this does not certify overall performance or attribute changes to this fix.

`four-recoveries.mp4` is the second run (17.33 s, H.264/AAC). `contact-sheet.jpg` samples its progression every two seconds. Visual inspection shows the four falls, supine transitions, get-ups, and resumption of movement. It is a strategic view and cannot certify close-up foot contact or all collision cases. Audio is present in the file, but subjective audio quality was not evaluated.

## Known failure retained as a test

The new test `three runtime hyenas finish articulated rolls and authored recovery on the shared variable-rate clock` still fails for one directional configuration (roll error approximately 0.489 rad at timeout). It executes with an explicit TODO annotation; it is not counted as a passed gate. The latest run is **35 passed, 1 TODO**, not 36 passed. The original 35 physics/combat tests remain passing.

Rejected experiments this turn: targeting the initial pose (34/35), driving only hips/torso (30/35), stronger integral gain 6 (34/36), gain 4 (35/36), increased damping (35/36), and applying the integral only to hips/torso (35/36). A small settling grace also failed and was removed. None of those changes are shipped. The remaining directional timeout needs further investigation rather than accepting a larger angle or hiding the fallback.


## Subsequent correction

The executing TODO above is now resolved by bounded grace for contact with neighbouring kinematic get-ups; see ../recovery-contacts/README.md. The suite now has 36 passed and zero TODO. The previous results remain historical evidence, not the current status.
