# Recovery trajectories in world space

Feet now follow a continuous path from their fallen world positions to the
support targets. The knee bend direction and foot orientation start from the
actual fallen pose, then blend toward their support configuration. This avoids
rotating extended legs through the terrain before IK starts. Tail and rear-cloth
roots also interpolate their captured world orientations during the initial
turn, rather than inheriting a second rotation from the rolling pelvis.

The deterministic plane audit measures maximum brace-phase vertical correction:

| Species | Before (m) | After (m) |
|---|---:|---:|
| hyena | 0.257 | 0.103 |
| warthog | 0.080 | 0.080 |
| lion | 0.624 | 0.359 |
| buffalo | 0.664 | 0.172 |
| rhino | 0.449 | 0.329 |

The result reduces the excess lift but does not eliminate it. In particular,
0.359 m for the lion and 0.329 m for the rhino remain too large for final visual
acceptance. Hand and secondary contacts still constrain the transition.

33 targeted tests passed. The initial-pose test now checks every physical joint
against its actual fallen position, not just the pelvis. Existing penetration,
frame-displacement, retained-root, repeat-impact, fallback and cleanup checks
remain in place with unchanged tolerances. This does not prove obstacle/slope
coverage or artistic quality. No general performance conclusion is drawn.

Actual WorldScene follow-up: a frontal buffalo Attack completed, returned to
attacking, reported no errors and released all bodies. Peak recorded contact
correction was 0.264 m. This is not directly comparable to the plane audit or
the earlier run, which did not record that field. The full-body lateral camera
keeps the animal in frame; inspected frames show crouch-to-standing progression.
The dark buffalo material limits fine contact inspection at night. No final
artistic acceptance, audio validation or performance comparison is claimed.
