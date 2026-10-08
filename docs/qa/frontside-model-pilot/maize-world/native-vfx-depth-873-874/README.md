# Native World VFX depth witness

Root ran two fresh native contexts against frozen `889c152c`, viewer SHA256 recorded in the manifest. Both performed load, day 150, native maize focus, the real growth spell on the QA game copy, paired comparison and finish. Reports and comparison PNGs were copied from root's independent cache immediately after completion.

Both comparisons completed without the earlier TDZ instrument error. Focus and spell selected `plant-355210`; each arm had one active agriculture effect, identical cameras and unchanged logical state during the comparison. Both contexts were disposed with context loss, no cleanup errors and closed tabs.

| Actual depth pass | Original maize | Derived mature maize |
|---|---|---|
| 873, production array handling | One DoubleSide MeshDepthMaterial draw | Three FrontSide MeshStandardMaterial fallback draws |
| 874, QA material arrays enabled | One DoubleSide MeshDepthMaterial draw | Three authored FrontSide MeshDepthMaterial draws |

The authored depth witness in 874 confirms the new material is actually submitted by the World VFX depth pass. Shadow materials remain DoubleSide in both experiments. The QA option is held constant inside each original/candidate pair, and can affect other grouped objects: cross-mode statistics are not a maize-only effect.

Whole-frame submissions were 317→323 calls in each pair, with 162 fewer submitted triangles in the candidate. These are counters, not timer queries or GPU improvement. The previous isolated 17.48% GPU result does not validate this different render graph.

Root inspected both real comparison images: surrounding crops were convincing, but the focused central plant was occluded by a building. This is inconclusive for that plant's appearance under VFX, not a model rejection. Actual user visual review, an unobstructed VFX view, growth motion, harvest completion, resource accounting and a net World GPU comparison remain pending. Reports deliberately retain `WORLD_MAIZE_QA_NOT_APPROVED` and `HUMAN_REVIEW_PENDING`.

Run `node tools/frontside_verify_world_maize_vfx.mjs` to check file hashes, effective depth draws, paired camera/logical contracts and cleanup. This verifier does not approve images or performance.
