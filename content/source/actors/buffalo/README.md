# Expressive buffalo candidate

Not installed in the production catalog. The original buffalo is preserved.

- `expressive-candidate.blend`: editable oral v4 / jaw v1 / eyelids v4 source; packed textures capped at 2048 pixels. See the package sidecar for explicit resizing.
- `expressive-candidate.glb`: Meshopt geometry and WebP texture compression of the full-resolution export. Original six animation channels restored after export. Geometry, morph and animation payloads verified byte-exact after decompression; zero glTF validation errors.

Reproduction: original 0c77a268cc0a7d22c66dedb7a471a66a414437f39e6bdfbc60c75dc36acf7920.glb -> add_actor_eyelids.py with docs/guardian/phase2/face-authoring/buffalo/eyelid-profile.json -> prototype_buffalo_jaw.py with mouth-landmarks.json -> add_buffalo_oral_cavity.py with the jaw authoring seam report. Use package_actor_source.py for the portable blend and compress_web_assets.mjs --candidate for the web GLB. Source animation restoration is required after Blender export.

Review through tests/browser/actor-expression.html?actor=buffalo or guardian-combat.html?face=buffalo (add recoveryDay=1 for daytime). Runtime evidence and remaining limitations are recorded under docs/guardian/phase2/face-authoring/buffalo. Day and night real Attack cycles completed with the uncompressed equivalent; compressed browser reload still needs validation. The fixture changes do not replace the active game asset.
