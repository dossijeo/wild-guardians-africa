# Remaining village colour atlases: pilots and integration

Actual Tinify pilots from the original distributed colour atlases for Mapungubwe, Saheliana and Etíope. Current main reference: cee494f. Refreshed inventory and preflight confirmed static colour roles, eight-bit inputs, no ICC/orientation changes and no data-map role before uploading. Credentials and private provider response URLs are not included.

| Culture | Original bytes | Candidate bytes | Reduction |
| --- | ---: | ---: | ---: |
| Mapungubwe | 1,279,936 | 569,668 | 710,268 |
| Saheliana | 1,113,038 | 471,512 | 641,526 |
| Etíope | 1,296,332 | 557,760 | 738,572 |

Total candidate encoded reduction: 2,090,366 bytes. All three retain 2048×2048 dimensions and opaque alpha with zero alpha differences. See each report for hash provenance and decoded RGB error. These are lossy colour candidates, not pixel-identical replacements.

The refreshed preflight is retained in `preflight.json`: 82 distributed independent colour images eligible for pilots, 45 requiring review and 35 runtime variants already integrated. The distributed inventory has no unclassified image roles. Eligibility is not visual acceptance or a compression result.

At the pilot stage, the candidate files were kept here for review and excluded from the game package, without changing runtime references. Native acceptance below is the subsequent step; the original pilot reports retain their historical `acceptedForRuntime:false` field. These measurements do not prove GPU/RAM/FPS gains or mobile/Tauri acceptance.

Fifty-three directed cache, colour-policy, decoded-pixel and runtime-image regression tests pass. Original and candidate file hashes were independently checked against all three reports before archiving.

## Native acceptance and deployment

CUA Browser 2, actual african-toon cases 1/4/5 with explicit `village-pilot=1`, Sabana seed 712 and media quality. Twelve day/night screenshots compare a close authored building unit with a fixed camera per pair. The QA comparator loads canonical originals directly, checks the pilot report against the active source atlas and keeps all texture sampler settings. Each culture's native-proof.json records distinct original/candidate URLs and one shared village material. The screenshots were converted to lossless WebP and their decoded RGBA bytes checked identical to the browser PNGs.

Visual inspection found preserved colours, motifs and silhouettes without an evident new seam or alpha defect. This covers the captured building views, not every face of every asset or every device. Final console error capture is empty. The new QA pilot mode supports review before runtime replacement; ordinary integrated comparisons still use the runtime manifest.

All three candidates are now copied to hash-named public runtime images and registered in the shared image manifest. Originals remain in Git and are excluded from distribution. Fifty-six directed tests and build pass. Web package: 641 files, 382,806,458 bytes, 859 relative links and twenty runtime GLBs. Against the previous 384,893,021-byte package, net reduction is 2,086,563 bytes after manifest/bundle overhead. Runtime resolution remains 2048×2048, so this encoded saving does not reduce decoded texture memory or establish a frametime improvement. Wider biome/device acceptance remains pending.
