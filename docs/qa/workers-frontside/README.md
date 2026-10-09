# Worker FrontSide pilot (disabled)

Base: `1ed8be18f59b163d423c93884e7b9a6174c466a5`. This resumes workers only; the integrated crop V4 assets are untouched. No production manifest, renderer, audio, task, loading or simulation code changes.

## Actual format and preservation

All four libraries are GLB 2 exported from native Quata character labs, rather than runtime procedural meshes. Each contains 25 meshes, 62 nodes, one skin with 28 joints and 12 animations with 114 channels/samplers each. Mesh0 is the sole skinned mesh. Its material is already FrontSide; the 24 rigid accessory mesh nodes use 13 DoubleSide materials. There are no morph targets. Procedural accessory authoring has already been baked into the exported geometry and animated attachment hierarchy.

The CPU audit reads the immutable manifest assets and verifies source SHA and bytes. It audits all 48 clips. Blender 4.5.9 LTS independently reconstructs exact-coordinate scratch adjacency for the five selected meshes, with no tolerance weld, normal edit, GLB export or index reorder. Its result agrees with the closed, consistent positive-volume filter. This filter is an experiment selection criterion, not a universal requirement for FrontSide or visual approval.

## Representative candidate

The youngMale pilot selects crate meshes 7/8/9 and hoe meshes 23/24: 8,640 of 41,927 triangles. Five material clones change only `doubleSided=false`; primitive material references select those clones. The binary chunk is byte-identical, as are nodes, skin, animations, accessors, bufferViews, images, textures and original materials. Indices, positions, UVs, tangents, normals, weights, bind matrices and baked accessory timing are preserved. The candidate adds 1,532 JSON bytes and no triangles, vertices, primitives or geometry groups. Its reproducible SHA is `3ac771a241023c3ec68df0ffdaeeb4d9c83f6380b4205a5000b17f751c15f2c7`, also matching the historical disabled candidate.

The body stays original FrontSide. All other accessories stay original DoubleSide, including the genuinely thin/problematic surfaces. The current audit counts 473 zero-length NORMAL accessor entries per profile, including 81 in the nozzle; this is an accessor-entry inventory, not the historical 392-entry subset or a claim that all entries draw. None occur in the selected five meshes. Existing normal-repair appearance negatives remain historical negatives, not approval under the newer visual policy.

`WorldScene.actor()` borrows GLTF geometry/materials through SkeletonUtils clone and uses the original clip arrays. Task pose timing, tool visibility, crate extraction and watering emitters must remain unchanged. A later opt-in adapter must retain the original DOUBLE_SIDED normal/TBN shader recipe independently of raster culling and verify color, shadow and world-depth policies separately. Changing manifest SHA blindly would break the watering-path source check; this pilot does not update production manifests.

## Reproduce

Run `python tools/audit_worker_frontside.py --candidate` (Python + NumPy). The candidate is written only into ignored `.cache/workers-frontside/`, with audit in this directory. Run Blender headless with `--factory-startup --python tools/inspect_worker_frontside_blender.py` for independent read-only inspection; an existing official portable Blender 4.5.9 is available in the historical worktree cache.

The CPU audit completed with exit 0 in 1.79 seconds; Blender completed with exit 0 in 5.87 seconds. Neither is a GPU timing result.

## Remaining acceptance

No browser rendering or worker performance has been approved by this archive. Native CUA currently has a kernel-assets failure; no alternative browser automation is used to bypass it. Once operational, validate the original effective sidedness control and candidate across all 12 clips, accessory visibility, representative day/night views, shadows/depth and watering/crate behavior. Small pixel/color/silhouette differences are diagnostic under the user's flexible policy; convincing gameplay appearance and preserved functionality determine visual acceptance. Preserve older negatives separately.

Then measure net whole-worker AB/BA GPU cost with identical rigs, clips, camera and effective source materials, including shadows and all draws; exclude probes/readbacks from timing. Do not force the already-FrontSide body to DoubleSide or inherit crop gains. Remaining profiles and thin accessories require their own evidence before category completion. No PR or production activation yet.

## Prepared runtime harness (not yet rendered)

Run `node tools/serve_worker_frontside.mjs`; private URL is `http://127.0.0.1:5364/tests/browser/workers-frontside.html?limit=1`. The Run button is enabled after module initialization. Stop releases resources. Initial screening uses source/repeated source/candidate columns, 512px readback with 256px atlas thumbnails. Remove `limit` for 48 samples covering 12 clips, two clip fractions and day/night, using Sabana/Manglares lighting. `?clip=Carry_Crate&limit=4&shadow=front` selects a separate FrontSide-shadow screening; no setting changes the original body or nonselected materials. This is a local runtime shader/rig fixture, not full WorldScene or all-biome acceptance.

The fixture loads the original through production Assets + meshopt decoder/runtime URL mapping, SkeletonUtils clone, sampleFixedPose, native tool visibility, AfricanToon, NativeSky and native shadows. It applies material-only QA clones corresponding to the byte-preserving candidate before shader decoration. Original body remains FrontSide, source accessory sides stay unchanged, selected candidate color materials carry DOUBLE_SIDED for the original normal/TBN recipe. The report records color and actual shadow-depth draw sides and geometry identity. It never times GPU work. Allocation tracking wraps GL create/delete only in this ownership fixture; counts describe handles, not bytes or physical VRAM. Native tests must inspect the returned observations rather than infer ownership from renderer.memory alone.

Reports/PNG are POSTed to the private `/__worker_frontside_report` endpoint and stored with unique timestamp names under `docs/qa/workers-frontside/native`, preventing rolling overwrite. Download links remain available as a fallback. The server validates policy/source/candidate identity and non-timing scope, without pixel acceptance gates. No native receipt exists yet.

Two CPU contracts pass: repeated original/candidate toggles and release/reinstall retain borrowed geometry/attribute identities and source material ownership; invalid or incomplete sources fail before allocation/mutation. Browser/server syntax and CRLF-aware diff checks pass. These checks do not replace native visual/resource acceptance.
