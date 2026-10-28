# Older male worker: facial authoring in progress

The active runtime audit identifies olderMale as the only remaining actor without blinkL, blinkR and mouthOpen. Source is the active worker library GLB e870835e4fa3c1cc4fdbcd048a2ca64da97d2ea4f48ea3192da6aba692e05202; production is unchanged.

Original front, quarter and both side inspection renders are saved here. Main mesh Mesh0.001 has 16,032 vertices, including 7,004 strongly head-weighted vertices. The lip seam lies between the existing modeled lips below the moustache; do not incise the beard/chin. Existing forehead and eye-corner wrinkles must remain.

Generated v1 lids with the shared add_actor_eyelids.py pipeline using explicitly traced contours and source SHA binding. Reviewed closed frontal and side renders: the frontal expression closes but a white side crescent remains. Rejected for installation. v2 expands contour width 14%, upper/lower coverage by 4/3 reference pixels, and rear wall depth to 25 mm. Its reviewed side image still exposes a narrow eye strip and the shell looks too planar. Increasing coverage alone does not resolve attachment; next inspect the side envelope and actual fixed perimeter in 3D rather than enlarging it further.

Reproduce using Blender headless: tools/guardian/add_actor_eyelids.py --input <active-source-glb> --profile <eyelid-profile-v1.json or v2.json> --output <isolated.blend> --export-glb. Then inspect_actor_face.py --input <isolated.blend> --output <review-directory> --expression blinkL,blinkR. Current outputs remain test-results/olderMale-lids-v1/v2.blend and .glb. Neither is approved or registered. Mouth authoring, intermediate and neutral lid review, animation parity and runtime validation remain pending.


## v3: sampled eye curvature

Calibrated nine visible eye samples on each side and used the existing spherical lid path instead of the nearly planar envelope. The default 80 mm maximum rejected the left fit at 82.05 mm; this actor explicitly allows 90 mm while the shared default stays unchanged. The authoring tool now reports rejected radius/center and validates profile bounds. v3-authoring-report.json records both fitted spheres.

Reviewed v3 full closure in front and side renders: the wide lateral white strip is eliminated and the cap is curved. A small white point remains near one upper edge in front, and a natural closure crease still needs work. This is progress, not visual acceptance. Neutral/intermediate poses, mouth, animation parity and runtime validation remain outstanding. The unregistered generated Blend/GLB are test-results/olderMale-lids-v3.blend/glb; reproduce using eyelid-profile-v3.json. No active assets were replaced.


## v4 closure and skin diagnosis

The sampled-sphere clearance is now explicitly configurable per reviewed profile, default unchanged at 1.5 mm and bounded to 0–5 mm. OlderMale v4 uses 3 mm. Inspected full frontal closure: the former upper white point is no longer apparent. Half closure reviewed frontally and laterally; the cap follows the eye. Runtime, neutral and animation validation remain pending.

Mouth pixel landmarks were projected to the original source as initial calibration only. A larger close-up shows the seam needs a more precise trace before incision; do not treat these coarse landmarks as final.

User-reported cheek/nose seams: normal-disabled and unlit-albedo renders distinguish causes. Removing the normal map loses forehead/corner wrinkles and lip relief, so it is rejected. Unlit albedo has no corresponding angular cheek/nose patches. Added optional source SHA and local bounds profile to the existing surface-frame correction experiment (legacy defaults unchanged). The olderMale trial modifies 102 duplicate-position groups, 4,142 binary bytes, exclusively NORMAL/TANGENT. Original images, geometry and animation bytes remain unchanged under the existing write whitelist. The Blender front comparison reduces the nose patches while wrinkles remain, but angular lower-cheek patches persist. This is not a finished repair and has not been installed or runtime-validated. Next investigate continuity along seam edges and geometric shading, preserving the original detail maps.

After the older male worker is finished, record the requested tutorial from the opening through the first work-center location indication, with real speech, new Guardian eyelids, vortex and HUD/world pointing; publish the video to the same branch and provide its link.

## Edge continuity and base-frame trials

Parameterized the edge relaxation bounds so the olderMale experiment uses its own calibrated facial region rather than olderFemale defaults. Rendered all four inspection angles and reviewed frontal output. Edge fitting modifies 6,031 bytes only within NORMAL/TANGENT (binary whitelist passes), but angular lower-cheek patches remain. A second diagnostic averages coincident base normals within a restricted lower-face box before the existing normal-map frame correction; 7,194 changed bytes, same whitelist passes. The frontal comparison still contains angular transitions and is not accepted. Both trials preserve every embedded texture byte, including wrinkle detail, and neither replaces the runtime model. Stored profiles, compact receipts and frontal captures make these rejected approaches reproducible. Remaining investigation must distinguish geometric creases from normal-frame/texture transitions before any production transfer.

## Isolating surface, normals and material response

The next four-angle diagnostic renders separate imported normals, coincident vertices and uniform metallic/roughness. Frontal views reviewed: neither recalculated normals nor uniform nonmetal roughness removes the angular patches. A welded gray-clay close-up without any detail maps still shows geometric cheek ridges. This revises the earlier incomplete attribution to UV frames: the defect has a geometric component as well.

A bounded, position-group-aware Laplacian experiment (`study_older_male_cheek_surface.py`) changed 89 groups by up to 23.59 mm. Reviewed its textured close-up both with original and recomputed welded normals. REJECTED: too much local shape change, and shading cuts remain. This script is evidence/reproduction of a failed experiment, not a production pipeline step. No source or runtime model was replaced. Next investigate the low-frequency tangent-space normal discontinuity separately from the real cheek crease; do not increase smoothing indiscriminately or remove skin detail. New inspect_actor_face flags are render-only diagnostics, never export assets.

## Lip-calibrated mouth v1

Traced five new landmarks on the 768px mouth close-up (center 0,-0.25,1.065; extent 0.35), replacing the earlier coarse whole-face trace for authoring. Raycast receipt is mouth-closeup-landmarks.json. The local incision uses jaw-profile-v1.json on test-results/olderMale-lids-v4.blend, then add_worker_oral_cavity.py builds the recessed cavity. Original source animations restored by both existing exporters. Outputs are isolated test-results/olderMale-jaw-v1 and olderMale-oral-v1 Blend/GLB, not registered.

Reviewed open front/quarter before interior and front/side after interior. Lip opening follows the modeled lip separation, below the moustache; it does not incise the chin. Cavity has 1,006 vertices and 915 faces, with only the intended 54-edge front boundary and no other nonmanifold/boundary edges. This topology check is not visual acceptance: the side render exposes a gray gap requiring investigation of commissure closure and the cavity envelope. Neutral frontal review shows no exposed dental row. Cheek/nose defects remain unresolved. Runtime animation parity, combined expressions and production transfer remain pending.

Also cleared imported sharp-edge flags in the recompute-normal diagnostic; frontal result still has patches. The additional flag cleanup does not resolve the defect or justify altering production normals.

## Side-aperture audit and portable candidate

The v2 jaw-weight experiment narrows the corner fade to 60â€“95 mm; it does not remove the gray side region and creates a less natural beard transition. Rejected; v1 remains the candidate. Crucially, `audit_older_male_aperture.py` traces four side-camera rays through that region against the evaluated open-mouth geometry and a temporary diagnostic front-aperture cap. All four miss solid geometry and cross the intended front aperture twice. This is a view through the curved front opening, not evidence of a missing interior wall. The cap is never rendered or added to the asset. This corrects the prior tentative side-hole diagnosis; it does not claim exhaustive collision/visual validation.

Reviewed half-open front and quarter: dental row remains recessed and lip motion follows the authored seam. Saved the v1 editable Blend with packed textures and exported GLB under content/source/actors/olderMale/expressive-candidate.*. candidate-files.json binds their hashes and limitations. These are unregistered candidates, not completion: cheek/nose shading, runtime combined blink/mouth, animation parity and gameplay validation remain pending.

## Three.js candidate validation

Extended actor-expression.html?actor=olderMale to select this candidate explicitly and use worker expression semantics. Actual browser inspection: GLB loads, full closure plus mouth .85 activate concurrently, half closure selects the quarter-corrective system at .5, and automatic fleeing drives body/oral mouth morphs to identical values while Run plays. Saved screenshots and paused Run status show no fixture errors and three draw calls in this isolated scene. This is not a gameplay/performance acceptance test. Full-closure caps remain visually too featureless and need a natural crease; facial shading seams remain prominent.

animation-parity.json proves all 12 source clips (114 channels each) retain byte-identical sampler data, interpolation, target node names and paths. It does not prove skin bindings or every deformed pose. Worker_GetUp is assigned by the gameplay recovery layer, absent from this source library and standalone fixture; its integration still needs a separate test on this candidate. Candidate remains unregistered.

## WorldScene fall/recovery/flee cycle

Extended guardian-combat.html?workerCandidate=olderMale with an explicit model override; no production catalog edit. Recorded 9.012 simulated seconds on the real Game.tick/WorldScene path using the existing worker recovery library. 88 recorded samples include 34 fall samples, 31 recovery samples and 2 exit-blend samples; final state fleeing, no fall/recovery/exit remaining, matching mouth weights on the candidate and no reported errors. Browser renderer reports Intel UHD Graphics. This is one controlled nighttime worker/animal scenario, not full raid performance or all collision coverage.

The first capture failed its fetch because localhost was outside the receiver's explicit 127.0.0.1 origin allowlist. Repeated from the allowed origin without changing security policy or restarting the live receiver; successful status saved here. world-cycle.mp4 is the successful silent capture (audio not unlocked), converted to H.264 30 fps. Inspected its nine-frame contact sheet: fall to back, roll/get-up, return upright and departure are visible. Sampling does not prove every intermediate frame artifact-free. Remaining facial seams and lid-crease work keep this asset unregistered.

## Spherical lid fold v5/v6 (isolated)

Added opt-in sphericalClosureFold to the shared authoring tool; existing profiles are unchanged. A raised pair of shallow radial shoulders supplies fold relief without indenting the lid through the eyeball. Vertex shading adds a narrow crease. Profile-bound latitude, curvature, shade and width are range checked. v5 at latitude .64 reads too low/broad in the closed frontal render; rejected. v6 moves it to .54 and narrows the shading width to .014. Reviewed closed and half-open frontal renders: closure is more legible and the fold tucks toward the upper socket during half closure. This remains isolated test-results/olderMale-lids-v6; not merged into the portable mouth candidate or production.

The trial uses 49 latitude rows to resolve the crease. Geometry/morph size and runtime cost must be checked before accepting that density; do not claim the current candidate performance applies to this trial. Side/interpolated coverage and combined mouth/runtime tests remain pending. Facial seam work remains outstanding.

## v7 folded lids in the combined candidate

Reviewed v6 closed side coverage. Measured the dense combined export at 6,370 lid vertices / 12,288 triangles versus the previous candidate's 5,330 / 10,240. Reduced circumferential columns from 65 to 33, retaining 49 latitude rows for the fold. v7 has 3,234 lid vertices / 6,144 triangles (eight corrective morphs), below the earlier candidate. Reviewed closed front and side in Blender: no white eye crescent apparent. Rebuilt v1 jaw and oral cavity on v7, packed editable Blend and replaced only the unregistered candidate GLB. Current hashes recorded in candidate-files.json/fold-v7-metrics.json.

Actual Three.js fixture loads v7 and displays the new crease with simultaneous full eye closure and mouth .85, three draw calls and no fixture errors. runtime-fold-v7.png records the reviewed pose. The old animation-parity receipt and world-cycle video are SHA-bound evidence for the previous candidate, not this revised asset. Interpolated quarter-step coverage and repeat parity/recovery verification remain pending, along with the cheek/nose surface correction. No production worker catalog edit.

## Original embedded source comparison

Extracted the GLB from #model-data in the user's original Quata_Character_Lab_Ganadero_Mayor_ToolSafe_Suave_v5.html and rendered its neutral face with the same inspection tool. The original already shows the cheek/nose angular patches; they are not newly introduced by the gameplay action library or facial candidate. Source provenance receipt binds the HTML and embedded GLB hashes. Original files remain unchanged.

Tested the opposite normal-map Y convention using a render-only shader remap. Reviewed frontal render: it changes/inverts wrinkle and facial relief and makes cheek discontinuities worse. Rejected; retain original normal orientation. This eliminates a global channel-convention change as a useful repair, not the need for a local seam correction. Added --invert-normal-y to inspection tooling solely for reproducible diagnostics, not the asset authoring path.

## Local normal-texture trial

A 0.5 mm render-only weld tolerance also leaves the patches. Added a SHA-bound offline experiment that samples corresponding UV seam edges in tangent frames, averages their world-space normals, and distributes the required tangent-space correction inside a 12-pixel neighborhood. It appends one new normal PNG while retaining the original binary data; no base-color, position, skin or animation edits. First trial (73 edges / 57,696 affected texels) has little visible lower-cheek effect. A broader hard-normal threshold examines 106 edges / 72,119 texels; reviewed front render still has the angular cheek defects. Neither is accepted. Current script reproduces the broad trial. The neighborhood is not UV-island masked, so potential spill into adjacent islands is an additional reason not to install it. These trials do not resolve the requested skin correction.

## Editable texture persistence fix and normal-field trial

Found and fixed a real packaging defect: repacking an already packed, unchanged image with an empty filepath discarded its payload when the Blend was reopened. The earlier candidate Blend lost base-color and normal images; its GLB remained intact. package_actor_source.py now preserves unchanged packed payloads and reopens the saved file to assert each expected image is packed, has the recorded dimensions and has readable pixels. Regenerated olderMale editable candidate from the complete oral-v7 source; all four images pass reopen validation. Updated file hash. Other previously packaged sources require an audit for the same issue.

Cheek topology audit covers 705 faces in a bounded front region, with 1,025 two-face edges, 65 region-boundary edges and no edges shared by more than two examined faces. This regional count does not establish global manifoldness or absence of overlaps. A five-pass local normal-field averaging experiment changes no positions/UVs/images; the initial missing-texture render was invalid and discarded. Repeated after fixing the source package: reviewed textured frontal render still has angular cheek transitions. Trial not installed.

## Packed-source reopen audit and cheek depth check

Reopened all ten delivered actor Blend sources after the packaging fix; every image is packed and has readable nonzero pixel dimensions. See ../packed-source-audit.json, bound to each source SHA. This checks persistence, not visual texture correctness.

A 144-ray frontal sample of the current olderMale candidate finds one ray with multiple front surfaces near the right nasal fold (x=.065,z=1.169). This limited sample does not support widespread overlapping cheek shells, and does not rule out intersections between samples. Reproduce with audit_older_male_cheek_rays.py; report cheek-ray-audit.json. A separate depth-only quadratic local fairing trial capped at 4 mm was rendered and rejected: the angular cheek/nose shading remains. Neither geometry nor texture correction is accepted; production catalog unchanged. Next isolate the low-frequency normal-map discontinuity from wrinkle detail rather than applying more global geometry smoothing.
