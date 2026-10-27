# H ceramic trial: not adopted

F remains the runtime variant. This trial tests another material after the rejected G masonry/filtering pass: the two ochre vessels beside the workshop entrance. The savanna mockup (`1-13511.jpg`) supports distinct, readable low-poly material blocks at ordinary game distance, but does not provide detailed ceramic decoration to invent. The goal was quieter fired clay, not additional cultural symbols or fabricated relief.

## Authoring and result

Blender paints explicit existing left/right vessel selections (129/223 faces), preserving the dark mouths, silhouette, geometry, normals and all E/F UVs. It places a broad asymmetric firing wash near the base, a restrained shoulder wash and a small clay-lip accent. Original pigment contributes 10%; there is no global sharpen, random noise, added normal texture or new pattern. `workshop-ceramics.blend` contains the selected faces and packed 2048 x 2048 texture.

The close pottery view loses the original blurry patches, but the replacement reads too smooth and uniform. The subtle firing variation does not convincingly establish a better clay surface. At medium distance the change is barely useful; at night it becomes a simpler dark silhouette rather than a clearer material. This does not satisfy the requirement to adopt only a clear improvement. **Do not replace F with H.** This is a negative result, not finished art.

The earlier shared-atlas pottery study had already exposed the flat-colour risk. H isolates pottery from that repacking regression and retains the complete F atlas density; the weak result therefore cannot be blamed on lower density from a shared repack. A normal map would add cost without addressing the missing authored surface definition, so none was added merely to make the trial more complex.

## Comparison and costs

`baseline/` and `trial/` contain 16 real Chrome WebGL screenshots with identical camera/target values, 1280 x 720 and day/night times 150/350. Views are pottery close-up, facade, medium and neighbour. The baseline is F; the trial uses F with only its colour request intercepted by the capture harness. `textureOverride` records that substitution. Medium shows the scene; the other views isolate a unit diagnostically.

The neighbour is pixel-identical at night. The day control differs at 20 pixels in the top background/UI area (x 10–1038, y 31–86), mean channel delta 0.000479/255. Do not describe that image as pixel-identical. Runtime neighbour resource/geometry invariants still pass, and no neighbour texture was edited.

H WebP is 709,038 bytes, 412 more than F. With the reused 429,056-byte E geometry it would add 1,138,094 file bytes versus original A. Estimated RGBA8 mipmapped allocation remains 21.33 MiB above A and unchanged from F. There is no new material, geometry or normal texture. CPU/GPU timings and draw calls were not benchmarked: the visual result does not warrant adoption and the parent is profiling the engine. `rejection-metrics.json` records the comparison and costs.

Six invariant tests and capture-script syntax check pass. Runtime code/assets were not changed; the prior F build remains applicable. The trial texture exists only in this evidence folder and is not shipped through a new runtime flag.

## Reproduce

Run Blender headless with `tools/experiments/blender-paint-workshop-ceramics.py`; encode the generated PNG as WebP quality 95, effort 6 in this folder. Use `capture-workshop-finish.mjs` with `WG_ART_VARIANTS=village-details`, `WG_ART_VIEWS=pottery,facade,medium,neighbor-close`. For baseline omit `WG_ART_TEXTURE_OVERRIDE`; for trial set it to this folder's `mapu-0-color-ceramics.webp`. Set `WG_ART_OUTPUT` to the corresponding baseline/trial directory. The new pottery camera is diagnostic and is not substituted for the medium-distance comparison.
