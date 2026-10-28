# Older male worker: facial authoring in progress

The active runtime audit identifies olderMale as the only remaining actor without blinkL, blinkR and mouthOpen. Source is the active worker library GLB e870835e4fa3c1cc4fdbcd048a2ca64da97d2ea4f48ea3192da6aba692e05202; production is unchanged.

Original front, quarter and both side inspection renders are saved here. Main mesh Mesh0.001 has 16,032 vertices, including 7,004 strongly head-weighted vertices. The lip seam lies between the existing modeled lips below the moustache; do not incise the beard/chin. Existing forehead and eye-corner wrinkles must remain.

Generated v1 lids with the shared add_actor_eyelids.py pipeline using explicitly traced contours and source SHA binding. Reviewed closed frontal and side renders: the frontal expression closes but a white side crescent remains. Rejected for installation. v2 expands contour width 14%, upper/lower coverage by 4/3 reference pixels, and rear wall depth to 25 mm. Its reviewed side image still exposes a narrow eye strip and the shell looks too planar. Increasing coverage alone does not resolve attachment; next inspect the side envelope and actual fixed perimeter in 3D rather than enlarging it further.

Reproduce using Blender headless: tools/guardian/add_actor_eyelids.py --input <active-source-glb> --profile <eyelid-profile-v1.json or v2.json> --output <isolated.blend> --export-glb. Then inspect_actor_face.py --input <isolated.blend> --output <review-directory> --expression blinkL,blinkR. Current outputs remain test-results/olderMale-lids-v1/v2.blend and .glb. Neither is approved or registered. Mouth authoring, intermediate and neutral lid review, animation parity and runtime validation remain pending.
