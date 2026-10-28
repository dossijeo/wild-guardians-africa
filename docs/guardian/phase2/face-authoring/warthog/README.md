# Warthog anatomical calibration — not yet edited

Source is the active 6d41a31b6bc7ac4163f8e484f001c7a4b7debac0fc6c93fefd3ff4a9a9fec275 GLB. Rendered neutral front, quarter and both profiles in Blender; close views use center (0,-0.45,1.38), extent 1.25. No model or animation was changed.

The side close-up reveals a dark mouth groove behind the small tusk, substantially above the underside of the snout/beard. A flat cut at the beard would cut the chin, reproducing the rejected hyena failure. Initial landmarks named lower-snout and suspected-commissure are provisional surface observations, NOT an approved cutting curve. The closer mouth-landmarks.json supersedes them for further tracing. Occluded sections still require topology inspection before cutting.

Read-only welded topology has 17 components in Mesh_0. Eye regions and several tooth/ornament regions are separate, but the large head component includes multiple features; proximity alone cannot safely select a jaw or tusk. Component IDs refer only to the fingerprinted topology report, not stable IDs across exports. Raycasts hit the source triangles and store their surface position/object/face, avoiding guessed depth from screenshots.

Reproduce with tools/guardian/inspect_actor_face.py, inspect_actor_topology.py and pick_actor_landmarks.py. The two request JSON files record exact pixel coordinates and inspection camera data. All requests hit Mesh_0. The original GLB remains authoritative. Next authoring must trace the groove around both tusks, identify which dental components belong to the moving jaw, and preserve collar, beard attachment, eye paint and native weights outside the face. Parpadeo and mouthOpen remain absent; this calibration is not delivery of facial animation.

## Eyelid candidate — rejected for production

The profile and add_actor_eyelids.py now reproduce eight corrective blink targets on a separate head-weighted surface. Candidate v3 uses 65 columns and 17 rows per eye. Increasing density and edge clearance reduced sclera leakage, but the closed front view still exposes a small white fragment below the left brow; the quarter view shows an uneven upper seam. These images are rejection evidence, not acceptance. No active model was replaced. Mouth authoring is still pending.

Blender shifted the original restpose clip by one frame during geometry export. restore_source_animations.py now copies original animation accessors/channels by unique target node name after a GLB-source edit. The integrated v3 export passed audit_actor_face.mjs: 21 bones, seven clips, 287 sampled poses, zero position difference and maximum quaternion angular difference 6.664e-8 radians. This verifies animation preservation, not eyelid deformation or visual quality.

Reproduce: Blender headless, tools/guardian/add_actor_eyelids.py, --input public/assets/6d41a31b6bc7ac4163f8e484f001c7a4b7debac0fc6c93fefd3ff4a9a9fec275.glb --profile docs/guardian/phase2/face-authoring/warthog/eyelid-profile.json --output candidate.blend --export-glb. Inspect using inspect_actor_face.py with --center 0 -.4 1.85 --extent .8 --expression blinkL,blinkR. The exported GLB restores original channels; the editable Blender file retains imported actions and still requires this export restoration step.
