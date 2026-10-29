# Lion walking posture

Applied a5-degree forward correction to Spine1 after fresh Walking mixer samples. The lion's Spine has the leg chains as children, so rotating Spine would also alter feet; the retained Spine1 adjustment leaves pelvis/legs native. Rotation is expressed around model X in parent-bone coordinates and remains correct under root heading. Only Walking is corrected; authored get-up and ragdoll poses are still applied by their existing controllers.

The installed GLB regression samples13 walking times under a rotated root: upper torso moves forward, pelvis and both foot bone positions match the uncorrected pose, repeated timestamps do not accumulate. Switching to Running and every native attack returns matching reference bone positions. Three focused posture/terrain tests pass (eight other-species terrain cases skipped);156 lion poses across6 clips and two planes retain full-foot minimum clearance .007020m.

Inspected two daylight in-game profile poses separated by .24 simulation seconds, saved as profile.png and profile-next-step.png. These are different gait phases, not matched before/after frames. The correction is intentionally small, retaining the character's gait. No full new recovery recording or terrain-wide visual acceptance is claimed.
