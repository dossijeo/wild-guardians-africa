# Open defect: posed skin selection bounds

WorldScene initializes skinned bounds when adopting an actor. Three.js raycasting reuses these bounds before testing posed triangles. A synthetic bound single-bone triangle translated outside its original sphere reproduces a missed WorldScene.pick; recomputing its box/sphere restores the hit. The diagnostic test explicitly asserts this unresolved defect, not a fixed behavior. Existing real-model tests still cover initial poses only.

Rejected a production patch that recomputed every skin box before each selection. A local Node trial with 20 cloned catalog animals (four of each species) measured 140.526 ms cold and 107.509–120.320 ms on subsequent passes. This is bounds work alone, not browser click latency, and is already too costly to justify. The patch was removed; production remains unchanged.

Next implementation should prepare conservative pose-dependent bounds during asset loading and update them from bones on demand, accounting for active facial morphs. The existing skin-envelope helper intentionally rejects morph-bearing geometry, so applying it blindly to these expressive models is not a valid fix. Need both containment proof and measured selection cost before installing a replacement. Do not mark animated surface picking accepted.

## Prepared implementation

Implemented separate skin-pick-bounds envelopes, prepared during actor loading and cached by shared geometry/bind matrix. Each bone box includes all combinations of position morph influences in [0,1]. Selection transforms the boxes using current bones, including non-unit positive weight-sum bounds, then uses the ordinary Three.js posed triangle raycast. Unsupported morph weights or changed attribute versions take the exact fallback. No per-frame skin scan is added. The earlier diagnostic is now a passing regression for corrected selection.

Twenty-two picking, containment and preload tests pass. Containment checks every vertex of five actual catalog species under four transformed poses with simultaneous facial morphs; out-of-range morph and geometry changes invalidate the prepared envelope. Production build passes (7.80 s, existing warnings).

Reproducible CPU measurement: node tools/measure-guardian-picking.mjs output.json. With 20 beasts, alternating exact/prepared runs and excluding the first two of each mode, bounds averages are 118.358 versus .658 ms; complete raycast averages 138.581 versus 19.664 ms, each returning 14 hits. This compares against the rejected exact refresh, not the old stale-bounds implementation, and is not browser FPS. Raw preparation and sample data: vfx-scalar-review/pick-bounds-cost.json.

Browser integration: clicked the visible rhinoceros torso in the WorldScene fixture; observed the projectile/impact at the torso, health reduced to 140, maximum one Guardian and no errors. Saved status/screenshot: vfx-scalar-review/prepared-pick-browser.*. This click is initial-pose graphical coverage; moving-limb and fallen-pose selection still need graphical review. The defect has an implemented conservative fix, with that visual acceptance limitation.
