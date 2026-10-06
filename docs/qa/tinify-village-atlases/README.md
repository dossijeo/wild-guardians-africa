# Suajili and Musgum village color atlases

Two actual Tinify color pilots accepted after native fixed-camera comparisons. Source originals remain in the repository; the shared image runtime manifest changes their deployed color paths only. Geometry, UVs, shaders, normal/data maps and sampler settings are unchanged.

| Culture | Original bytes | Runtime bytes | Saved bytes |
| --- | ---: | ---: | ---: |
| Suajili | 1,434,532 | 670,632 | 763,900 |
| Musgum | 1,316,700 | 572,968 | 743,732 |

Total encoded reduction: 1,507,632 bytes. Both retain 2048x2048, opaque alpha, no ICC/orientation transformation. Source RGB mean absolute differences are 3.7967 and 3.7185 / 255; originals are not pixel-identical to lossy candidates. Pilot report acceptedForRuntime:false records the historical API step; this review is the subsequent acceptance.

## Native evidence

CUA Browser 2 on african-toon cases 2 and 3, Sabana / seed 712, media. For each culture, Ver pieza de poblado moves to a close authored unit. Day and night original/candidate pairs keep the camera fixed. Eight lossless WebP screenshots preserve the captured PNG pixels. Review of the pairs shows preserved building color, silhouette and authored texture detail at this close distance, without a visible new seam or alpha defect. native-proof.json records the actual source and runtime image URLs and one shared village material; the comparator loads source bytes directly via TextureLoader and explicitly rejects equal paths. It does not fetch an aliased catalog as proof of originals. The status field is the fixture diagnostic text, not a substitute for the screenshot/canonical URL evidence.

42 directed image runtime/color-policy tests pass. Build passes (existing bundle size warning). Web package passes: 587 files, 377,313,163 bytes, 859 relative links and 20 runtime GLBs; previous wall batch was 378,818,303 bytes, giving 1,505,140 bytes net package reduction after manifest overhead. Encoded/download/package savings only: unchanged resolution does not reduce decoded GPU memory or prove FPS improvement. Mobile physical acceptance and remaining culture atlases are still pending.
