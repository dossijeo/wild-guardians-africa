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

## Supine transition contact correction

User also observed floating when the hyena/lion transition onto their backs. AuthoredBeastRecovery previously corrected penetration only: interpolated poses above the floor were never lowered. The correction is now signed. It preserves the captured physical entry clearance at age zero, smoothly approaches 0.01 m during the 0.65 s pose blend, then maintains that clearance for the sampled non-tail skin. This is a contact correction, not a claim that every anatomical support is correct.

Added a regression assertion on real physical-to-authored hyena recoveries in three impact directions: after entry, sampled support remains within 0.002 m of the intended 0.01 m clearance. Full scoped suite: 39 tests pass.

New real WorldScene recordings: `lion-floor-contact` and `hyena-floor-contact` (MP4, contact sheet PNG, visible diagnostic JSON). Both complete, with zero errors and successful physical rolls (lion 0.8833 s, hyena 0.85 s). Lion entry clearance decays from 0.051 m to 0.011 m; after the blend its maximum measured minimum clearance is 0.010000005 m. The signed correction includes downward movement (-0.0151 m in that run). Hyena final recovery foot samples are also at 0.01 m above navigation terrain.

Visual review remains incomplete: close-camera framing crops the body during part of both sequences, and the apparent floating impression is not fully eliminated by these numerical contacts. Verify rendered terrain against the navigation height and inspect a complete body view. Mid-rise lion cloth support remains unresolved (positive corrections up to 0.2256 m in this run). Do not label either recording final art acceptance. Audio disabled; no performance comparison claimed.

## Independent cloth support correction

Confirmed existing terrain code: TerrainField.surface, native visual triangles and ragdoll ground tiles share the same one-metre lattice and diagonal. All three terrain-geometry tests (including raycast agreement across biomes/chunks) pass; no terrain architecture change was needed.

Authored get-up now grounds non-cloth body supports first, then bends the existing rear-cloth chains against the terrain. Two bounded passes use cached skin samples and reusable vectors/quaternions; no new physical bodies. Bone translations/lengths and tail pose are untouched. Entry/exit blending fades the adjustment, and remaining cloth penetration still participates in final grounding. This is active only during authored recovery, not ordinary animation.

A real compressed-lion regression verifies that penetrating cloth moves upward independently without translating hips or altering non-cloth rotations. Forty scoped animation/physics/expression tests pass, plus the three terrain tests.

`lion-cloth-contact.mp4/png/json` captures the full-body WorldScene cycle. In sampled recovery ages 1.83–2.26 s the lowest support is Hips, then finger bones at 2.38–2.48 s; rear cloth no longer lifts the body in this interval. Foot clearance remains 0.13–0.17 m during this portion, so anatomical pose/hand support still needs refinement. The wider view avoids cropping but does not prove close-detail quality. Complete cycle and no runtime errors; no final art acceptance or comparative performance claim. Tail exemptions for unrigged species and baked-bank regeneration remain pending.

## Supine leg placement

The exported lion's initial foot skin was 0.2200 m above the flat floor despite a supported back. Extended the offline two-bone support solve to the legs, retaining bone translations and anatomical lengths. Reconcile foot placement and whole-skin grounding for three additional offline passes because leg weights also affect pelvis skin. No added runtime leg solver. Both candidate JSON clips were regenerated from the unchanged supplied source and expressive meshes.

Added a 0.04 m maximum minimum-foot-clearance check across the first two source seconds, alongside the existing standing support, full skin penetration and limb-length checks. Forty scoped tests pass. Example hyena initial foot clearance is 0.0027 m and at source time 2 s is 0.0171 m; original lion initial clearance was 0.2200 m, first corrected pass 0.0138 m. These are model-space, flat-floor measurements, not a guarantee that both feet contact on slopes.

`hyena-planted-feet.mp4/png/json`: actual full-body WorldScene cycle completes with zero errors; physical roll succeeds in 1.0 s. Inspected contact sheet. New lion clip has numerical/physical tests but has not yet been recorded in runtime after this last regeneration. Visual acceptance remains pending.

Additional continuity audit found large adjacent-frame quaternion changes in hand/forearm channels (hyena RightForeArm 1.633 rad; lion RightHand 2.449 rad). Leg maxima: hyena LeftLeg 0.400 rad, lion RightLeg 0.196 rad per source frame. Current green tests do not validate these angular discontinuities. Investigate bend-pole/hand IK continuity before shipping; do not claim the full get-up is smooth. Ground-correction limitingBones metadata describes the initial silhouette pass, prior to the additional foot reconciliation passes.

## Bend-plane discontinuity repair

Diagnostic retargets with hand support disabled reduced maximum arm-channel steps from 1.633/2.449 rad (hyena/lion) to 0.154 rad in both rigs. The discontinuity came from projecting the old elbow against the already displaced hand target: the resulting bend direction could reverse as contact began. The support solve now derives the original elbow/knee bend plane first, then projects that direction onto the new target plane. Hand support remains enabled; no bone translations or generic clip smoothing were introduced.

Both source-derived clips regenerated. `support-angle-audit.json` records remaining maxima: hyena 0.3031 rad (17.37 degrees), lion 0.2086 rad (11.95 degrees) per 60 Hz source frame. Added a 20-degree source-frame regression ceiling on Arm/ForeArm/Hand quaternion channels, rejecting the prior 94/140-degree flips. This is a bound against discontinuities, not proof of perceptually smooth motion at accelerated game playback. Forty scoped tests pass, including foot placement, skin clearance, physical handoff, cloth and repeated hits.

A trial 5 mm reach margin did not reduce the remaining maximum and was reverted. Large pole flips are corrected; fine motion timing and runtime close-detail inspection remain open.

Runtime follow-up: lion-stable-support.mp4/png/json records the updated lion in WorldScene. Completed cycle, no errors, successful roll in 0.7167 s. Inspected full-body contact sheet; this verifies sequence coverage, not close-detail smoothness. Latest hyena bend-plane change still needs a fresh visual recording.
