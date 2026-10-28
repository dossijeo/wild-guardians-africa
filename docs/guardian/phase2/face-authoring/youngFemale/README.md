# Young female facial authoring — not installed

Source: full 12-action gameplay library `0ab73565649737fc15d853aa9d52a9ecacff3fbf9f5664cc21ec4e54452ef894.glb`. Original front, quarter and both profiles are retained under `original/`. Mesh `Mesh0.001` has 15,293 vertices; head-weight selection includes 8,466 vertices (also headscarf). Inspection now recognizes both mixamorigHead and mixamorig:Head naming.

The independently calibrated contour and lip raycast requests are preliminary. Do not reuse Kofi coordinates. Lip points follow the visible dark lip seam, not the chin. Before cutting the mouth, inspect a larger mouth close-up and corroborate side depths.

First eyelid experiment rejected: skin sampling only two pixels outside the contour sampled white eye texture, producing vertical white streaks on closure. Second experiment separates skin sampling from geometric coverage (18 pixels above, 12 below); this removes the white streaks but STILL leaves white crescents at the upper and lower edges. Current profile is v2, not accepted. Next iteration must cover the full ocular surface while preserving the original eyelashes, then inspect neutral, partial closure and profiles. Facial material faceting also remains untreated. No runtime asset has been replaced for this worker.

Reproduce with add_actor_eyelids.py using the full source above and eyelid-profile.json, followed by inspect_actor_face.py with center/extent from original/inspection.json. v1/v2 temporary editable files remain in C:/tmp/guardian-faces. Screenshots document failures rather than passed validation.

## v4 and facial material correction

Expanded upper/lower contours and lateral coverage; v4 closed side view removes the previously visible white crescent, and neutral front view retains the native eye. Partial poses and animated browser validation remain pending. Current profile is v4.

Facial shading repaired with repair_worker_face_material.py on Mesh0.001, world bounds [-0.3,-0.5,1.04,0.3,-0.08,1.53]. Removes faulty normal-map shading within the selected face region and smooths coincident UV normals. Albedo unchanged; forehead and cheek polygon patches disappear in front and side renders. Original material remains outside the bounds, preserving scarf detail. Source and compressed candidate are in content/source/actors/youngFemale; no runtime substitution yet, because mouth authoring and facial validation are incomplete. All 12 clips/28 bones pass 492 sampled pose comparisons (zero position error).

Worker recovery update: all four profiles now use the packed Worker_GetUp clip and simulation recovery state, with Fall-to-recovery blending, movement suppression, final position reconciliation and a short exit blend. Each installed profile has completed a stepped WorldScene encounter trial and resumed fleeing. This is not continuous visual acceptance: terrain support trajectories, dynamic obstacles and clothing folds remain open. See ../../worker-recovery/neck-and-exit-review.md for evidence and limits. This facial candidate is still not installed.

## Editable-source portability repair

Opening the committed Blend exposed missing base-color and normal images (magenta render). Those two image datablocks were not packed, had empty paths and no retained pixels. Restored exact-name images from the original gameplay GLB and packed all four images with pack_blend_source_images.py. Reopened and rendered the repaired Blend after the extraction directory had been deleted; front and side mouth-reference renders now show the expected textures. The runtime GLB is unchanged.

The mouth close-up also exposes residual cheek/corner creases, especially the left cheek. The broader shading improvement must not be described as a complete seam repair. Keep this candidate uninstalled until the mouth and those visible defects are resolved. The anatomical lip seam, not the lower lip/chin border, remains the incision reference.

## Mouth candidate v2 (not installed)

A separate mouth-candidate.blend/.glb now contains mouthOpen and an oral shell with palate, floor, tongue and recessed dental rows. The incision uses the five Amara lip landmarks, with independent region, pivot and deformation parameters in jaw-profile.json. v1 concentrated the lower-jaw falloff too tightly and created a chin shelf; v2 widens that falloff, improving the side contour. The shared authoring tools now accept per-character parameters; Kofi remains the default.

Oral topology audit reports only its intended front boundary and no additional shell boundary/nonmanifold edges. Animation comparison preserves all 28 bones and twelve native clips over 492 sampled poses (position error zero, maximum angular error 5.96e-8 radians). This does not prove skin deformation quality or correct interior visibility from every angle.

Three.js preview is available at tests/browser/actor-expression.html?actor=youngFemale. Manual combined pain expression drives mouthOpen and both eyelids. Browser evidence exposes unacceptable closed-lid relief/faceting; cheek creases also remain. Side-view aperture sightlines, neutral/half-open mouth and animated facial behavior still need review. The active worker catalog remains unchanged. Do not count this candidate as an accepted expressive worker.

## Eyelid v5 smoothing

A clay render isolated the closed-lid faceting to geometry rather than skin color. The v5 envelope uses full fitted clearance, a broader smooth-envelope blend (power 0.45), and a reduced crease bulge (0.0003). Closed and half-closed Blender views and actual Three.js views show substantially smoother lids. The mouth candidate now contains v5 lids; eyelid-profile-v5.json reproduces them using --replace-existing on the previous mouth candidate. The earlier v4 profile is retained as historical input.

Regeneration also exposed a pipeline bug: only material slot 0 was baked to the unlit skin atlas, so repaired faces in slot 1 rendered black. add_actor_eyelids now bakes all source material slots and restores each original slot afterward. v5b is the corrected atlas result; the black preliminary output is rejected.

The updated GLB preserves twelve clips and 28 bones over 492 samples. Browser screenshots document full and half closure. Residual defects remain: cheek creases, a small colored triangular patch in the exposed eye white, and the upper lid boundary still needs closer neutral/animated inspection. This remains a candidate, not installed or fully visually accepted.

## Local UV repair

Neutral reference raycasts identified two source defects: a colored triangle in the eye white and a green patch above the brow. Both are already visible in original/front.png. In the editable candidate these map to polygons 12586 and 16118; their UVs occupy unrelated low-V islands. repair_amara_uv_patches.py reconstructs each triangle's UVs by extrapolating the most similarly oriented edge-adjacent main-island triangle. The source hash and original UV location are guarded. Geometry, skin weights, morph coordinates and texture pixels are untouched.

Blender and Three.js neutral views confirm removal of the conspicuous colored patches. Evidence: defect-landmarks.json, uv-repair.json, uv-repair-front.png, uv-browser-neutral.png. All twelve animations/28 bones retain parity across 492 samples. A small residual edge near the iris remains worth inspecting close up.

A separate trial recomputing whole-face normals did not remove the cheek crease and introduced angular chin shading, so that result was rejected. The committed candidate contains only the localized UV fix on top of the v5 eyelids/mouth. Cheek geometry and final continuous expression validation remain pending; active gameplay catalog unchanged.

## Cheek isolation experiments (not applied)

Added --albedo to inspect_actor_face.py to separate base-color features from lighting/normal defects. The unlit front retains subtle painted smile creases, while the stronger lit cheek line is much less apparent. This does not justify repainting or removing the anatomical smile contour.

Two local trials were evaluated: depth fairing in an elliptical left-cheek region (maximum displacement 0.00532 m, same displacement on every morph) and fitted analytic normals with unchanged coordinates. Neither produced a clear enough visual benefit to accept. The current mouth-candidate assets remain unchanged. smooth_amara_cheek.py is retained as a diagnostic experiment only, not an accepted generation stage. Captures: cheek-albedo-diagnostic.png, cheek-fairing-rejected.png and cheek-normals-trial.png.

Next investigation should compare evaluated normals and material channels at the visible edge before any additional deformation. Do not claim the cheek crease has been corrected from these trials.
