# Scalar VFX packing: daylight visual check

Recorded on 2026-10-28 at c528f899f using the actual WorldScene fixture, production actor catalog and spell commands. UI: Activate sound, then Grabar dÃ­a. This is a controlled scene with cooldown reset, not a campaign gameplay recording.

`day.mp4` is a 22.437-second canvas capture with an audio track. The sequence exercises Grow and Multiply, camera rotation, zoom and two closely spaced commands. `day-contact.png` samples it once per second. Review shows visible helical arrival ribbons, crop-directed energy and disappearance, with no obvious broken triangles or persistent Guardian in these samples. Full-frame continuous artistic/audio acceptance is still pending; an audio track does not establish a listening review.

`day-status.json` records zero errors, at most one visible Guardian and no active summon at the end. The daylight recorder does not exercise Shield or Attack. These and the broader occlusion/terrain matrix remain outstanding.

Validation: production build passed after registering the compressed olderMale asset; all 9 vfx-native tests passed, including source parity of all 18 compositions. This capture is not a performance benchmark. Moving-scene timing evidence is in ../moving-current/.

## Night check

`night.mp4` (25.077 s, 1280x720, video and audio) exercises Attack, Shield, camera rotation/zoom and repeated attacks using the same UI recorder. `night-contact.png` samples once per second. The reviewed samples show the protective dome, hand-to-target energy, rhino knockdown and the final hyena lying down then returning upright. They do not establish frame-accurate impact timing or anatomical quality from every angle. The fixture replaces the selected animal partway through the sequence; this is not proof of simultaneous multi-animal recovery.

`night-status.json`: errors [], maxVisibleGuardians 1, active summons 0, physical bodies 0, rollFailures 0. The trace includes existing spirit/audio events; mix quality has not been certified by listening. All 22 beast-combat-physics tests passed. Those tests ran during part of recording, so no performance conclusions should be drawn from this capture.

## Rhino beside a wall

`rhino-wall.mp4`, `rhino-wall-contact.png` and `rhino-wall-status.json` extend the earlier hyena/buffalo wall coverage to the catalog rhino. URL recoveryDay=1&wallLow=1; select rhino and Grabar caida contra muralla. This uses the existing QA wall (10000 HP, delayed initial swing), real Attack and Game.tick. No audio was enabled after the page reload.

The run completes 12.121 simulated seconds through falling, rolling, recovering and walking, with 32 sampled structure-contact pairs, zero roll failures, zero final down actors and no errors. Contacts include nearby structures, not exclusively the wall. The one-second image samples show the rhino falling on the approach side and returning upright beside the wall; they cannot exclude small skin intersections. During rising the limbs visibly lift, and this wide low-angle view is insufficient to approve the exact foot support. No blanket obstacle or anatomical acceptance is claimed.

### Rhino get-up detail

`rhino-getup-detail.png` samples seconds 5–10 at 3 Hz. The crop improves leg/body readability but clips the actor at its right edge in some frames. Across 36 recovery samples, minimum sampled non-tail support is 0.0100–0.04685 m. At recovery age 0.083 s the forearm is the lowest sample while feet are still raised; by 0.532 s a foot is the support limiter. Later support transfers between feet and a hand. The reviewed samples do not show a gross root-height jump on returning upright. This is evidence for this one wall-side cycle, not a general all-vertex collision or slope certification.

## Four-impact lifecycle run and framing defect

`four-impact-status.json` reports 16.019 simulated seconds, four targets, peak three physical ragdolls and one baked fallback, one physical-budget rejection, zero final down actors/bodies/errors, zero hidden frames and maxVisibleGuardians=1. All four resume walking/attacking.

`four-impact.mp4` and its one-second sheet expose a QA camera defect: the non-wall trial inherited the previous low wall camera, leaving actors small/occluded. This recording is lifecycle evidence only, not visual acceptance of all four reactions. The fixture now restores its standard camera for non-wall physics trials. A new visual run is required after that fix. Capture is silent and contains diagnostic support sampling; no performance conclusion is drawn.

### Repeated with reset camera

`four-impact-framed.mp4`, its contact sheet and separate status JSON repeat the four-hyena trial after the camera fix. All four actors now remain within the strategic view through falling, rolling, recovery and resumed activity. The trace independently records those phases for each actor, peak 3 physical + 1 baked, final down count/bodies 0, maxVisibleGuardians 1, hidden frames 0 and errors [].

Reviewed 1 Hz frames show visibly distinct falls and staggered recovery; neighboring silhouettes overlap during part of the get-up sequence. This view establishes that the lifecycle remains visible but does not measure inter-animal mesh penetration during authored recovery. That contact quality remains open. The recording is silent, uses QA cooldown resets and diagnostic sampling, and is not a comparative performance run.

## Pair-contact diagnostic

The four-impact fixture now samples Rapier contactCollider distances between different physical actors when at least one is recovering. This is QA-only pairwise work at approximately 10 Hz. `peer-contact-status.json` contains 95 pair samples, all with no negative contact distance, zero runtime errors and a completed cycle. Thus this run does not demonstrate physical-collider penetration between the three Rapier actors.

The fourth baked actor has no Rapier colliders and is excluded. Skin can also extend beyond simplified colliders. This result neither approves skin-to-skin contact nor resolves the baked/physical interaction. The measured camera overlap alone does not justify adding root displacement. Production physics has not been altered based on this diagnostic.

### Include the baked actor: deformed mesh broad phase

Optional `peerContacts=1` now enables both diagnostics; ordinary timing runs do not run these costly vertex queries. The mesh diagnostic computes world AABBs from every deformed vertex of active physical and baked actors. Disjoint boxes establish separation; intersecting boxes are candidates only. A focused test verifies translated physical/baked boxes and candidate classification.

`peer-skin-status.json` records a completed four-impact run without errors: 150 pair samples, 27 intersecting-box candidates. Of 75 physical/baked pair samples, 19 are candidates. Therefore the prior Rapier-only result cannot dismiss the visible overlap. Triangle-level or contact-region inspection is needed before adding separation to recovery. No production displacement has been introduced from these conservative bounds.

### Confirmed baked-skin / physical-volume intersection

`peer-volume-status.json` adds exact Rapier containsPoint queries for baked mesh vertices within candidate physical-actor AABBs. In this completed run, 22 candidate pair samples include 13 samples with baked vertices inside physical colliders, maximum 3463 vertex records in one sample (duplicates at UV/normal seams count separately). The worst pair is qa-beast-1 / qa-beast-3, collider parts 1–3. This establishes intersection with the simplified physical volume, not an exact triangle-to-triangle penetration depth.

Two focused diagnostic tests pass, including real Rapier positive/negative containment. The result exposes an unresolved baked/physical separation defect; do not describe the four-actor visual acceptance as passed. The next production change must constrain the baked trajectory/recovery against moving peers while preserving smooth motion, static-solid clearance and logical-position reconciliation.

## Rejected peer-box production experiment

Two production experiments extended BakedSolidContacts with moving peer boxes. First, sampled skin bounds reduced the observed maximum to 916 baked vertex records inside physical volumes, but five offending samples remained (`peer-separated-status.json`; `peer-separated.mp4` is this unaccepted diagnostic capture, not an approved result). Second, bounds derived directly from current convex/capsule colliders still produced a maximum of 2659 (`peer-collider-experiment-status.json`). Counts are from separate variable-rate runs and are not a controlled percentage-improvement comparison.

Both completed without runtime errors or retained down actors. All 26 existing combat/static-solid tests passed, demonstrating that those tests do not cover the observed peer failure. The experimental production edits were restored; `peer-box-experiment.patch` preserves the rejected second variant for investigation only. It is not applied. The overlap defect remains in the branch and requires a different contact-resolution approach. No claim of visual smoothness is made for these experiments.

## Combined obstacle resolution

The diagnostic replay (`peer-unresolved-status.json`) found every penetrating sample still intersected an obstacle after four sequential box corrections. The new fallback computes a horizontal translation clear of all vertically overlapping peer/static boxes together when sequential correction fails. Dynamic peer envelopes come from current Rapier hull/capsule transforms; baked peers have deterministic priority. Static-only resolution retains its existing path.

`peer-clear-status.json` and `peer-clear.webm` record the next four-hyena run: no baked vertices detected inside physical colliders, completed recovery, zero runtime errors and no final down actors. The 2 Hz contact sheet shows the group falling and resuming activity. This is one variable-rate run, not proof of every contact or smooth per-frame displacement. Crowded corners, displacement continuity, performance and additional species remain to be validated.

Two new combined-box tests and all 26 existing combat/static-solid tests pass. The earlier peer-box patch remains rejected historical evidence; the applied version adds the combined clearance search.

### Static-wall crossing regression

A new deterministic case demonstrated that the combined endpoint search could choose a clear destination on the far side of a thin static wall. The test failed before the change. Candidate translations now sweep the actor AABB against previously clear static obstacles; moving peers remain separable and an existing static overlap may escape. The three offset tests plus the buffalo/rhino baked-wall tests pass (5/5). This is a geometric regression test, not a new visual scenario approval. A blocked search retains the earlier unresolved-contact behavior; it does not authorize crossing a static barrier.

## Separation continuity

The optional diagnostic now records visible hip positions. `peer-continuity-status.json` and its summary exposed a 2.862 m reversal over 0.116 s when a baked correction disappeared during rolling. The contact offset is now retained across subsequent fall samples and after peers leave. It is reset exactly at the fall-to-get-up handoff, where the corrected fallen pose and logical root already include that displacement, avoiding double application. Recovery commits its remaining offset through the existing reconciliation.

`peer-held-offset-status.json`: completed four-actor run, zero errors/final down actors and zero baked vertices detected inside physical colliders. Maximum sampled hip step is 0.470 m over 0.183 s during the launch; maximum among the displayed recovery outliers is 0.410 m over 0.150 s. This removes the large observed reversal in this run but does not certify frame-by-frame smoothness, all crowd layouts or timing-independent equality. All 22 combat physics tests passed. A new continuous visual capture remains pending.

### Playback without peer diagnostics

`peer-normal.webm` and `peer-normal-status.json` repeat four impacts without peerContacts=1. The optional per-vertex/collider and hip logging is absent. Existing fixture support sampling and recording overhead remain, so this is not a performance benchmark. The run completes with no errors or remaining down actors. `peer-normal-contact.png` samples the first 18 seconds at 3 Hz and shows the fall/get-up sequence without the earlier large reversal in those samples. It does not constitute full-frame playback review.

A new catalog-hyena regression in baked-solid-contacts.test.js verifies that peer removal preserves the correction across repeated restored poses without accumulating it. All three tests in that file pass; the production build also passes. Remaining crowd layouts, species and continuous visual acceptance are still open.

## Four-rhino coverage

`rhino-group.webm` (25.253 s) repeats the four-impact UI recorder with the installed rhino profile, without peerContacts diagnostics. `rhino-group-status.json` reports completed simulation, peak 3 physical / 1 baked, finalDownCount 0 and errors []. The first 18 seconds and final six seconds are sampled at 2 Hz in separate contact sheets. The reviewed ending shows all four upright and resuming movement/attacks; several silhouettes overlap in perspective during the cycle. No mesh-containment or continuity measurement is inferred from this recording. It is a controlled QA scene with cooldown resets, not balance or performance acceptance.

### Rhino containment and motion diagnostic

`rhino-peer-status.json` and `rhino-peer-summary.json` contain a separate four-rhino run with peerContacts enabled. 157 sampled pairs, no physical/baked AABB candidates and no negative physical collider distance; completed cycle, zero errors/final down actors/bodies, maxVisibleGuardians 1. This supports separation for this run only.

The largest sampled baked hip step is 0.586 m over 0.133 s, decomposed into 0.246 m horizontal and -0.531 m vertical during recovery. It is not the earlier 2.86 m horizontal reversal, but the vertical transition still needs close visual review. Do not treat the containment result as artistic acceptance.

Reproduce summaries with `python tools/guardian/analyze_peer_trial.py INPUT --output OUTPUT`. The script preserves limitations and separates horizontal/vertical motion; diagnostics remain unsuitable for performance comparison.

### Close baked-rhino entry capture

The QA-only bakedClose=1 option frames the first overflow actor once without changing the game camera. `rhino-close.webm/status.json` and the 17–21 s detail sheet document the trial. Other rhinos occlude the subject, so this close shot does not certify the transition. New optional fields record recoveryAge, lift and entryClearance.

During the final roll, baked ground lift rises from 0.410 to 1.237 m while the retained horizontal separation reaches approximately (-2.589,-0.858) m. Entry clearance is 0.01 m. Over recovery ages 0–0.65 s the hip moves from y=14.390 to y=13.340. This narrows investigation to final baked pose/ground-support correction and its entry blend; it does not yet identify a proven root cause or justify simply slowing the clip. The issue remains open.

## Baked rotation alias correction

Corrected quaternion interpolation in BakedBeastFall: using the destination as the second slerpQuaternions operand overwrote the baked target with the initial pose. The fallback previously followed the hip trajectory without reproducing articulated rotations. A new regression compares all fourteen bone world rotations against independently interpolated clip samples for all five species, including entry blend and final pose.

The focused fall/combat run passed 26 tests and failed two existing wall-continuity tests; this is not an all-green acceptance. A separate 60 Hz full-skin wall diagnostic reveals buffalo penetration of 0.02205 m. Rhino passes skin separation at that cadence, with maximum hip step 0.07961 m. The old 0.1-second continuity threshold also fails after genuine articulation is restored. Do not simply weaken it: collision coverage and continuity remain open.

Actual four-rhino runtime evidence: rhino-quaternion.webm, rhino-quaternion-status.json and sampled rhino-quaternion-entry.png. Reviewed the contact sheet: fallen poses are visible but foreground animals occlude parts of the sequence, so this does not certify all joints or recovery transitions. The recorded baked terminal ground lift is about 0.156 m instead of 1.237 m before this correction. This fixes a concrete playback defect; it does not establish complete visual acceptance or performance parity.

### Full-skin buffalo regression isolated

Added tests/baked-wall-skin-regression.test.js to preserve the actual defect independently of the old coarse continuity assertion. It replays the real catalog buffalo side clip at 60 Hz through 2.02 seconds and checks every non-tail skin vertex. It currently fails at 2.0166667 s: Mesh_0 vertex 31409 enters the wall by 0.0220494 m despite a -0.1844032 m contact correction. That vertex is absent from the sparse contact samples. This confirms incomplete sampled-envelope coverage rather than merely a disputed displacement threshold. The test is intentionally red pending a collision-envelope correction; runtime performance of the eventual correction must also be measured.

### Rejected exact-vertex scan (CPU budget)

An experimental full non-tail vertex envelope passes the 60 Hz buffalo wall regression (plus all three rotation tests). It scans 51,598 buffalo / 46,518 rhino vertices each contact update. The ABBA Node microbenchmark in full-skin-cpu.json measures resolve alone: buffalo 11.63–11.95 ms mean versus 0.33–0.35 ms sampled; rhino 10.82–11.00 ms versus 0.47 ms. This overhead is unacceptable for the intended runtime. The production change was reverted, so the penetration regression remains open. This is neither a browser FPS comparison nor a completed fix.

rejected-full-skin.patch preserves the experiment; apply only in an isolated checkout before running tools/guardian/benchmark-baked-contacts.mjs. The benchmark refuses to run without that experimental implementation. Next implementation must retain coverage without skinning tens of thousands of vertices on every active contact update (for example, conservative bounds derived from skin influences with exact refinement only where necessary). No performance acceptance is claimed.

### Matrix-prepared full skin envelope

Implemented SkinContactBounds, preparing each skin matrix once per pose and evaluating vertex positions directly, including relative/absolute active position morphs. Used for baked static-solid bounds; ground samples and peer-only paths retain their prior behavior. The full-skin buffalo wall regression now passes. Five catalog-species equivalence tests compare bounds against Three.js vertex deformation with translated/rotated/scaled roots, articulated bones and active morphs (1e-6 tolerance), all pass.

matrix-skin-cpu.json records the updated ABBA resolve-only microbenchmark. It is materially cheaper than repeated Three.js per-vertex calls, but still exceeds the sparse baseline; browser frame cost, initialization overhead and visual continuity are NOT accepted yet. The older 0.1-second displacement assertions remain unresolved. This change fixes the observed missed-vertex collision without declaring the broader collision/performance work complete.
