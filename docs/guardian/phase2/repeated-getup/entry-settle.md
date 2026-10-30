# Smooth release of initial support penetration

The negative native capture belongs to the FIRST recovery, before the second
hit: recovering at 3005.27993, second falling at 3006.17919. Its lowest vertex
30255 is weighted mostly to LeftLeg/LeftUpLeg. Therefore the later recovery-hit
collider refit is not a demonstrated cause or fix of this initial penetration.

Authored recovery retained incoming negative support clearance for the entire
0.65 s pose blend. It now smoothly moves that support target to +0.01 m over
150 ms, only when entry clearance is negative. Time zero retains the exact
incoming pose and the smooth curve begins at zero velocity. Already-supported
entries keep their original timing. Bone rotations and lengths are unchanged;
this neither performs a full collider refit nor adds full-skin per-frame work.

The regression fails on the old code and passes with this change. Seven tests
pass including all five species' inclined-terrain support cases and collider
refit equivalence.

Native WorldScene/Game.tick repeated-hit receipt: `rhino-entry-settle.json`.
Both knockdowns finish, errors are empty, maximum visible Guardians is one.
Negative full-skin samples are still present at entry (age 0, -0.013603 m) and
age 0.133275 (-0.003927 m). Later sampled recovery positions are nonnegative.
This explicitly does NOT eliminate the incoming physical-pose penetration.

`rhino-entry-settle.mp4` records the real cycle. Its 1 fps contact sheet was
inspected: both falls, the interrupted rise, subsequent rise and disappearance
are visible. The wide camera and grass limit millimetre-scale contact inspection;
the sheet does not validate every transition frame or frame pacing. No measured
browser performance claim is made. Incoming collider/skin fit and the separate
costly recovery-hit refit remain open.
