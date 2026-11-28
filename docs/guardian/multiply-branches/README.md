# Multiply: energy branching from both hands

The current daylight review found that Grow and Multiply shared the same two straight beams. Multiply now has two hand-fed trunks which each split into three rays around the target crop. The six endpoints slowly rotate around a 0.65 m circle as the effect opens. This is decorative energy around the selected crop, not a claim about exact spawn locations of multiplied plants. Gameplay and targeting are unchanged.

The eight segments reuse one InstancedMesh, the same cylinder geometry and the same material. Grow and Shield still use two segments; Attack uses one. The extra capacity is six 4x4 float matrices (384 bytes); six extra eight-sided open cylinders add 96 triangles while Multiply is visible. These are calculated resource deltas, not a measured FPS improvement. There are no additional draw calls for the branches, dependencies, or per-frame geometry/material allocations.

## Validation

- Six singleton/presentation tests passed. The new test checks trunk origins at the two hands, exact branch continuity, six distinct target-adjacent endpoints, unchanged core target, reuse for Grow, and disposal. Existing Attack timing, interruption and tutorial handoff tests remain passing.
- Production build passed, retaining the existing large-chunk warning.
- The actual WorldScene daylight recording executes Grow/Multiply three times each, rotates the camera, changes zoom and includes two spells 0.3 seconds apart. Maximum one Guardian, zero active summons at the end, no reported errors.
- Full-resolution extracted frames and a contact-sheet review show the split around the crop; both arms continue to feed it. The wider view remains readable but the additive core is bright in daylight. This is not a subjective audio sign-off or proof for every camera/biome.

`before.png` and `after.png` are extracted around 4.5 seconds from the two recordings. Placement differs between runs, so this is a visual design comparison, not a pixel-controlled or performance comparison. `before-runtime.json` also contains four earlier Attack commands; only its last six commands belong to the daylight recording. `after-runtime.json` contains the six daylight commands alone.

`day-spells.mp4` is the updated sequence with audio. A fresh paired CPU/GPU comparison has not been run for these six extra segments. Broader phase-2 performance acceptance remains open.
