# Edge retention without hiding leaves

QA-only original dense leaf variant. Preserve original pigment/contrast, root distribution, geometry, size, masks and exclusions. For shader wear taper only, subtract a deterministic per-instance value in [0,.10] from wear before evaluating the original taper. This can only retain/increase leaf size; never shrink it. Existing path/water/occupancy root exclusions remain unchanged. No runtime source edits.

12 captures: exact camera/target/time/origin/draw/triangle equality to reviewed-profile-20261022; no recorded errors, full far backgrounds, seed712,media,1280×720, day/night and three views. Normal daytime inspected: strong leaf presence retained, irregular boundary transition more visible. Broad patches and intentional clear corridors remain. This is not a completed rectangle fix; boundary continuity needs closer and moving-camera review. Do not promote without those checks or present it as approved.

CPU arithmetic check on cached distribution audit: 8119 accepted roots,6392 unchanged wear-growth values,1727 increased,zero decreased. This is not an exact GPU pixel-area measurement (shader float arithmetic differs), nor a performance benchmark. Geometry workload unchanged does not imply unchanged GPU cost/overdraw. No benchmark run for this candidate yet.

Reproduce capture-mangrove-edge-retention-20261022.mjs and compare-mangrove-edge-retention-20261022.py. Original left in pairs. Selected original remains unchanged. Earlier pigment blend and reduced-density variants remain rejected by user.
