# Current far and loading image consumers

The previous display classification predates later horizon/loading integrations. Fresh inventory on runtime base `1bad357b` found 51 unknown standalone distributed images: 44 day/night impostor atlases, six fallback landscape atlases and the loading ornament. The tool now classifies them from the actual six-biome manifest and renderer/image consumers. Paths, slots, phases and expected consumer shapes fail closed if changed.

Far atlases remain `color-atlas` with `requiresAtlasExport`: generic aliasing and Tinify color upload remain forbidden. This protects baked alpha/lighting/framing contracts without falsely assigning the HQ mountain profile's fixed dimensions and pinned byte hashes to different atlases. The loading frame has a real display-color consumer; eligibility is not conversion or visual approval.

Current distributed inventory: 288 images, 229,062,649 encoded bytes, zero read errors. All 219 standalone images have classified consumers. Two of 69 embedded images remain unclassified and protected; eleven unknown non-distributed originals also remain separate. Preflight: 73 eligible (5,035,744 bytes), 99 requiring review (65,224,463 bytes), 47 integrated variants (41,181,150 bytes). These counts replace earlier preflight snapshots only for this exact runtime/source set. Encoded bytes are not GPU memory or total GLB bytes.

70 directed tests pass: actual six-biome files, changed/unsafe paths, duplicate slots, changed consumers, loading art, existing role policies, profiles/data/alpha and integrated image variants. No asset, shader or runtime alias was changed. No API call, conversion, new savings or visual acceptance is claimed. Private credentials and provider URLs are absent from evidence.

Reproduce: `node --test tests/image-far-consumers.test.js tests/image-roles.test.js tests/tinify-color-policy.test.js tests/image-runtime.test.js`, then `node tools/audit_image_assets.mjs` and `node tools/plan_tinify_images.mjs`. Receipt pins source hashes and gzip/expanded evidence bytes.

Independent production validation on exact `fccee67a` also completed: [Validate game 37946138020](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37946138020), 3737/3737 tests, verifiers, build and package pass; ZIP CRCs verified with files directly at root. This precedes these audit-tool changes, and does not approve Windows loading, physical visuals/audio or campaign balance.
