# Local cultivated soil candidate

QA-only stamp into existing renderer ground-mask wear channel, maximum .7 at crop centers with linear radius1.35m. Applies once per loaded texture; no new textures, geometry or passes. Renderer mask only, no simulation/navigation edit. Original grass geometry, pigment and masks elsewhere retained. Existing crop root exclusion radius1.6m already clears these centers. Texture lattice is1.5m, so filtering extends beyond the sampled stamp radius; not a precise footprint guarantee.

12 captures match baseline in camera,target,time,origin,elapsed,worker positions,calls and triangles. No recorded errors. Seed712,media,1280×720,day/night,three views, full far backgrounds. Normal day/night inspected: cultivated strip reads more clearly by day; nighttime separation improves modestly, small green foliage still dark. Surrounding grass stays dense. Preserve candidate for review, do not claim complete crop readability or zero GPU cost: more fragments can enter existing soil shading branch.

Not production ready: QA mutates once and has no event-driven removal/restoration. A native implementation must retain immutable base masks, update on visual crop invalidations and dispose correctly; must not leave marks when crops disappear. Benchmark and streaming/event validation required before integration. Selected recipe unchanged.

Reproduce capture-river-crop-soil-20261022.mjs then compare-river-crop-soil-20261022.py. Baseline gran-rio-populated-frozen-20261022; left original, right candidate. Crop audit separately confirms12 opaque original-stage models; no alpha transition responsible for this snapshot's low contrast.
