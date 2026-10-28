# Young female facial authoring — not installed

Source: full 12-action gameplay library `0ab73565649737fc15d853aa9d52a9ecacff3fbf9f5664cc21ec4e54452ef894.glb`. Original front, quarter and both profiles are retained under `original/`. Mesh `Mesh0.001` has 15,293 vertices; head-weight selection includes 8,466 vertices (also headscarf). Inspection now recognizes both mixamorigHead and mixamorig:Head naming.

The independently calibrated contour and lip raycast requests are preliminary. Do not reuse Kofi coordinates. Lip points follow the visible dark lip seam, not the chin. Before cutting the mouth, inspect a larger mouth close-up and corroborate side depths.

First eyelid experiment rejected: skin sampling only two pixels outside the contour sampled white eye texture, producing vertical white streaks on closure. Second experiment separates skin sampling from geometric coverage (18 pixels above, 12 below); this removes the white streaks but STILL leaves white crescents at the upper and lower edges. Current profile is v2, not accepted. Next iteration must cover the full ocular surface while preserving the original eyelashes, then inspect neutral, partial closure and profiles. Facial material faceting also remains untreated. No runtime asset has been replaced for this worker.

Reproduce with add_actor_eyelids.py using the full source above and eyelid-profile.json, followed by inspect_actor_face.py with center/extent from original/inspection.json. v1/v2 temporary editable files remain in C:/tmp/guardian-faces. Screenshots document failures rather than passed validation.

## v4 and facial material correction

Expanded upper/lower contours and lateral coverage; v4 closed side view removes the previously visible white crescent, and neutral front view retains the native eye. Partial poses and animated browser validation remain pending. Current profile is v4.

Facial shading repaired with repair_worker_face_material.py on Mesh0.001, world bounds [-0.3,-0.5,1.04,0.3,-0.08,1.53]. Removes faulty normal-map shading within the selected face region and smooths coincident UV normals. Albedo unchanged; forehead and cheek polygon patches disappear in front and side renders. Original material remains outside the bounds, preserving scarf detail. Source and compressed candidate are in content/source/actors/youngFemale; no runtime substitution yet, because mouth authoring and facial validation are incomplete. All 12 clips/28 bones pass 492 sampled pose comparisons (zero position error).

Worker recovery update: all four profiles now use the packed Worker_GetUp clip and simulation recovery state, with Fall-to-recovery blending, movement suppression, final position reconciliation and a short exit blend. Each installed profile has completed a stepped WorldScene encounter trial and resumed fleeing. This is not continuous visual acceptance: terrain support trajectories, dynamic obstacles and clothing folds remain open. See ../../worker-recovery/neck-and-exit-review.md for evidence and limits. This facial candidate is still not installed.
