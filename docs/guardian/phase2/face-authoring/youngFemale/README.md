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
