# Mangrove water asset footprint hypothesis

QA-only replacement: project triangles for every native water mesh, including instanced authored water assets, rather than their bounding rectangles. Uses existing instance transforms; no domain/terrain modifications. Tested against selected reviewed-profile recipe at seed712, medium, three views day/night, warmup/native repeats.

All12 images are RGB exact to baseline. Near/far leaf counts and rendered triangles also exact; no page/GL errors; camera/time/target controls pass. Therefore asset bounding-box exclusion does not explain the observed pattern in this scene. This does not prove boxes are harmless everywhere or that this scene contains relevant authored-water assets. Do not promote this as a fix or performance improvement. Keep the actual approved water/moss unchanged.

Reproduce: node tools/experiments/capture-mangrove-water-footprint-20261022.mjs with Vite5190. controls.json records pixel and count comparisons.

Source audit: wetland ground cover derives from broad cluster/meso fields and is capped0.42; leaf growth uses smoothstep0.10..0.48, CPU placement excludes below0.10. Placement uses0.5m grid with only0.125m total jitter. Tint and orientation reuse one hash, but broad-shape causation is not established. Next inspect mask/placement data directly before another art variant. Previous slope fade was insufficient; do not repeatedly adjust slope or water for this unresolved pattern.
