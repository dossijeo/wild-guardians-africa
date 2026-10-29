# Open defect: posed skin selection bounds

WorldScene initializes skinned bounds when adopting an actor. Three.js raycasting reuses these bounds before testing posed triangles. A synthetic bound single-bone triangle translated outside its original sphere reproduces a missed WorldScene.pick; recomputing its box/sphere restores the hit. The diagnostic test explicitly asserts this unresolved defect, not a fixed behavior. Existing real-model tests still cover initial poses only.

Rejected a production patch that recomputed every skin box before each selection. A local Node trial with 20 cloned catalog animals (four of each species) measured 140.526 ms cold and 107.509–120.320 ms on subsequent passes. This is bounds work alone, not browser click latency, and is already too costly to justify. The patch was removed; production remains unchanged.

Next implementation should prepare conservative pose-dependent bounds during asset loading and update them from bones on demand, accounting for active facial morphs. The existing skin-envelope helper intentionally rejects morph-bearing geometry, so applying it blindly to these expressive models is not a valid fix. Need both containment proof and measured selection cost before installing a replacement. Do not mark animated surface picking accepted.
