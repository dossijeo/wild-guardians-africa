# Expressive buffalo candidate

Installed in the working branch catalog; the original buffalo is preserved.

- `expressive-candidate.blend`: editable oral v4 / jaw v1 / eyelids v4 source; packed textures capped at 2048 pixels. See the package sidecar for explicit resizing.
- `expressive-candidate.glb`: Meshopt geometry and WebP texture compression of the full-resolution export. Original six animation channels restored after export. Geometry, morph and animation payloads verified byte-exact after decompression; zero glTF validation errors.

Reproduction: original 0c77a268cc0a7d22c66dedb7a471a66a414437f39e6bdfbc60c75dc36acf7920.glb -> add_actor_eyelids.py with docs/guardian/phase2/face-authoring/buffalo/eyelid-profile.json -> prototype_buffalo_jaw.py with mouth-landmarks.json -> add_buffalo_oral_cavity.py with the jaw authoring seam report. Use package_actor_source.py for the portable blend and compress_web_assets.mjs --candidate for the web GLB. Source animation restoration is required after Blender export.

Review through tests/browser/actor-expression.html?actor=buffalo or guardian-combat.html?face=buffalo (add recoveryDay=1 for daytime). Runtime evidence and remaining limitations are recorded under docs/guardian/phase2/face-authoring/buffalo. Day and night real Attack cycles completed with the uncompressed equivalent. The compressed browser expression check passed with all ten bindings; geometry/animation decoding is byte-exact. Active source: public/assets/fc372bc8ea55017e8e9153b09db6959c26946712929ba281f0b873a23c04bdcb.glb. Broader visual and performance validation remains open.

## Local rear-mane normal revision

Active source is now `public/assets/9dc6ecb1236bc79566fa2862c4624ad34d9111a4286b59220393c08a14076090.glb`. The preceding hash is preserved as the original expressive export. `expressive-pre-mane.blend` preserves the portable input; never feed the revised output recursively into the study.

Reproduce from repository root: run Blender headless with `tools/guardian/study_buffalo_mane_normals.py`, then `tools/guardian/export_buffalo_normal_study.py`. Run `transfer_authored_normals.py` with the preceding original runtime GLB, `test-results/buffalo-normal-baseline.glb`, `test-results/buffalo-normal-candidate.glb`, and an output GLB. Compress and verify that output using the existing candidate tools. Transfer preserves the original textures, clips, positions, skin and morph-position payloads. The portable Blend uses its previously resized packed textures; transfer into the original runtime GLB is required to preserve the full-resolution runtime images.

Only rear-mane custom normals change. The source audit confirms unchanged positions, topology, UVs, weights and shape positions. Baked-fall provenance intentionally retains the original source hash: kinematic payloads are unchanged and no rebake is claimed. The experimental sheen shader remains opt-in. Runtime size is 6,126,224 bytes versus 5,955,948 previously (about +2.9%). This is a size comparison, not a frame-time benchmark. Evidence and remaining visual limits are in `docs/guardian/phase2/vfx-scalar-review`.

## Registered arm-normal revision

Active source: `public/assets/cbe635e87c120401a013b10b2d5fc76a9d1babb83bfbed79dd9957b722b1dd6b.glb`; runtime 6,112,176 bytes. Both preceding source assets remain available. `expressive-pre-arm.blend` preserves the exact input for study_buffalo_arm_normals.py (SHA pinned by the tool); expressive-candidate.blend/glb now contain the arm revision.

Reproduce by running that script in Blender headless, then transfer_authored_normals.py with original fc372bc8 GLB, test-results/buffalo-arm-baseline.glb, test-results/buffalo-arm-candidate.glb and an output path, explicitly --normal-tolerance .00011. Strict default remains zero. Compress/verify the output with the existing web-asset tools. Source audits under vfx-scalar-review refer to the pre-registration candidate paths; their preserved input is expressive-pre-arm.blend. Full-resolution textures and original animation/position/skin payloads are retained through transfer. Registered footstep/action hashes are updated because only normals changed; baked-fall provenance remains the preserved original source.
