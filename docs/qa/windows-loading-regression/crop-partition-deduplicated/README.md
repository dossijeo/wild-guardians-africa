# Deduplicated crop collection integration candidate

This is a candidate on the historical observation branch, not a production promotion or a new native result. The official trial of `4b110818` remains archived separately in `partition-4b-38014169890`: primary readiness and genuine minimization passed, but its screenshot contains no crops. Those results do not validate this changed package or establish a causal speed improvement.

## Published resource contract

The Cultivos catalog now names the published partition manifest with `#steady`, and bridge metadata names that same manifest with `#bridges`. The corresponding explicit collection fields distinguish these resources from physical GLBs. `Assets.model` resolves either collection through the same lazily created `Assets.getCropPartition` singleton, including consumers without App initialization. Historical authored/compressed crop aliases also resolve to the declared collection; they never request a missing full GLB. The native model preflight instead reads the actual runtime geometry manifest: 20 other GLBs and four crop GLBs, all physically published and decoded by the existing preflight.

The transition prepares five maize states and four bridges. World completes the remaining 35 states and 28 bridges through that owner, retaining all 40/32 gates. Physical partition promises and canonical texture objects are reused; matching image URI alone is not counted as decode reuse. Per-material map/normal color spaces, sampler settings and independent references are checked. Cache failures permit explicit retry, cancellation rejects adoption, late resources are disposed once, and Assets owns borrowed source resources until its own disposal.

Expected sizes cover the manifest, four partitions and six images before the first request, with resolved URLs under both nested CDN/itch hosting and Tauri. Real transfer/cache accounting remains in the existing owner; no timer or estimated cache claim replaces a request.

## Package and offline provenance

All eleven published partition files are unchanged from the reviewed trial. Four GLBs total 33,198,180 bytes; six shared image payloads total 7,648,314 bytes; the manifest is 2,313 bytes. This replaces the two full runtime crop GLBs totaling 40,844,796 bytes with 40,848,807 bytes: **4,011 additional bytes**, rather than an additional full copy.

Original authored and compressed full GLBs remain in source with their historical hashes, alongside unchanged `crops-v4.json`, `web-assets.json` and verification provenance. The deterministic generator reads these authored records directly, independent of the new public catalog URLs. Build exclusion removes only the exact retired full crop source/runtime paths from dist. CPU reference geometry/morph tests explicitly select the authored originals; generic runtime tests select the published collections.

The rejected wall-package experiment is also excluded from publication by its exact manifest URL, 5,135,464-byte length and SHA256. It remains reproducible in source/dev. Public catalogs do not reference it. Its ordinary selection remains OFF, and explicit selection in a production bundle raises an explanatory error before fetching. This is not activation of another recipe.

The official baseline ZIP inventory and complete per-route comparison are in `package-diff.json`. The baseline is 711 files/445,254,165 bytes; this candidate is 720 files/445,336,440 bytes, **+82,275 bytes**. The remaining difference includes historical diagnostic bundle code and source differences on this branch; it is not all crop payload. No new ZIP was produced or compared by compressed size. This branch still predates main's library, center-repair and subsequent changes; the candidate must be extracted or reconciled against current main without replacing those unrelated files.

## Consumer audit and CPU evidence

| Consumer | Contract exercised |
|---|---|
| App transition and World | One Assets owner, maize first, remainder later, original warm/readiness stages |
| Standalone LoadingDiorama | Real prepare resolves maize from catalog without App; World reuses physical requests |
| Generic World.load New/save | Actual World.load and native Assets/GLTF/Meshopt, unrelated rendering collaborators doubled; all 40/32 before warm |
| loadCropBridges / reload / bound / ceiling browser fixtures | Explicit collection through their existing Assets.model path |
| Offline crop-native-reload and verify_crops_lab_v4 | Authored originals retained; every species/morph and resize invariants |
| Native model preflight | Actual 24 physical GLBs, same original decode loop and readiness gate |
| Package references | Published manifest fragments checked against the actual manifest file; all payload hashes/bytes checked |

The combined suite passes **84/84**, including real meshopt partition equality, canonical ownership/cancellation, native accessor/morph reference tests, public/default hosting, World.load New/save and package guard tests. The authored V4 verifier passes 8 species/5 states/32 bridges and resize65/128. Changed-file syntax passes 20 files. JSON-module experimental and existing large-chunk build warnings remain explicit. These are CPU tests, not native image/raster acceptance.

## Source boundary and remaining native QA

The candidate is based on `4b110818` plus the original archive commit `4d22277d`. Main/World/compiler/budget/warm/fence/shader behavior is not changed by this integration patch; workflow/Rust gates remain 90/300000/900000. The effective collection default is ON only in this candidate branch; production main has not been changed. Other experimental recipes remain OFF. `loadingRecipe` distinguishes effective partition use from the requested legacy CLI flag.

Root's current main changes must be retained during final extraction: library/native menu, browser persistence fixes, center navigation/repair, economic rules and the cached-decoding-failure accounting fix. The receipt records the full historical branch difference and a narrow integration selection; no full-file replacement of unrelated main/scene/menu is proposed.

Before promotion, native QA must inspect the actual day/night diorama with four maize plants and a planted fifth, the preserved interface and lighting, and visible crops across species/stages/morphs with real images and canonical texture binding. Continue/New, cancellation, exact current camera restoration and cleanup must run on the deduplicated production package. Existing trial readiness success is not substituted for these checks. No new dispatch, local GPU run, PR or promotion is authorized by this freeze.
