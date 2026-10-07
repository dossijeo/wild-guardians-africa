# Independent horizontal and vertical clearance

Native Suajili captures on a7e5126 show that geometric exclusion alone does not guarantee a useful minimum viewing distance. Increasing the uniform margin from 2.4 to 6 improves facade clearance but also inflates the roof by the same amount.

`cameraModelVolume` now accepts either the existing scalar world-unit margin or `{horizontal, vertical}`. Scalar callers preserve their previous dimensions. The split form adds horizontal clearance to local-yaw X/Z extents after model scale, and vertical clearance to world Y. Both fields must be finite and nonnegative. The registry passes independent center/village options through without changing default numeric margins.

The diagnostic fixture adds vertical inputs for centers and villages. Its visible report includes the exact active margins. Horizontal candidates remain 2.4/1.6 and vertical candidates 0.6/0.6; these are diagnostic controls, not approved gameplay settings. Normal gameplay protection remains off.

Tests verify scalar/object equivalence, invalid margins, yawed roof overflight with a 6-horizontal/0.6-vertical candidate, separate village/center scales, collapse states and actual original GLB envelopes for all five center cultures. For each native still/fall/ash state, a path above the split roof is clear while the same path intersects a uniform-six volume. This proves geometric clearance, not successful player input or visual roof overflight in the rendered game.

Build and web-package checks pass; the extracted fixture module also passes `node --check`. Production presets, per-model visual acceptance, real orbit/touch controls, nearby crops, terrain conflicts and physical mobile verification remain pending. No FPS, GPU or RAM gain is claimed: margin calculation occurs when a descriptor rebuilds; unchanged registry records remain cached.
