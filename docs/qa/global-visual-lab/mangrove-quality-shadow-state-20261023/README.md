# Quality restoration state and subsystem isolation

Current integrated fixed512, medium/day, standard quality sequence. Shadow map size remains 2048, shadow camera projection and light VP matrices restore exactly, native light direction/on/texel uniforms restore exactly. Only shadow texture identity changes, as expected from resizing. Ground quality mesh list contains terrain and Mangrove mud blends, not water meshes. No production change.

QA isolation runs:
- ../mangrove-quality-far-control-20261023/: skip only farVegetation.configureQuality while normal quality switching continues. Returns still change 24,822 / 23,661 pixels (MAE .2810 / .2407). Far reconfiguration alone is not the cause.
- ../mangrove-quality-ground-control-20261023/: skip only groundDetails.configureQuality. Returns change 19,671 / 19,468 pixels (MAE .1351 / .1074). Reduces discrepancy but does not eliminate it. This suggests a contribution from ground vegetation reconfiguration; it is not proof of a production defect or complete causal decomposition.

All wrappers restored in finally, with original quality setting reapplied. These deliberately isolated low-quality intermediate frames are not equivalent low-quality benchmarks and are not artistic candidates. No shader simplification or density change retained. Continue investigation of restored draw/depth state; full-scene parity still unproven.

Use WG_FIXED_QUALITY_PROBE=1 plus WG_QUALITY_HOLD_FAR=1 or WG_QUALITY_HOLD_GROUND=1 with fixednative, day, medium, normal static camera; sample/warmup 10/30 and cadence mode. Standard run without those flags records shadow state. Existing harness seed712 fixture. No browser errors in completed runs.
