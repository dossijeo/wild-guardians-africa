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
