# Automatic doors in edited and mixed-material enclosures

The gate planner now considers building footprints, solid props and local worker-impassable Grand Canyon terrain contours alongside wall segments. These additional edges are temporary graph data, never rendered or saved structures. The recovered Bastion source is unchanged; `tools/prepare_boundary_faces.py` generates the graph variant that also exposes face polygons.

Only pieces in the current construction command can become automatic doors. If a face includes older walls, the planner tries the latest new piece first, then earlier new pieces if its opening is obstructed. Existing blocks retain their material, HP, cost and identity. Removing a gate does not recreate it; rebuilding the final gap does. An existing door prevents another automatic door in the same face, even when its approach is temporarily obstructed.

For an entirely new enclosure, candidates closest to the existing village-to-crop navigation route are preferred. Both portal approaches and the crossing must be walkable with the proposed gate frames and surrounding walls. This is a preference toward the existing route, not a proof of the globally shortest route after every possible enclosure change. Incremental closure takes precedence over that preference.

The construction command performs the analysis once when the finger is released. It does not run during render frames or while drawing the guide. Canyon contour samples are cached by terrain field, bounded to roughly 4096 grid cells per analysis. No mobile construction frametime claim is made here.

## Verification

`tests/boundary-gates.test.js` passes 19 cases:

- Building closure and village-to-crop-side placement, including bidirectional access and save round-trip.
- Synthetic cliff closure and the actual Grand Canyon terrain, seed 712, using ordinary paid construction and native portal navigation.
- A genuinely open U beside a building remains open without a door.
- Mixed-material closure, removal and individual reconstruction leave older pieces unchanged.
- All five closing materials preserve their own gate HP and piece cost.
- Several removed pieces are rebuilt sequentially; only the final closing piece becomes a door.
- A surviving usable gate is preserved after replacing another part of the wall.
- Existing doors of all five materials, damaged to half HP, survive removal and mixed-material reconstruction of two other blocks and save/reload without generating another door.
- A temporarily obstructed door approach does not permit creation of a second door.
- The recorded Sabana perimeter with skipped rock modules now receives one accessible door, charges 500 coins and preserves a worker route.

The focused wall/gate/locomotion suite passed 64 tests before the final additions; the final boundary/layout/farm-defense run passed 28. The farm-defense test verifies real worker pickup, transport and delivery through a normally purchased perimeter, rather than only testing a path return value. The crate-recovery suite passes 3 tests after extending its explicitly flat navigation double with the new construction navigation API.

Production compilation and the web-package validation passed. Full-suite verification is tracked separately; these results do not certify the complete 100-night balance matrix or physical mobile performance.
