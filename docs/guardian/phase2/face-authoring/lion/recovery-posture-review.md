# Ground-reaching recovery posture iteration

Recovery now lowers the pelvis, leans the torso about the model's lateral axis,
folds the tail and rear cloth away from the ground, and restores their exact
captured local rotations on exit. Wrist support height is derived from the
lowest hand/finger skin samples rather than a fixed seven-centimetre offset.
Hands preserve their captured orientation during support. Two-bone IK solves
the complete pose before blending both joints, avoiding the unstable intermediate
solutions observed with partial upper-joint solving. Quaternion blend targets
use independent scratch storage (aliasing the destination loses the IK result).

33 targeted tests pass (14 ragdoll and 19 combat/baked/expression). Existing
five-species continuity and penetration bounds remain unchanged. Largest tested
pelvis step at 60 Hz: buffalo 0.0713 m; all sampled recovery penetrations zero.
The new lion brace test requires each wrist within 0.025 m of its support and
checks exact restoration of hand and secondary-bone rotations.

A real candidate-lion Attack cycle was recorded in WorldScene with Game.tick.
At recovery age 0.8148 s both wrist target errors were below 0.000001 m; this is
wrist-target accuracy, not a measurement of actual palm contact. Wrist terrain
gaps were 0.282/0.260 m because finger geometry determines clearance. The cycle
returned to attacking, left zero physical bodies/worlds and no reported errors,
and displayed at most one Guardian. Audio was not activated in this recording.

The attached eight-frame contact sheet was visually inspected: the lion folds
forward before rising and the trailing appendages clear the ground. The wide
view is insufficient to accept detailed palm/finger contact or cloth folds.
Close-up review, additional fall directions, slopes and other species remain
required. This is not final artistic acceptance or a paired performance result.
The runtime JSON and MP4 correspond to the corrected IK blend, not the discarded
intermediate run that failed to apply its IK pose.
