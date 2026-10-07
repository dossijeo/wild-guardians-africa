# Model bounds for camera exclusion

This step derives oriented volumes from the actual model bounds and world transforms. It does not yet constrain the live camera or set approved visual distances.

`cameraModelVolume(id, bounds, matrix, margin)` preserves the local pivot offset, parent translation/yaw and independent axis scales. Margin is expressed in world units and is configurable, with zero as the geometric default. Unsupported tilt, shear, degenerate scales and invalid bounds fail explicitly rather than creating an incorrect yaw-only volume.

Native work-center preparation retains finite boxes alongside the existing culling spheres, computed once per culture from the same intact/interior, collapse and ash recipes. The sphere behavior is unchanged. Future camera registration must choose the appropriate state envelope and invalidate it when a building changes state, moves or is removed.

The tests use all five original center GLBs and all five village binary payloads:

- Deformed center vertices remain inside the retained box at seven damage levels, for both shell and interior; contracted ash vertices remain enclosed at four growth levels.
- Center box corners remain inside the world oriented volume after rotation/translation, for each culture and all three envelopes. A trajectory above the finite roof remains unobstructed.
- Every indexed village-house vertex remains enclosed after the native scale of 16 and three yaw angles. These bounds use `unit.min/max`; they do not enclose the shared whole-village position buffer.
- Offset pivots, parent yaw, nonuniform scales and world-unit margins are verified independently of the model datasets. Invalid transforms are rejected.

The [test log](model-tests.txt), [build log](model-build.txt), [web-package log](model-package.txt) and [source hashes](model-source-hashes.json) record this revision. These are geometric and build checks, not visual acceptance of safe close-up distances, physical-device usability, controller smoothness or real frame cost. Those remain required before claiming camera protection complete.
