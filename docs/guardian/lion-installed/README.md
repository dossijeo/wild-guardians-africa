# Expressive lion installed on the work branch

Active source GLB: 12d919219b27d40f50957bd1e7e239187fb9c0dd44d821a642f540f1e55e4a55 (17,383,464 bytes). Optimized runtime: 7,347,720 bytes. Existing editable source and candidate are retained under content/source/actors/lion. Original active model remains available; no main merge.

The reviewed candidate supplies jaw opening, teeth and oral interior, eyelids, isolated muzzle weights and the previously compared matte fur material. Catalog and asset provenance now select it. Native animation/footprint and footstep calibration were regenerated; gameplay radii remain unchanged. The offline fall bank was regenerated using the current solver, including current roll compensation, for all species.

Executed: 43 expression/combat/ragdoll tests pass. Source-to-candidate audit preserves 78 bones and six clips across 246 pose samples (max position error 0.000002763 m); 1050 neutral muzzle vertices remain attached to Head. Runtime compression verifier reports byte-exact geometry/animation and zero glTF errors. Production build passes, retaining existing chunk-size/import warnings.

Inspected neutral, pain, both profiles and Running at 0.35 seconds with mouth 0.85 in the face viewer. The captured neutral-face.png is neutral: development reload reset the viewer before capture, so it is not mislabeled as running. combat.mp4 and combat.json use the active catalog with faceCandidate=false. Eleven facial bindings are active. The recorded attack/fall/roll/authored recovery returns to attack with no errors or remaining down actors. sequence.jpg was inspected at 1 Hz; this does not certify every intermediate frame, pose or angle. First recording was invalidated by development reload during resource regeneration and was discarded.

Remaining: expanded expression/pose review, nighttime face readability and matched morph-performance comparison. The new model is integrated on the review branch, not declared universally visually approved. Other three beasts and four workers still require facial authoring. The recorded video has no audio.

Additional integration suite: 37 animal-action/baked-fall/contact tests passed after regeneration. Footstep regeneration also refreshes stale hyena provenance to its already-active model; its contact timing differences are sub-microsecond numerical changes.
