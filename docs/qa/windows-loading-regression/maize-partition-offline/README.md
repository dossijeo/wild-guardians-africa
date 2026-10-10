# Offline maize/remainder partition: no runtime integration

This deterministic generator creates only `.cache/maize-partition-candidate/`. It copies existing meshopt compressed byte ranges without re-encoding or rebuilding faces, then remaps scene/node/mesh/accessor/bufferView/material indices and aligned encoded/fallback offsets. Exact authored attributes, indices, extras, local transforms and material definitions remain. Original production resources/models/manifests/loaders/App/workflow/readiness are untouched. No CI, native run, GPU context or promotion.

## Actual candidate file sizes

| File | Meshes | Bytes |
|---|---:|---:|
| maize-steady.glb | 5 | 769488 |
| remainder-steady.glb | 35 | 5892328 |
| maize-bridges.glb | 4 | 3026892 |
| remainder-bridges.glb | 28 | 23509472 |

Four GLBs total33198180B; six unchanged content-hash WebP files total7648314B; diagnostic partition manifest16901B. Complete candidate files40863395B versus original two runtime GLBs40844796B: **+18599B** including the audit-rich manifest. No image payload is duplicated. All original images, including two currently unreferenced roughness images, remain available in this candidate manifest. Generated files stay untracked in .cache; partition-manifest.json and receipt contain paths/hashes/byte sizes for reproduction.

Early maize needs3796380B of GLBs plus3610746B of its referenced normal/base images =7407126B, excluding the partition manifest16901B and original catalogue metadata. The world later needs29401800B of remainder GLBs plus3596330B of group1 normal/base images; maize models should be fulfilled Promise reuse. These request counts are static graph estimates, not actual transfers: maize2GLB+2image+manifest, then2GLB+2newimage for the remainder. Two roughness images stay shipped but unreferenced by current materials, matching the present V4 material definitions. More requests can cost extra local protocol latency; no elapsed-time saving is measured.

## CPU proofs and boundaries

Four tests PASS,12869.5423ms suite receipt (CPU checks, not performance). Real MeshoptDecoder validates all416 original compressed geometry views and their416 accessors/indices, decoded57074092B, bit-for-bit. All40 steady identity/stage extras and32 original authored a/b/bridgeIndex identities partition exactly once; all72 nodes preserve names/transforms and all primitives preserve UV/attribute/mode/material semantics. Generator checks indices0..39/0..31 and original bridge-pair metadata, with no duplicates. Exact Three-compatible material JSON, sampler/texture definitions and six WebP files are retained; no quantization, row/vertex reorder, new repair, cap generation or shadow/depth shader change. Repeated generation produces the same files and manifest bytes; production output paths are rejected and source resources remain byte-identical.

Tests compare descriptor/material semantics and real meshopt decoded data, not native image/raster/culling output. No partial library has been accepted as a full-world load. Lifecycle/real loader integration and future runtime pixel comparisons are still pending, not covered by these offline tests.

## Loader contract requiring review, not implemented

Each steady GLB references the same six content-hash image URIs. This stores payload once, but **does not alone share image decoding or Texture objects** between GLTFParser instances. A canonical World-owned texture/material owner or an explicit GLTF plugin must return the same correctly configured map instances to both parsed libraries. Preserve baseColor SRGB and normal linear interpretation, UV sets, sampler filters/wrap, flipY, premultiplyAlpha, FrontSide, .91 roughness and .48 normalScale. URI/sampler/color-role keys must be canonical and immutable; do not conflate different sampling/color interpretation. In-flight Promise reuse and failure invalidation must be tested. No such plugin/cache/loader has been added here.

Maize steady/bridge logical URLs must be stable and identical in diorama and World Assets requests. Full-world assembly must reuse those parsed templates without re-requesting originals or re-decoding their buffers, then join35 remainder states/28 remaining bridges to validate all40/32. Current loadCropBridges demands32 and current crop batch needs40 model metadata/32 pairs; these checks must not be weakened to accept arbitrary incomplete input. Any future subset API must distinguish explicit partial scope from completed whole-world identity. The source crop-bridges.json remains unchanged, preserving V3/offline correspondence. Prior audit: omitting faceLabels removes239095 canonical bytes and leaves58377; those numbers are not swapped and no metadata compaction is done in this candidate.

Keep one World Assets owner for source geometry/material/bitmap maps, private diorama/world batch clones, no borrower disposing shared textures. Define once-only ownership of externally shared image objects and late-arriving parsed scenes; cancellation/error/owner replacement must observe sibling rejections, reject partial adoption and dispose arrivals without clearing a newer owner's cache. All world milestones, material variants, GPU upload/compile/readiness/fences, original90s gate and saved/New behavior remain required. Normal code currently has no partition selection at all.

Future progress must register each actual physical GLB/texture request with real manifest sizes, count shared/cache hits only after required content exists, and never report the maize subset as a completed full GLB. Remainder readiness is still mandatory. Download interval unions and work estimates cannot be summed or faked; no weights/timers were changed here.

## Reproduction

`node tools/experiments/partition-crop-library.mjs` generates only candidate files. `node --test tests/crop-library-partition.test.js` performs real offline equality checks. `python docs/qa/windows-loading-regression/maize-partition-offline/verify.py` regenerates and verifies frozen hashes, sizes and untouched production source. Session87493 was terminalexit0. Loader integration requires a separate review/authorization.
