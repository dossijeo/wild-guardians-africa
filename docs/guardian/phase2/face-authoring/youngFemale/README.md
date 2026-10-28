# Young female facial authoring — not installed

Source: full 12-action gameplay library `0ab73565649737fc15d853aa9d52a9ecacff3fbf9f5664cc21ec4e54452ef894.glb`. Original front, quarter and both profiles are retained under `original/`. Mesh `Mesh0.001` has 15,293 vertices; head-weight selection includes 8,466 vertices (also headscarf). Inspection now recognizes both mixamorigHead and mixamorig:Head naming.

The independently calibrated contour and lip raycast requests are preliminary. Do not reuse Kofi coordinates. Lip points follow the visible dark lip seam, not the chin. Before cutting the mouth, inspect a larger mouth close-up and corroborate side depths.

First eyelid experiment rejected: skin sampling only two pixels outside the contour sampled white eye texture, producing vertical white streaks on closure. Second experiment separates skin sampling from geometric coverage (18 pixels above, 12 below); this removes the white streaks but STILL leaves white crescents at the upper and lower edges. Current profile is v2, not accepted. Next iteration must cover the full ocular surface while preserving the original eyelashes, then inspect neutral, partial closure and profiles. Facial material faceting also remains untreated. No runtime asset has been replaced for this worker.

Reproduce with add_actor_eyelids.py using the full source above and eyelid-profile.json, followed by inspect_actor_face.py with center/extent from original/inspection.json. v1/v2 temporary editable files remain in C:/tmp/guardian-faces. Screenshots document failures rather than passed validation.
