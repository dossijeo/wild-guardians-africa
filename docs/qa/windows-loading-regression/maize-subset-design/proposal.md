# Read-only maize subset and shared-world library design

Source audited: b43b15a8; no runtime, loaders, assets or recipes changed. audit.py reads GLB JSON/ranges and hashes exact runtime files; it does not decode or generate a subset. inventory.json records per-species views, counts, material/image associations, source hashes and byte ledgers. These are payload/storage counts, never measured heap/VRAM or predicted timings.

## Existing dependency and ownership

LoadingDiorama.prepare (loading-diorama.js:93–112) finds the full Cultivos descriptor, calls the existing Assets.model Promise cache and loadCropBridges, then selects species:['maiz'] only at createCropBatchAsync. WorldScene.load (scene.js:165–168) later calls those exact logical URLs with the same Assets owner. Assets.model (assets.js:29–31) reuses the fulfilled/in-flight Promise and records application-cache evidence. A subset URL would be a different cache key: aliasing a partial result to the full URL would make the cache lie and break full-world readiness.

crop-library.js:3–12 requires all32 unique bridge indices today. crop-batch.js:54–68 requires five stages per selected crop; :157–175 requires40 model metadata/32 pairs and then reads baked templates for V4. Filtering the returned scene after full parse does not reduce the existing binary delivery or meshopt decoding. The present loader parses every referenced scene; it cannot claim a maize-only load just because the batch has nine meshes.

GLTFParser caches dependencies/textures within each parser instance (Three r180 GLTFLoader.js:2649,3319–3357,3369–3447). Two separate embedded-image GLBs create two parser caches and object-URL images. Same sampler/image names or the outer Assets.model cache do not deduplicate those images or Texture objects. Existing batch geometry/material clones are private and their source texture maps are borrowed; batch.dispose never disposes the shared source textures. The World Assets owner alone releases the original sources; late model completion is already disposed through ownModel after owner close.

## Exact byte inventory

The effective runtime steady file is14,308,628 bytes (raw source18,839,704). Full32 bridges runtime26,536,168 bytes (raw source48,988,728). Together40,844,796 shipped runtime bytes. Geometry meshopt payload totals33,014,744 bytes; logical decoded geometry buffer views total57,074,092. This excludes textures, JS objects and renderer copies. Bridge GLB has no embedded image/material; its baked geometry contains POSITION/NORMAL/TEXCOORD_0/_AROOT/_APEERROOT/_ASPIN/_APART and indices. No geometry bufferView is shared across species in either GLB.

| Species | Steady encoded geometry B | Bridge encoded geometry B | Combined logical decoded geometry B |
|---|---:|---:|---:|
| maiz | 758,073 | 3,013,969 | 6,258,390 |
| algodon | 631,144 | 2,561,310 | 5,400,274 |
| girasol | 484,456 | 1,868,059 | 3,959,844 |
| platano | 710,432 | 2,498,647 | 5,518,662 |
| sorgo | 1,294,524 | 5,217,234 | 11,220,718 |
| mijo | 872,564 | 3,618,958 | 8,046,940 |
| yuca | 891,416 | 3,722,203 | 8,121,978 |
| batata | 938,169 | 3,933,586 | 8,547,286 |

Maize has five steady meshes plus four adjacent baked transitions: encoded geometry3,772,042 bytes, logical decoded geometry6,258,390 bytes. Its steady material0 uses image0 normal2,239,664 bytes and image1 base1,371,082 bytes:3,610,746 image bytes. A maize-only embedded subset therefore has7,382,788 bytes of existing encoded/image payload, plus newly remapped JSON/container padding. This is a range ledger, not an actual generated GLB size. The remaining seven species contain29,242,702 encoded geometry bytes.

Material0 is also used by cotton/sunflower/banana; material1 by sorghum/millet/cassava/sweet potato. Those group0 images would be duplicated if separate maize and remainder GLBs both embed their own material0 images:3,610,746 additional bytes and duplicate image/texture decoding. The full steady asset also contains roughness image2=238,208 and image5=203,030 bytes; no current material references them after V4 removes metallicRoughnessTexture. They remain physically in the present asset; their removal is a separate potential packaging change, not included in this proposal or asserted as decoded RAM savings.

## V4 bridge JSON versus legacy authoring data

crop-bridges.json actual297,473 bytes, canonical compact297,472. Its40 faceLabels arrays contain116,143 integers; omitting only those properties removes239,095 canonical bytes, leaving58,377. V4 exits via continue before the legacy branch that reads vertices/faces/faceLabels/regions/a2b/b2a. The current V4 branch still reads model/pair cardinality, pair a/b, bakedAsset and template bridgeIndex/a/b. A hypothetical compact manifest retaining40 empty model entries/32 pair a/b plus recipeVersion/bakedAsset is748 bytes, but is not a validated/shipped format.

Legacy V3 crop-batch path, bake_crops_lab_v4 offline authoring and reference tests need these fields. Compact V4 metadata requires a versioned manifest and explicit backward-compatibility/error tests; do not strip the original calibration source or change recipeVersion4 to bypass the32 validator. This~239KB opportunity is materially smaller than the GLBs and is not evidence of a timing bottleneck.

## Alternatives and duplicate cost

1. **Keep current full files and add an embedded maize subset.** Smallest loader change but adds at least7,382,788 payload bytes plus container metadata to package/runtime delivery. World later still downloads/decodes both full files; maize geometry6,258,390 logical bytes and group0 images are repeated. It does not satisfy the requested no-duplicate whole-world path. Starting the full loads early only changes scheduling/peak memory and repeats the previously negative concurrency theme; no recommendation to dispatch this.

2. **Partition maize/remainder and share one canonical texture owner.** Deterministic offline relocation of the existing compressed geometry slices can make four geometry libraries: five maize steady states/four bridges, then35 steady states/28 bridges. Preserve accessor scalar types/counts/min/max, attributes/UV/index bit patterns, mesh/node extras/transforms and the already authored V4 bytes; no re-bake/reorder/repair. Group0/group1 texture data must be stored once with content-hash URLs and loaded through an explicit shared material/texture owner, not assumed to be shared by separate parser caches. Separate GLBLoader plugin or an authored library adapter must preserve map/normalColorSpace/sampler/flipY/normalScale/metalness/roughness/FrontSide and borrow the same texture references. A stable maize logical URL is requested once for the diorama, and once again as an Assets.model cache hit when completing the full world. The remaining files are fetched/decoded only once at the original crop stage; all40 stages/32 transitions must be validated before original world milestone/compiler/fences.

This partition avoids duplicate geometry payload by replacing full files in the promoted runtime, rather than loading both partition and originals. Package must continue shipping originals while isolated proofs run; a final package recipe can exclude superseded originals only after every models/library/demo/tool reference is audited. Four GLB headers/JSON and any texture manifest add unmeasured metadata, but geometry payload is exactly the current33,014,744 bytes once. Keeping every image once retains7,648,314 bytes of original image payload; no quality/removal shortcut is needed. It shifts most crop work after first presentation without removing it from total readiness. A whole-load speed gain is unknown; more requests may lose time in Tauri serving. This is a structural candidate needing review, not an implementation authorization.

3. **Single full GLB with selective parser dependencies and later continuation.** Leaves40,844,796 download bytes intact but may avoid initial decoding35 states/28 bridges if scene references are selected before parse. It would need a versioned partial/full parser-session cache/owner and meshopt dependency reuse, not post-parse filtering. GLTFLoader.parseAsync currently awaits all referenced scenes. Maintaining pending parser ownership, textures and later material variants is more invasive, and a retained whole binary plus incremental decode raises lifecycle risks. No delivery-byte reduction, no measured decode saving, and no recommendation before the simpler offline partition is reviewed.

## Required proofs before implementation/native measurement

An offline derivation must be reproducible and verify every accessor/index/custom bridge attribute after meshopt decoding bit-for-bit, all40 stage extras and32 bridge identities/pairs, unchanged endpoint/culling/material/UV/normal contracts. Partial maize cardinality must be explicit; original whole-world32 validator must remain an allready gate, not accept any arbitrary subset. Tests must traverse the actual diorama and World load paths: exact logical URLs once, application-cache reuse, all species readiness, rigs/actors unchanged, no scene adoption before complete inputs and no additional renderer.

Ownership must remain one World Assets owner with borrowed source maps; diorama cancellation disposes its private clones/atlas only. Reject any sibling immediately while observing late errors; aborted/mid-decode/replaced owner must dispose arriving geometry/material/image resources once, never publish a partial full-world cache entry. Shared texture disposal must be once even if multiple GLB scenes/materials reference it. Parser plugins cannot retain cancelled Worlds or hide loader failures.

Real weighted progress must include actual new runtime manifest sizes, shared texture requests once, all remainder downloads/decoding/crop readiness, and application-cache hits only when fulfilled with the required content. LoadingProgress.confirmReady still requires every original milestone and pending transfer0. Do not move cached maize bytes into a fake completed full GLB, subtract real work, animate artificial percentages, or count overlapping download intervals twice. The16000-ms work estimate and stage weights need recalibration from actual measured complete worlds if a partition is ever accepted; byte savings do not justify invented timing weights.

Native proof would separately inspect first presentation, original90-second New/Continue readiness, planting/camera/cleanup and actual first-frame variants. Original crop/material/shadow/depth/fence recipes stay intact. All prior compiler union/window, resource overlap, no-compression and current serial-chain negative remain limitations. No native run, production mutation, new GLB, quality change or promotion is authorized by this audit.
