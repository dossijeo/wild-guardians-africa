# Active facial coverage

## Queued review after older Amara (user request, 2026-10-28)

After completing olderFemale (Amara mayor), review and improve the Guardian's eyelids to the quality achieved on the other characters. This is pending work, not an accepted result. Inspect the existing geometry before deciding the correction; retain the wooden mask's identity and avoid human-skin eyelids.

Acceptance checks: neutral silhouette; full closure without exposed eye slivers; partial closure without folds or intersections; smooth reopening; front, three-quarter and side views; simultaneous gaze, dialogue visemes and natural blinking. Verify the exported GLB in the actual tutorial and spell appearances, at gameplay distance and close range. Capture before/after evidence and check compatibility with existing facial controls and animation cost. Complete Amara's remaining seam and animated validation work first, preserving skin wrinkles.

Run `node tools/guardian/audit_face_coverage.mjs docs/guardian/phase2/face-authoring/coverage.json --require-all` from the repository root. The strict check intentionally exits nonzero while any active animal/worker lacks a required POSITION morph channel. It resolves the runtime catalog, fingerprints the exact GLBs and records candidate files separately, including whether their bytes match the active model.

Current catalog audit: all five beasts, youngMale and youngFemale have blinkL, blinkR and mouthOpen. olderMale and olderFemale still lack these channels in their active assets. The strict audit exits 2 because those two profiles are incomplete. Candidate discovery includes all four worker profiles, independently of whether their files are installed. Availability does not certify anatomical or visual quality.

This check proves channel availability only, not correct topology, nonzero motion, anatomical alignment or visual quality. Each remaining model needs individual eye/mouth landmark authoring, preservation of teeth/commissures, actual oral interior, texture cleanup, weight isolation and visual approval before catalog replacement. Do not reuse the rejected generic chin cut. Existing hyena/lion sources and inspection scripts remain the starting points; no models were replaced during this coverage audit.

## Older female candidate, not installed

Authored explicit eye contours and five raycast lip-seam points for the original 4c3d590d library. Candidate Blender/GLB are under content/source/actors/olderFemale; profiles and evidence under olderFemale in this directory. The mouth uses a local incision, recessed oral shell, tongue and teeth. Twelve clips and 28 bones retain parity over 492 samples. The gameplay catalog remains unchanged.

Lid v1/v2 had vertical bands; a clay render confirmed geometry as the cause. Enlarged v3 contours and a fully fitted envelope reduce the bands, but Three.js still shows white edge exposure and a poor side half-closure. Neither lids nor face seams are accepted. The skin-sampling-radius experiment did not solve geometric bands. Preserve the source wrinkle detail in both albedo and normal/geometry channels; do not run a blanket face-map removal or smoothing pass. The next seam investigation must distinguish actual UV discontinuities from anatomical wrinkles.

inspect_actor_face now rejects unknown morph names before rendering: a deliberately nonexistent morph failed as expected. This prevents a neutral render from being mistaken for a successful expression check. The fixture supports actor=olderFemale and labels it explicitly as an uninstalled candidate.

## Older female v4: attached eyelid edge

The current candidate uses eyelid-profile-v4.json. A 1.8 cm recessed rim closes the side gap; an 8% wider contour and 3 pixel upper extension cover the remaining white edge. The rim is joined to the original lid object with matching weights, material and all eight corrective keys. It does not add a runtime draw call (the expression fixture reports 3 draws).

Blender full/half closure was inspected from front and side. The exported GLB was then inspected in Three.js with combined mouth/full blink, half blink from the side, and neutral side view. v4-browser-combined.png and v4-browser-half-side.png record those checks. The original 12 clips and 28 bones match over 492 samples (zero position error, normalized quaternion maximum angle 5.96e-8 radians). validator-v4.json reports zero errors and three warnings: generated tangent space and two existing non-root skinned nodes. These are not a claim of full gameplay acceptance.

The face still has angular shading seams. A diagnostic render without the normal map reduced them but also removed wrinkle relief, so that is rejected as a production fix. The new --without-normal-map inspection flag is diagnostic only and is now recorded in inspection.json. No skin maps were removed from the candidate. A sphere-fit experiment failed its facial-radius check and was discarded; the authored contours remain the source of the lid shape. The candidate is still not installed; facial seam repair and full animated gameplay checks remain required.

## Installed older Amara (2026-10-28)

olderFemale now has blinkL, blinkR and mouthOpen in the active compressed catalog asset a736e7adbeb454f3cfc3e3b23bb0b493116fcfe9f64bfe36cc6554bb0ed32d0c. Eight of nine animal/worker profiles have the required channels; olderMale remains incomplete. See olderFemale/material-review.md for the day/night material checks, installed recovery recording and remaining visual limits. Earlier candidate-only entries above are historical.
