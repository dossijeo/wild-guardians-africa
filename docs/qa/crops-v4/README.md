# User CULT V4 integration

This integration replaces the previous crop repair experiments. The user's
`1-biomas.zip` is retained unchanged under references/crops-v4; its sole HTML
contains assetData, repairData and bridgeData. Originals and the experimental
branch are preserved. No old candidate or benchmark is promoted by this change.

`node tools/bake_crops_lab_v4.mjs [path-to-original-zip]` executes the lab's exact
repairGeometry and protectBridgeBackfaces functions offline. The40 states retain
node metadata, materials/UV/normals and scale. The user's recipe reorients771
faces and adds4,315 reverse faces,3 caps and4,716 genuine-open-edge rims:
107,109→116,143 steady triangles. No repair selection or simplification is added.
Effective region labels come from faceSource/cap labels before the32 bridges
are constructed. All bridge PNUV/root/peer/spin/part attributes and authored
15µm reverse protection are baked; only identical complete attribute tuples are
indexed. Every emitted triangle corner's attribute bits are checked against
its expanded authored tuple. Face order/winding and morph drivers remain intact.

The steady GLB is18,839,704B; the indexed bridge GLB is48,988,728B. Incremental
existing-pipeline meshopt/WebP compression yields14,308,628B and26,536,168B.
Meshopt decoded geometry/accessors are byte-exact and unreordered. Normal maps
use lossless encoding; colour/data maps retain existing approved-pipeline quality
and alpha rules. Both decoded GLBs have zero Khronos conformance errors. The
geometry-only bridge required fixing legacy decode's empty extension arrays and
skipping image replacement when there are no images; other assets are preserved.

WorldScene loads the baked bridge library through Assets/meshopt with normal
ownership/loading cancellation, then cropBatch clones templates and adds its
dynamic iBridge. Production dirty-buffer/resize, terrain origin, native growth,
wind, depth compatibility, registry and gameplay rules remain intact. V4 steady
and bridge materials, shadows and custom depth use FrontSide. Legacy V3 data
remains readable for retained references/tests. The old generator refuses to
overwrite this authored integration when the V4 manifest exists.

Checks completed: verify_crops_lab_v4.mjs (8species×5states/32bridges, finite
attributes, actual dispatch, Front colour/shadow/depth, release/rebuild65/128);
targeted verify_web_assets.mjs (geometry/material/node identity, decoder/alpha,
conformance); verify_assets.py (507 resources, intact126SFX/four worker libraries,
48clips and source ZIP maps). This is functional/encoding verification, not a
pixel comparison experiment, benchmark or human visual approval. Actual game
visual QA, build/package and remaining regressions are pending.

57 directed contracts pass, including all eight species across the four morphs at 20/50/80%, save/restore continuation, opaque baked bridge attributes/index identity, lifecycle physical delivery, depth contracts and compressed textured payload conservation. The geometry-only bridge is checked by the V4/decompression verifier. Build attempts stopped during public copy because C: was full; build/package and native WorldScene visual review remain pending. No GPU benchmark or pixel comparison is requested for this authored replacement.
