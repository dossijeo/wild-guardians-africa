# Real crop-event invalidation of persistent River underlay

Run `node tools/experiments/capture-river-underlay-mask-persistent-occupancy-20261022.mjs` with Vite on port 5190. Uses the existing `qa-river-yard-crop.js` real-command probe, aliasing native groundDetails for observation only.

Seed 712, media, 1280x720, fixed camera and wind. Probe creates an operational center through normal placement because the initial state has none, then plants maize through the normal game command. No simulation rules are modified; pauses are temporarily removed for synchronous commands and restored. The test never explicitly clears the coverage tiles or forces its dirty flag.

Observed CropPlaced event sets occupancyDirty=true. Normal world.sync(0) consumes it, returning false. Within 2.2 units of crop (96.1873,24.2018), accepted coverage anchors fall from 97 to zero. Persistent mask sampled at crop center is zero. No overflow or captured console/WebGL errors. Center founded at (79.8316,15.8273).

The four real captures include daytime before/after and two nighttime post-placement frames. Night is NOT an independent before/after planting test. review.jpg was visually inspected: the new center and small bare crop region are visible. This is a functional occupancy test, not a visual-equivalence or timing benchmark; changing world contents intentionally changes draw counts. Anchor exclusion does not prove animated blade tips can never overlap the crop boundary.

This clears the real planting-event gate for this fixture. Crop removal, walls, other seeds, quality/overflow recovery and native integration remain pending. Retain the candidate; global artistic matching is not yet complete.
