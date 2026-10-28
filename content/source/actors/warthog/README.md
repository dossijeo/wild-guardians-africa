# Expressive warthog candidate

This expressive model is installed in the working branch catalog; broader validation remains open.

- `expressive-candidate.blend`: editable v5 jaw/oral anatomy on v12 spherical eyelids, packed textures capped at 2048 pixels; see `.package.json` for explicit texture resizing. Original source is untouched.
- `expressive-candidate.glb`: compressed runtime candidate with original animation channels restored after Blender export. Seven clips, jaw morph and progressive eyelid morphs. Compression audit is in `docs/guardian/phase2/face-authoring/warthog/runtime-oral`.

Reproduce from the original facoquero GLB using `tools/guardian/add_actor_eyelids.py`, the warthog eyelid profile, then `prototype_warthog_jaw.py --oral-cavity --hollow-interior --source-glb ORIGINAL`. The source-animation restoration step is required for exported clip fidelity. The oral-candidate and runtime-oral reports document the exact v5 inputs and validation limits.

Both browser expression and combat fixtures now load this saved candidate, so review does not depend on an ignored local scratch file. In combat use `?face=warthog&recoveryDay=1`. The active uncompressed source is public/assets/53c8f76ba3af3c972206a86e9fb4c9c25be3bb890077caa99c9c0b1bc3240b89.glb. The web copy, action/footstep calibrations and baked fallback bank have been regenerated.
