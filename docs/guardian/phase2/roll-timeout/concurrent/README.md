# Concurrent recovery after terrain correction

At 220defd1b, recorded four real Attack commands through the controlled WorldScene/Game.tick fixture, daytime close camera, hyena selected and lateral direction. Three physical actors plus one baked capacity fallback were active at peak. All four finish their downed state; final physics worlds/bodies are zero, rollFailures=0 and errors empty. Maximum visible Guardians is one. Traces identify authored stand-up for sampled recovery actors.

Inspected contact.jpg at 1 fps: concurrent impacts, fallen bodies, rise and subsequent movement are visible. There are overlapping silhouettes during the crowded fall; these images do not prove absence of mesh penetration. The close follow camera also loses some actors after they disperse. This is a lifecycle/capacity and scoped visual check, not acceptance of all peer collisions or full-screen composition. Video is cycle.webm; complete diagnostic is status.json. Sound is included without a perceptual mix claim.

The fixture deliberately resets cooldowns to issue four commands together. Recording/contact diagnostics and moving inspection camera prevent treating its timings as a comparable performance benchmark. The peak physical limit remains three; no runtime configuration was changed for this test.


## Mixed sizes

Repeated with `peerSpecies=rhino`, automatic direction: one hyena and three rhinos. Peak 3 physical/1 baked, all four finish, no runtime errors or roll failures, final physical resources zero, one Guardian maximum. The final roll completes in 2.166667 s with .414038 rad error and .170733 rad/s speed. Files mixed-cycle.webm, mixed-contact.jpg and mixed-status.json.

Inspected the 1 fps contact sheet: bodies fall and return upright, but the close framing crops the largest animals during some phases and crowding obscures contacts. This does not establish anatomical peer clearance. A wider/overhead peer-contact review remains required. The reported 54.9 ms maximum physics update is an unpaired diagnostic sample under recording and support scans, not evidence of acceptable performance or a causal regression.


## Wide view and peer geometry sampling

Added QA-only `recoveryOverview` to frame the group from above without following one beast. Repeated the mixed one-hyena/three-rhino run with `peerContacts=1&peerFalls=1`, including falling poses. The full 16-second simulation completes; all downed states and physical resources clear, zero roll failures/errors, one Guardian maximum.

Inspected overview-contact.jpg: all four actors remain in view through the fall/rise cycle and separate before moving away. The diagnostic finds zero negative physical collider distances and zero intersecting deformed-mesh AABBs among sampled active actors (physical and baked). Disjoint AABBs establish mesh separation at those samples; the approximately 10 Hz sampling does not prove separation between samples. This is a different repeated trajectory, so it does not retroactively certify the obscured close-up run. No claim of contact performance: all-vertex skin scans are expensive QA-only diagnostics.

Files: overview-cycle.webm, overview-contact.jpg, overview-status.json. The overview camera is confined to this test fixture; production camera behavior is unchanged.
