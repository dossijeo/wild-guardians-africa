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

Build/package subsequently PASS (8af50dfc): Vite 14.01s; 704 files / 443925542 bytes / 860 relative links, all 22 meshopt runtime records present. Native session942 recorded eight species, five phases/four bridges and angles without rendering errors; all 72 colour/shadow/depth sides Front, context lost on cleanup. Its labelled night and stateExact=false are retained as fixture negatives, with original receipts/screens and source. Navigation CPU reproduction gives reused epoch1→2 versus fresh epoch1/state exact. Corrected native night/restore review remains pending.

Corrected session943 PASS: time450/skyNight1, eight plants, SaveRepository/navigation/World restore all exact with differences[], fresh canvas, errors[]/console[], 72 Front colour/shadow/depth meshes, closed/contextLost cleanup. Original JSON/PNG and root night/restore screenshots/console/source are retained with hashes; `node docs/qa/crops-v4/verify-native-all.mjs` verifies both sessions while retaining942 negatives. Root AI still review is limited to captured gameplay views; this is not user-human/global visual approval. No comparison experiments/timing were added.

Final validation after merging main67fd85b2: 63 directed contracts PASS (including environment surface/shadow preservation), native/provenance verifiers PASS, build11.46s PASS, package704files/443925570B/860relative-links/22GLBs PASS, source/resources126SFX/four libraries48clips intact. Selected V4 meshopt decode geometry is byte-exact, image alpha/encoding and glTF conformance PASS (0 validator errors). Full regression runs through PR CI. The additional bridge download is 26,536,168B and is awaited by World.load/Assets before readiness; no previous loading or GPU timings are inherited.

CI a0cdc8b8 failure is retained in ci-a0cdc8b8-failure/run.json: stale SFX source hashes/line references and an obsolete20-GLB contract. Refreshed126-row audit retains all bytes/assignments/classifications; only crop-batch/scene source hashes and reference lines change. Package uniqueness now checks the independent public/assets GLB inventory and both source/runtime uniqueness.

Whitespace exception: references/crops-v4/recipe-functions.js retains the lab slices byte-for-byte, including its blank EOF. Its SHA256 df6f3e62a0a5882c842f3649a735387493d309da3e48c09996061236aca4902c is the manifest recipeSha256 and is verified by verify_crops_lab_v4.mjs. Trimming that authored artifact would invalidate provenance; the ordinary test EOF was cleaned instead. No global line-ending conversion or whitespace-gate relaxation is applied.
