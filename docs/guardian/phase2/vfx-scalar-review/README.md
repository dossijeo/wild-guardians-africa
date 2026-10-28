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
