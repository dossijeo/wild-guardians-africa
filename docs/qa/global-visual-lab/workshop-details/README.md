# Workshop details: F, selective and still partial

Flag `village-details` reuses the exact E (`village-surface`) geometry and UVs with a new 2048 x 2048 texture. C/D/E remain available. This is a Blender-authored experimental checkpoint, not a finished building or an integration recommendation.

## Visual assessment

F restores the rear painted door's existing cream sun and irregular red/cream lower border, the two rear sun panels, front/rear lower friezes and selected porch joinery. The bench, upright supports and stacked wooden objects now separate into readable wood surfaces. Rear stone fields are quieter, matching E's front panels. Original motif landmarks were traced from the rectified source; no replacement symbols, new relief or random grain were introduced.

The close rear and porch views show the largest gain. At normal medium distance the benefit is more modest: material blocks read clearly, but the small decorations approach the pixel limit. Night retains the material hierarchy with less visible fine detail. F does not repaint either arch, so their existing E paint follows the same selected relief edges and inherits E's uneven apparent corner width. It does not solve all aliasing.

Several weaknesses remain visible and prevent calling this finished: rear sun rays and lower friezes have stair-stepped edges, narrow transitions beside the rear door retain old colour, and side facets of the masonry, steps, pottery and portions of the awning attachment still look soft. Quiet repainted panels next to those mottled side facets remain inconsistent. The rear decorations retain the original fragmented UV allocation; geometric paint placement alone cannot increase their texel density. Another dedicated chart would require reallocating workshop space and a fresh quality comparison. No neighbour atlas is reduced to pay for it.

## Authoring and rejected attempts

`blender-paint-workshop-details.py` records explicit face selections and world-space masks. The packed Blender file contains the full E mesh, selected material groups and final texture. `audit-workshop-rear-paint.py` provides the original rectified reference; `probe-workshop-porch.mjs` records real WebGL surface hits. Paint uses hand-placed motif landmarks and restrained directional wood strokes, not a whole-image sharpen or noise filter. All 7,992 triangles and 10,411 attribute vertices are unchanged from E; every position, normal and UV is identical.

Two failed first passes are preserved:

- `rejected-rear-face-overpaint.png`: selecting rear wood by triangle centres painted large brown triangles across the orange facade. Corrected with spatial masks around the actual frame and lintel.
- `rejected-frieze-on-pottery.png`: the low decorative-band selection reached the pots. Their explicit face sets are now excluded. The initially too-thick cream band and overly golden porch wood were also reduced.

The final rear view still exposes small transition facets; the masking correction is not a claim that every adjacent surface has been restored.

## Comparison and cost

`detail-captures.json` records C/D/E/F with matching camera positions and target, times 150/350, and 1280 x 720 Chrome WebGL captures: facade, rear, awning, medium and neighbour. Medium shows the scene; the other views isolate a unit diagnostically. These are game-renderer fixtures, not campaign evidence. Compare matching view/time filenames. `resource-and-neighbour-check.json` records file costs and pixel comparisons.

F loads the existing 429,056-byte E replacement geometry plus 708,626 colour bytes: 1,137,682 extra asset bytes versus original A, 4,048 fewer than E. This is uncompressed file accounting, not measured HTTP transfer. Like C/D/E it still adds one workshop atlas/material while the culture atlas remains needed by neighbours. Estimated extra RGBA8 mipmapped allocation is 21.33 MiB. F adds no geometry buffer or material relative to E; no reduction in draw calls is claimed. The rejected shared-atlas experiment remains rejected because it degraded neighbours.

CPU/GPU timings and measured draw calls were deliberately not rerun while the parent profiled the engine. Structural accounting is not a substitute for coordinated runtime measurements. Six targeted invariant tests and production build pass; existing chunk/import warnings remain. Original asset hashes and all neighbour geometry/texture references are protected by tests.

## Reproduce

1. Run Blender headless with `tools/experiments/blender-paint-workshop-details.py` against the committed E texture/binary.
2. Encode the output `mapu-0-color-details.png` using Sharp WebP quality 95, effort 6 into `public/assets/visual-lab/mapu-0-color-details.webp`.
3. Set `WG_ART_OUTPUT=docs/qa/global-visual-lab/workshop-details`, `WG_ART_VARIANTS=village-art,village-finish,village-surface,village-details`, `WG_ART_VIEWS=rear,awning,facade,medium,neighbor-close`; run `tools/experiments/capture-workshop-finish.mjs` against Vite port 5189.
4. Run `node --test tests/village-art-variant.test.js` and `npm run build`.

Keep this prototype isolated. The useful result is selective material clarity with unchanged geometry and neighbours; the unresolved costs are the extra atlas and remaining surface inconsistency. Do not generalize it to the other buildings yet.
