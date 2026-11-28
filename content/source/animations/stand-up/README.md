# User-supplied get-up animation

Original: `Meshy_AI_Sunfang_Hyena_Totem_Stand_Up1.glb`, supplied by the project owner on 2026-10-27 for adaptation to beasts and workers.

`source.glb` is an unchanged copy (18,426,104 bytes). SHA-256: `bcaad393b7be81159ac7ee6162ee19d9434c409959a0c8a33eaabca1d39ac78e`.

Contains one mesh, a 28-joint Mixamo-named skin and `Stand_Up1` (8.2666664 seconds, 56 channels). This is user-provided material, not a separately sourced or verified CC0 asset. No third-party license is inferred from the filename.

Inspect the original with `/tests/browser/stand-up-source.html`. The viewer frames the complete sampled motion envelope and provides playback, scrubbing and front/side views. It does not replace production models or load this source into the game.

`hyena-candidate.json` is the first offline adaptation to the expressive hyena. Its provenance includes both input hashes. It is available in the preview and an explicit engine QA option, not enabled by default. See `docs/guardian/phase2/stand-up-source/REVIEW.md` for commands, actual results and the rejected lateral-entry transition. Other species and workers remain pending.

Matching joint names alone does not establish matching bind axes, limb lengths or ground contacts. Preserve the current production meshes, face morphs and accessories when adapting the animation. Physical-pose entry, ground supports, final pose and navigation reconciliation require validation for each species and worker rig.
