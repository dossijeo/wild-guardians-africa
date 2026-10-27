# Heavy-species graphical recovery review

Recorded actual WorldScene Attack cycles for buffalo (frontal) and rhino
(lateral), using their existing work-branch catalogue assets. The URL retains
`face=lion`, which substitutes only the lion and does not replace these species.
Both eight-second runs finished with zero downed actors and no reported errors.
Neither species has the requested facial morphs yet. Audio was disabled.

The buffalo contact sheet reveals a visually unacceptable early rise followed
by another crouch. The rhino recording used an overly close lion-sized camera
and cuts off its upper body: it cannot establish whole-body visual acceptance.
The QA close-view control now scales framing from the selected species' bind
height, and the diagnostic trace records pelvis position and ground correction.
These are fixture changes, not game-camera changes.

A deterministic audit now reproduces the height problem on the five actual
rigs: `node tools/guardian/audit_recovery_height.mjs report.json`. Gravity settles
the physical pose on a plane, then samples the same recovery for 1.9 seconds.
This deliberately does not claim to reproduce an animated gameplay encounter.
Baseline maximum vertical contact corrections during the brace phase:

| Species | Correction (m) |
|---|---:|
| hyena | 0.257 |
| warthog | 0.080 |
| lion | 0.624 |
| buffalo | 0.664 |
| rhino | 0.449 |

At 0.333 seconds the lion's limiting sample is RightFoot. Advancing foot IK
reduced the buffalo's sampled correction but worsened other transition frames
and failed the existing continuity test. That production-code trial was reverted;
no contact tests were relaxed. Tail, rear cloth and fingers become limiting
contacts as the limbs change. The next correction must change the trajectories
during the initial roll, rather than lifting the pelvis or ignoring geometry.

Passing the previous per-frame displacement and penetration tests is therefore
insufficient for artistic acceptance: they allow a large gradual rise and dip.
The baseline trace and these recordings are failure evidence, not approval of
heavy-species recovery. Scoped performance comparison remains separate.

The follow-up rhino runtime trace completed and measured a peak vertical contact
correction of 1.017 m. This confirms the issue in the actual game path, not only
the plane audit. The adapted framing screenshot still clips the animal after it moves toward
the camera. That camera adjustment is insufficient and is not visually accepted;
a follow target or a wider fixed view is needed for the next diagnostic run.
