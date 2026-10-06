# Remaining village colour atlas pilots

Actual Tinify pilots from the original distributed colour atlases for Mapungubwe, Saheliana and Etíope. Current main reference: cee494f. Refreshed inventory and preflight confirmed static colour roles, eight-bit inputs, no ICC/orientation changes and no data-map role before uploading. Credentials and private provider response URLs are not included.

| Culture | Original bytes | Candidate bytes | Reduction |
| --- | ---: | ---: | ---: |
| Mapungubwe | 1,279,936 | 569,668 | 710,268 |
| Saheliana | 1,113,038 | 471,512 | 641,526 |
| Etíope | 1,296,332 | 557,760 | 738,572 |

Total candidate encoded reduction: 2,090,366 bytes. All three retain 2048×2048 dimensions and opaque alpha with zero alpha differences. See each report for hash provenance and decoded RGB error. These are lossy colour candidates, not pixel-identical replacements.

The refreshed preflight is retained in `preflight.json`: 82 distributed independent colour images eligible for pilots, 45 requiring review and 35 runtime variants already integrated. The distributed inventory has no unclassified image roles. Eligibility is not visual acceptance or a compression result.

The candidate files are kept here for review and excluded from the game package. No runtime manifest entries or asset references have changed. Next acceptance: genuine source/candidate fixed-camera building comparisons in day and night, using canonical image URLs rather than aliased source requests. Check authored texture details and seams before integrating. Subsequent build/package checks must prove the originals are excluded and candidates loaded through relative asset resolution. These measurements do not prove GPU/RAM/FPS gains or mobile/Tauri acceptance.

Fifty-three directed cache, colour-policy, decoded-pixel and runtime-image regression tests pass. Original and candidate file hashes were independently checked against all three reports before archiving.
