# Tail ground-contact policy

User-approved: tails may penetrate terrain while knocked down or recovering. They must not raise the torso. Tail-majority skin (including descendant bones) is excluded from collider fitting and all shared recovery contact samples. Pelvis, head, limbs and cloth remain supports. Unrigged tails require an explicitly authored `tailContactExempt` vertex attribute; pelvis weights alone never imply a tail.

Removed procedural tail folding and tail tracks from the lion authored get-up candidate. Rear-cloth support remains. Candidate regenerated from the unchanged supplied source.

Coverage: lion has identifiable Tail bones. Hyena, warthog, buffalo and rhino lack named tail bones; their unrigged geometry masks remain pending inspection. Existing baked fall bank must be regenerated to incorporate revised collider fitting. Normal animation playback is unchanged.

Validation: authored hyena and lion skin/limb tests pass with only tail contacts exempted. Dedicated classification/contact test passes, including mixed pelvis weights and explicit geometry masks. Initial combined suite: 25/27 passed. One obsolete full-skin assertion included permitted tail penetration (updated); actual expressive-lion physical roll timed out at 3.017 seconds, orientation error 0.178 radians, and used procedural fallback. That stabilization issue remains open; do not claim authored physical handoff passes. No new visual validation performed for this policy yet.

## Subsequent stabilization and runtime validation

Reduced the gravity-assist torque near the target (dead angle 0.1 rad), retained orientation tolerance 0.45 rad and angular-speed threshold 0.65 rad/s for 0.15 s. Extended the bounded roll deadline from 3 to 3.5 seconds; at the original deadline the lion had error 0.2565 rad and speed 0.2979 rad/s but had not completed the quiet interval. Eleven combat tests now pass, including real candidate lion handoff and three hyena directions. Seventeen focused contact, authored-skin and ragdoll tests pass.

`lion-tail-runtime.mp4`, `.png` and `.json` record the actual WorldScene fixture with the expressive lion and authored clip. Completed 12 simulation seconds; zero final downed actors, no errors, roll succeeded in 0.95 s (0.2607 rad, 0.4598 rad/s). The wide contact sheet confirms fall, roll, sit and rise. It is not final visual acceptance: apparent foot clearance needs closer inspection, and this single flat-ground cycle does not cover slopes or obstacles. Audio was disabled. No paired performance conclusion is claimed.

`lion-source-support.png` predates the user-approved tail exemption and documents the previous candidate only; use the newer runtime video for current behavior.

## Foot-support follow-up

The QA trace now identifies the lowest retained support, minimum foot-skin clearance, model grounding offset and authored hip offset during recovery. `lion-support-runtime.json` is a second real WorldScene cycle, not a synthetic pose check. At recovery age 2.1944 s, rear cloth `ClothRear_R_Inner_02` is the lowest support (0.01 m), while feet are 0.2010 m above terrain. At ages 2.743, 3.259 and 3.807 s, LeftFoot is the support at 0.01 m. Thus the previous wide video does not prove final standing levitation; the mid-rise cloth support remains an actual refinement target. Do not eliminate cloth contacts to conceal it.

Standalone full-skin samples of the exported lion clip place the feet at the flat support plane from source time 6 s through the endpoint. Added an explicit upper bound of 0.025 m on minimum foot clearance throughout that standing portion for both authored candidates; both tests pass. This bounds hovering in the assets, while the runtime trace separately covers scene grounding. The differing mid-rise gap still needs investigation with terrain and cloth transforms; it is not fixed by this diagnostic change.
