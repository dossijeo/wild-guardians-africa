# Shared workshop atlas: measured experiment, not integration candidate

The `village-shared-art` flag replaces the entire Mapungubwe buffer and colour atlas with one shared 2048 x 2048 texture. It does not fetch the original pair as well. Default rendering is unchanged. Source metadata, geometry and colour hashes remain intact. All 88,419 triangle corners retain exact source positions and normals; UV seams add 211 vertices (6,752 bytes). One material and interleaved buffer serve all ten units.

## Decision

**Do not integrate this shared repack.** It demonstrates the resource saving but visibly damages neighbouring buildings at close range. The workshop roof and measured arch pattern remain more readable than A; the accessory pass is partial, with blurred inherited areas and inconsistent sharpness. The building is not a finished artistic restoration. Keep C as the stronger workshop comparison, with its known extra-atlas cost. Do not generalize this painting pipeline to more buildings yet.

The second representative building, mapu-2, was checked without repainting at close and medium views, day/night: compare `0-neighbor-*` with `village-shared-art-neighbor-*`. Repacking reduces its density from 36.73 to 28.59 px/m; all nine neighbours lose 22.2%. Facet boundaries and soft paint are more conspicuous, particularly on the arch and plinth. This is a resampling/UV allocation regression, not changed geometry. At gameplay distance it is less obvious, but that does not excuse the close-view loss.

## Art and preservation

Blender headless uses explicit face selections for cloth (128 faces), curved wooden lintel (46), left/right containers (129/223), plinth pigment (141) and doorstep (32). The other 7,293 faces are protected. Cloth follows existing red/cream stripes; wood has selected grain strokes, pottery retains the mouth and inherited shading, and the plinth retains its original pigment mask. The first flat golden pottery attempt was rejected (`rejected-flat-pottery-facade.png`). `accessory-audit.json` records face selections; `workshop-accessories.blend` is the editable authoring scene.

The white arch design still follows measured relief edges; no geometry or invented normal relief was added. See `village-shared-art-facade-day.png` and night. Reduced packing density softens the line edges, and the close image still has uneven apparent width. Orange clay is intentionally broad and quiet; inherited roof-side/porch/door areas remain softer. This pass does not meet the requested whole-building finish.

## Cost and performance

A uses 5,985,956 bytes for original colour + binary. C adds 1,103,396 bytes and a 2048 squared texture (21.33 MiB estimated RGBA8 with full mip chain), plus its replacement geometry. S uses 6,104,962 bytes: +119,006 versus A, -984,390 versus C. This is file/download payload size, not measured compressed HTTP transfer. S removes the additional texture/material; renderer texture counts match A (81 in medium day, 82 in the other views), versus C +1. Scene material counts are 205 for A/S and 206 for C. GPU memory is an allocation estimate, not hardware telemetry.

Hardware Chrome WebGL2, 1280 x 720, media quality, same fixed camera/time, 30 warmup and 180 sampled frames per view. Run order A/C/S/S/C/A after the other agent released the host. Two repetitions per condition; no campaign or test suite was running. Raw records and camera poses are in `capture-report.json`; final screenshots are the second repetition. No browser errors. No defensible CPU/GPU speedup emerges from this short run; draw calls and triangles are identical (62/580,971 medium, 65/669,724 close).

| Variant | View | Light | CPU ms | GPU ms | Draw calls |
|---|---|---|---:|---:|---:|
| 0 | medium | day | 5.81 | 14.22 | 62 |
| 0 | medium | night | 5.43 | 15.15 | 62 |
| 0 | close | day | 5.28 | 14.89 | 65 |
| 0 | close | night | 4.76 | 15.34 | 65 |
| village-art | medium | day | 5.90 | 14.00 | 62 |
| village-art | medium | night | 5.34 | 14.59 | 62 |
| village-art | close | day | 5.06 | 14.80 | 65 |
| village-art | close | night | 5.02 | 15.30 | 65 |
| village-shared-art | medium | day | 5.69 | 14.07 | 62 |
| village-shared-art | medium | night | 5.19 | 13.99 | 62 |
| village-shared-art | close | day | 5.24 | 15.03 | 65 |
| village-shared-art | close | night | 5.21 | 14.57 | 65 |

## Rejected alternatives and next constraint

The first Blender pack with scaled margins collapsed density to about 8 px/m (`rejected-scaled-margin.json`). Fractional margins fixed packing efficiency but not the sharing tradeoff (`pack-audit.json`): workshop density is 29.14 px/m, versus A 27.59 and roughly 57 in isolated C.

A read-only free-space audit keeps all other units and protected workshop triangles at their original UVs, excluding arch/solar faces and adding a two-pixel occupancy margin. 76.15% remains occupied. There is no free 64 squared rectangle. A deterministic top-left greedy search places seven 48 squared charts, or eighteen 40 squared charts (only 32 squared usable with four-pixel padding). This is a feasibility bound for this search, not proof of an optimal packing impossibility. No tiny-chart variant was implemented or visually validated: the proposed 16 arch sections + 2 complete solar pillars would sharply reduce motif resolution and reintroduce seams. It was discarded before further authoring cost.

A credible next approach needs authored shared material regions and deliberate UV reuse across the culture, preserving decorative panels at adequate density. That is a broader UV redesign, not a free atlas optimization. Do not infer that generative sharpening or global grain would resolve it.

## Reproduction and checks

Run Blender background with `tools/experiments/blender-paint-workshop-accessories.py`, then `blender-pack-shared-workshop.py`; run `rasterize-shared-workshop.py` and encode its PNG with Sharp WebP quality 95 / effort 6. Capture via `WG_ART_OUTPUT=docs/qa/global-visual-lab/workshop-shared` and `WG_ART_VARIANTS=0,village-art,village-shared-art,village-shared-art,village-art,0` using `capture-workshop-art.mjs` against Vite port 5189. `capture-shared-details.mjs` captures cloth and neighbouring unit; `inspect-workshop-surfaces.mjs` captures the isolated frontal diagnostic. These are real WorldScene WebGL fixtures, not legal campaign scenes. Do not equate the diagnostic isolated views with normal gameplay composition.

Checks: targeted village-art tests verify source hashes, exact geometry/normal preservation, UV bounds, draw ranges and shared-resource loading. Production build checked. See `biome-review.md` for independent visual priorities; no biome materials were changed in this checkpoint.
