# First three Tinify images in runtime

The crop thumbnail, native HUD coin and desert base-color now resolve through content/manifests/image-runtime.json. Original sources remain in public for provenance; the build excludes them and ships one content-hashed WebP per image. Shader data maps and embedded GLB textures are unchanged. No extra sampler, shader calculation, resizing or texture-coordinate change is introduced.

12 directed tests pass: three hash/dimension/exact-alpha and relative-context image cases, six role cases and three existing web-package cases. The complete package verifier passes: 586 files, 391,703,905 bytes, 859 relative links, 20 runtime GLBs. Against the preceding measured 393,994,577-byte package, net reduction is 2,290,672 bytes after alias/manifest/bundle overhead. Encoded image reduction alone is 2,294,345 bytes. This is not GPU-memory or frametime evidence.

Native browser QA loaded all three WebPs from /nested/itch/audio-qa/ with no root fallback: hashes and decoded dimensions match. nested-browser.json and its screenshot preserve the result. The HUD coin retains decoded alpha exactly and the checkerboard preview shows its silhouette.

The actual WorldScene/biome-ground shader was compared in Desert/Mapungubwe with the same camera and simulation time, switching only uGroundDetailMap between the candidate and original source. Original texture filtering, wrapping, colorSpace and other sampling options are copied from the candidate. Day and night screenshots are archived. At this normal gameplay view there is no evident deformation, material discontinuity or new patterned artefact. This is one culture/biome and viewport; it does not prove all-biome or mobile/Windows visual acceptance.

Reproduce browser image QA with WG_QA_PORT=4183 and node tools/serve_web_package.mjs, then /nested/itch/audio-qa/tests/browser/image-runtime.html. Source-scene comparison: Vite /tests/browser/african-toon.html?case=26, Arena Tinify / original (QA), with day/night control. The original comparison is source-only because original images deliberately do not ship in the packaged build.

The historical pilot reports still say acceptedForRuntime:false; they describe the earlier stage. This follow-up records the subsequent checks and integration. Remaining images, data-map lossless policy, embedded texture conversion, broader HUD/cultures review and native Tauri acceptance of these image variants are pending.
