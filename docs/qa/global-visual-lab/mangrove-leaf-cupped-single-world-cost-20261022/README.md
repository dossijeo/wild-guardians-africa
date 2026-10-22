# Single-world moving leaf geometry benchmark — incomplete equivalence

Retained original/cupped geometries share instance buffers in one resident world, avoiding scene reloads.720 valid GPU queries; leaf counts match, but33 frame comparisons still have non-leaf LOD differences. Original/cupped GPU means day18.74→18.34 and18.03→17.40ms; night18.27→20.56 and19.53→18.84ms. These are observations, not isolated leaf costs or FPS gains.

Do not reject the candidate based on this noisy result. A separate fixed-camera control isolates leaf geometry cost without crossing tree LOD thresholds. Moving benchmark remains explicitly incomplete. QA retains both geometry sets during swaps; resource counts include both, not native integration memory.
