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

`lion-cloth-contact.mp4/png/json` captures the full-body WorldScene cycle. In sampled recovery ages 1.83�2.26 s the lowest support is Hips, then finger bones at 2.38�2.48 s; rear cloth no longer lifts the body in this interval. Foot clearance remains 0.13�0.17 m during this portion, so anatomical pose/hand support still needs refinement. The wider view avoids cropping but does not prove close-detail quality. Complete cycle and no runtime errors; no final art acceptance or comparative performance claim. Tail exemptions for unrigged species and baked-bank regeneration remain pending.

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

## Terrain-aligned supine pose

The runtime discrepancy was reproduced with separate body/foot surface samples: the floor below Spine2 was 12.964 m and below the foot 12.842 m, approximately 12 cm apart. A flat-floor diagnostic using native Walking pose and full foot geometry produced 2.1 cm clearance; sparse contacts agreed. Thus the demonstrated error came from applying a horizontal supine pose across sloping ground, rather than a missing foot sample or model scale.

Authored recovery now estimates the local terrain normal from four height queries at a 0.6 m radius. It rotates the hip pose toward that normal, bounded to 0.35 rad, fading in with physical entry and fading out over source seconds 2–6 as the animal rises. Existing skin/cloth grounding remains authoritative. No bone translations/length changes, added physical bodies, or per-frame allocations. This is a local slope approximation, not multi-contact IK on rocks or discontinuous steps.

Added full-skin hyena/lion tests at three slope/heading combinations, checking early foot clearance below 5 cm and penetration below 2.5 cm without stretched limbs. All 49 scoped tests pass, including physical ownership, repeated hits, rest and baked fall checks. Existing models/clips are unchanged by this patch.

Real WorldScene recordings `lion-terrain-aligned` and `hyena-terrain-aligned` (MP4/PNG/JSON) complete with zero final downed animals and no errors. Lion sampled early foot clearances are 2.09–2.26 cm instead of the preceding 10–14 cm; hyena 1.0–2.08 cm. Contact sheets inspected. This addresses the measured sloping-ground suspension; the distant framing does not establish final close-detail art acceptance of every joint or both feet. These authored clips remain QA opt-in; shipping integration and obstacle/steep-slope coverage remain open. Recordings have no audio. Feature performance comparison remains pending.

## Normal game loading of authored recoveries

`tools/guardian/pack_recovery_clips.mjs` reproducibly packs all five candidate clips into `public/content/guardian/recovery/recovery.bin` (1,137,136 bytes), with shared times per species and a JSON manifest containing source/target/candidate hashes. Float32 values exactly match Three.js parsing of the candidate JSON; no resampling or lossy reduction. `recovery-clips.js` validates spans, channel types/counts, timestamps and finite values before creating clips backed by shared typed arrays.

BeastCombatPhysics.create now loads this bank alongside the existing baked falls during normal scene loading. Authored recovery no longer requires the QA URL switch for physical ragdolls. Load errors are explicit; invalid data is not silently treated as a valid clip. The QA cycle duration is now 12 s for the longer roll/get-up sequence.

Eighteen targeted bank/terrain/ownership tests pass, including exact float-channel parity for every species and malformed-bank rejection. `lion-shipping-bank.mp4/png/json` records WorldScene without `face` or `authoredRecovery` overrides: production lion asset, successful physical roll (0.7167 s), fall/roll/recover/attack transitions, no final downed actors and no errors. Sampled early foot gap 2.19–2.33 cm. Contact sheet inspected but not sufficient for final close art approval.

This supersedes the earlier QA-only status for physical recovery. The baked overflow path still uses its older procedural recovery and needs an authored-compatible transition. Worker recovery, close visual acceptance, obstacle coverage, bank regeneration after collider changes and feature performance comparison remain incomplete. No audio validation in this recording.

## Refresh of the baked overflow bank

Regenerated all 40 fallback directions with the current forearm damping and tail contact masks. The baker now loads actual GLTF geometry through the same meshopt-capable helper used in model validation, rather than the minimal uncompressed fixture reader. Source asset hashes remain recorded individually. Manifest additionally pins the contact-mask module hash; tests compare the complete solver configuration and mask hash so this bank cannot silently remain stale after either changes.

New bank is 1,037,624 bytes (previous 1,082,312). All 19 baked playback/skin/contact/physical-ownership tests pass, including four simultaneous impacts, recovery and repeated hits. This is numerical integration validation, not a new visual or comparative performance pass. Baked overflow still uses procedural get-up; an authored-compatible roll/handoff remains pending and must preserve bone-world versus physical snapshot conventions.

## Authored get-up for baked overflow

The offline baker now continues each settled fall through the same articulated supine-roll controller and records the heading needed by the authored get-up. All 40 directions complete. Lion/down initially exceeded the live 3.5 s roll budget with angular error 0.522 rad and speed 1.856 rad/s; a configurable offline timeout of 7 s allowed it to stabilize without changing torque, anatomical constraints or convergence thresholds. Live physics keeps its original 3.5 s default. Some overflow cycles are consequently longer; timing still needs visual tuning.

The bank grows from 1,037,624 to 1,504,888 bytes. It records rollStart, recoveryYaw, the exact recovery candidate hash and roll configuration. Tests reject stale clips after changes to recovery sources, contact masks or physics configuration. These are flat-ground baked articulations, adapted by runtime placement/ground support; they do not gain live articulated obstacle collision.

BakedBeastFallbacks now captures physical binding offsets, converts the final bone-world playback pose to a physical snapshot, reconciles the actor heading and enters AuthoredBeastRecovery. Navigation stays suspended through roll/get-up with an extended ownership watchdog. Existing procedural compatibility remains available for banks lacking roll metadata; the shipped bank uses authored recovery. Repeated impacts preserve the current visible pose in both recovery paths.

Validation: 56 scoped tests pass before the expanded repeat-hit checks; the updated 19 ownership tests then pass with both procedural and authored repeat-hit cases, plus three bank-integrity tests. All five species exercise baked fall/roll/authored recovery/AI release. The QA recorder now supports four impacts and logs every actor's mode/phase/recovery controller.

`overflow-authored-runtime.mp4/png/json`: real WorldScene test without asset/recovery overrides, peak three physical + one baked actor, baked phases falling/rolling/recovering and AuthoredBeastRecovery confirmed, completed simulation with zero downed actors and no errors. Full-sequence contact sheet inspected; close joint-quality/obstacle review and paired performance comparison remain pending. No audio validation. This completes the functional authored overflow handoff, not full visual/performance acceptance of the overall feature.

## Baked solid-obstacle audit — confirmed failure

`node tools/guardian/audit_baked_obstacles.mjs` evaluates full non-tail GLTF skin at 10 Hz for side/downSide falls of every current species. A 2.5 m vertical wall begins 5 cm beyond the actual initial standing silhouette, so the initial pose is valid. The script reproduces the current hip-radius trajectory rejection on a flat floor. It is a numerical fixture, not rendered acceptance or the complete navigation implementation.

`baked-obstacle-audit.json` confirms that root clipping alone fails to constrain the articulated silhouette: maximum penetration approximately 7.1 cm warthog, 6.9 cm hyena, 5.5 cm lion, 55.4 cm buffalo and 66.8 cm rhino. Worst heavy-species penetration appears at 0.5–0.8 s, before the final supine roll. This narrows the next fix to silhouette-aware obstacle response throughout fall playback, rather than merely moving the get-up destination. Do not mark solid-obstacle handling complete based on the passing root trajectory or ownership tests. No runtime collision correction is included in this diagnostic commit.
