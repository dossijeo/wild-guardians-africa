# Far owner and adopted-radius regression fixes

Source hashes and merge revision are in sources.json. The unchanged parent reproduction scripts now report zero late listeners/texture handlers while the world remains open, and exact agreement with main for pending alta→media / media→alta terrain regions. Their former failures remain archived in ../far-owner-cancel-review and ../far-horizon-radius-review.

46 directed tests pass. Ownership cases cover replacement before the old callback resumes, cancellation inside initTexture, and an old compilation resuming after a replacement cache exists. Baked textures carry weak owner signals; released cache entries reject old continuations, without releasing the replacement. The GPU proof still requires compilation, upload and a completed fence.

The exact terrain follows the radius adopted by NativeHorizon, including the experiment-off path. Independently compacted visual terrain retains sufficient residency to cover the previous hole until adoption, then releases surplus. Both quality directions, explicit resident radius and subsequent adoption are tested against the actual WorldScene.syncChunks method. Seven new region cases fail on the prior implementation.

These are deterministic lifecycle/region regressions, not native visual or performance acceptance. Native multi-biome elevated views and the complete branch suite remain pending.

Build and web package on the merged revision pass: 694 files / 403,444,487 bytes, 859 relative links and 20 runtime GLBs. This is deployment verification, not a native memory measurement.
