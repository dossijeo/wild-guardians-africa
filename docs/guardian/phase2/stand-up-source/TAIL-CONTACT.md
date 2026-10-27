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

## Additional beast rigs

Generated separate buffalo and rhino authored candidates from their current active bestiary GLBs (hashes embedded in each JSON). Both map 23 source bones; no use of the lion/hyena target skeleton. QA loader now offers those two clips in addition to hyena/lion. Production catalogue and native clips remain unchanged.

Expanded full-skin, limb-length, foot-clearance and arm-angle validation to both models. Added their actual-geometry physical-roll/authored-recovery ownership tests: both complete without procedural substitution. Full scoped suite: 44 tests pass.

Warthog attempted but rejected: 1.1217 m peak body correction at source frame 100, initial limiting bone RightHand; supine minimum-foot gap 0.1141 m and arm step 0.3892 rad violate current gates. Recorded source/target hashes and metrics in `species-transfer-audit.json`. Rejected clip stays in ignored test-results and is not loaded by QA or production. Inspect right-hand geometry/props before adapting this species; do not weaken the acceptance thresholds.

Buffalo runtime evidence: `buffalo-authored-runtime.mp4/png/json`, completed WorldScene cycle, no errors, successful 0.4167 s physical roll. Full-body contact sheet inspected. Fine posture/grounding impression still requires close review; this is sequence validation, not final visual acceptance. Audio disabled.

Rhino runtime: rhino-authored-runtime.mp4/png/json completes with zero errors, zero final downed actors/bodies, and a successful 1.1333 s physical roll. Inspected a full-duration contact sheet including standing recovery. Fine posture and weight remain QA work; not final visual approval.

## Warthog tail geometry mask

Visual inspection in the new `tests/browser/actor-tail-inspector.html?species=warthog` confirms the offending rear vertices belong to the tail. Its tip is misweighted across RightHand (0.345), RightFoot (0.333) and Spine (0.318), so bone-name filtering cannot identify it. `warthog-low-support.json` preserves representative positions/weights; side/back PNGs show the selected vertices on the unchanged original mesh.

Authored selection: 1193 vertices on Mesh_0_1, rest y < 1.05 and z < -0.55. Visually reviewed distal tail; pelvis/legs and actual hand contacts are retained. Stored explicit indices in actor-contact-masks.js, keyed by rest-position fingerprint and count, with source SHA256. Runtime applies the attribute once per geometry, only on exact fingerprint match; edited topology requires re-review. The geometric cutoff is used by the offline generator/inspector, not inferred every frame. Regenerate with `node tools/guardian/build_warthog_tail_mask.mjs`.

Collider fitting and shared recovery sampling use this tail exemption. Support-extreme selection now omits exempt vertices before selecting extremes, so a tail cannot consume a body's representative contact slot. Added a real-GLB regression proving the misweighted tip is excluded, actual hand support retained, and changed geometry does not inherit the selection.

Rebuilt warthog recovery remains rejected: maximum body correction fell from 1.1217 to 0.7090 m, now limited by Head at source time zero; supine foot gap is still 0.1289 m. Candidate is retained only in ignored test-results, never loaded by QA/production. Next investigate the head proportions/contact pose; do not mask head contacts. Other unrigged-species tail selections and baked-bank regeneration remain pending.

Validation caveat for this mask change: the real-GLB contact-mask tests pass. Combined suite initially had 43/45 pass; the hand retention test incorrectly demanded >0.8 weight on a blended rig and was corrected to identify anatomical hand-region vertices with RightHand influence >0.25 (both mask tests then pass). A genuine physics regression remains: warthog horizontal-impact sustained-rest test fails its six-second window. A ten-second diagnostic shows the right forearm remains mobile through ~5 s and reaches rest at ~6 s, stable thereafter. Do not extend the test deadline or claim all tests pass. Resolve distal-body stabilization before final acceptance; the game already has a bounded recovery fallback, but that does not satisfy the regression test.

Stabilization follow-up: added configurable forearm angular damping 4 (other bodies retain 2.5). This damps the observed distal forearm oscillation after removing the tail's artificial collision volume; no settle deadlines or thresholds changed. The full 45-test scoped suite now passes, including five-species sustained-rest directions and all authored-roll handoffs. This resolves the test regression above; the warthog authored pose/head-contact rejection remains open.

Runtime evidence: warthog-tail-runtime.mp4/png/json completes a real WorldScene cycle with no errors and zero final downed actors. Inspected full-duration contact sheet. Uses the existing procedural recovery, explicitly not the rejected authored clip. Mask/damping integration exercised; final close visual acceptance remains pending.

## Warthog authored recovery profile

The warthog now has a separate candidate using the supplied Stand_Up1 source. Its unusually large head required a bounded neck/head tuck (0.2/0.45 rad), held through source time 4 s and released by 6 s. Head geometry remains a real ground constraint. Full non-tail surface correction and five offline foot reconciliation passes replace the default three for this profile. Leg rotation is bounded to 0.2 rad per source frame, preventing a knee-pole discontinuity from producing a 0.115 m one-frame pelvis jump. Bone lengths and translations remain unchanged; these adjustments are baked offline.

The unchanged acceptance gates now pass for all five candidates: skin penetration, foot support, bone lengths, arm continuity and pelvis continuity. An additional warthog leg-step bound protects this repair. All 47 scoped tests pass, including actual-geometry physics-to-authored recovery for warthog.

`warthog-authored-runtime.mp4/png/json` records the new authored candidate in WorldScene: completed 12 s simulation, zero final downed actors, zero physical bodies and no errors. The sampled foot clearance settles to approximately 0.01 m by the end of the 0.65 s entry blend. During that blend feet descend from the physical fallen pose; they are not asserted to contact throughout it. Contact sheet inspected, but its front-biased distant framing is insufficient for final art approval of torso support. These remain QA-only candidates, not a shipped replacement. No audio or comparative performance claim.

## Lion runtime grounding discrepancy (still open)

A fresh WorldScene cycle after the five-species test pass exposes a remaining difference between offline flat-floor validation and runtime support. `lion-grounding-recheck.json/mp4`: at recovery age 0.931 s the body minimum is 0.01 m (Spine2) while minimum sampled foot clearance is 0.1438 m; at 1.813 s it is 0.0705 m (hips supporting body). At 2.694 s feet reach 0.01 m. Cycle completes with no downed actors or errors, but this is NOT a visual grounding pass. Check actual presentation scale, terrain and pose support together before shipping; model-space acceptance does not establish world-space feet placement. No runtime IK change has yet been made to address this finding.
