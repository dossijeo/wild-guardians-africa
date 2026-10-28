# Active facial coverage

Run `node tools/guardian/audit_face_coverage.mjs docs/guardian/phase2/face-authoring/coverage.json --require-all` from the repository root. The strict check intentionally exits nonzero while any active animal/worker lacks a required POSITION morph channel. It resolves the runtime catalog, fingerprints the exact GLBs and records candidate files separately, including whether their bytes match the active model.

Current result: warthog, hyena, buffalo and lion have blinkL, blinkR and mouthOpen. Rhino and all four worker profiles still lack these channels in their active assets. Lion installation and runtime evidence are recorded in docs/guardian/lion-installed. The six ActorExpression tests pass, proving controller behavior on test geometry; they do not prove the absent facial geometry works in game.

This check proves channel availability only, not correct topology, nonzero motion, anatomical alignment or visual quality. Each remaining model needs individual eye/mouth landmark authoring, preservation of teeth/commissures, actual oral interior, texture cleanup, weight isolation and visual approval before catalog replacement. Do not reuse the rejected generic chin cut. Existing hyena/lion sources and inspection scripts remain the starting points; no models were replaced during this coverage audit.

## Older female candidate, not installed

Authored explicit eye contours and five raycast lip-seam points for the original 4c3d590d library. Candidate Blender/GLB are under content/source/actors/olderFemale; profiles and evidence under olderFemale in this directory. The mouth uses a local incision, recessed oral shell, tongue and teeth. Twelve clips and 28 bones retain parity over 492 samples. The gameplay catalog remains unchanged.

Lid v1/v2 had vertical bands; a clay render confirmed geometry as the cause. Enlarged v3 contours and a fully fitted envelope reduce the bands, but Three.js still shows white edge exposure and a poor side half-closure. Neither lids nor face seams are accepted. The skin-sampling-radius experiment did not solve geometric bands. Preserve the source wrinkle detail in both albedo and normal/geometry channels; do not run a blanket face-map removal or smoothing pass. The next seam investigation must distinguish actual UV discontinuities from anatomical wrinkles.

inspect_actor_face now rejects unknown morph names before rendering: a deliberately nonexistent morph failed as expected. This prevents a neutral render from being mistaken for a successful expression check. The fixture supports actor=olderFemale and labels it explicitly as an uninstalled candidate.
