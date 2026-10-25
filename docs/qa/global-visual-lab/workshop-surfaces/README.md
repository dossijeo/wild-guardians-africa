# Workshop surfaces: E, experimental and partial

Flag `village-surface` adds a selective stone/cloth pass and an unfolded rear arch to D (`village-finish`). C (`village-art`) and D remain available unchanged. All variants use a 2048 x 2048 exclusive workshop texture. Default rendering and all nine neighbouring units are unchanged. No shared repack is used and nothing is integrated into main.

## Visual result

The rear zigzag is clearly more legible in the real WebGL rear and awning views, day/night. The front sun panels have quieter stone fields: the diffuse blotches around the emblem no longer compete with the restored rays. This is an intentional simplification of the mineral colour, not recovered high-frequency stone detail. The cloth keeps its red/cream stripes, with cleaner boundaries and a small selected hem extension. At medium distance the two arch bands and material separation read more coherently.

The result is still **not a finished building**. The rear decorated door, rear sun panels and lower decorative friezes retain their original blur; so do crates, bench/support pieces and some porch wood. Geometry makes the line corners and apparent band width uneven. A few transition facets beside the rear band are more conspicuous than ideal, especially in the awning view. The stone has become quite quiet/flat relative to those older areas; a final stylistic pass must make the complete unit consistent. Do not generalize to other models or integrate as finished art.

## Authored selections and identity

`blender-paint-workshop-surfaces.py` records 521 front stone-panel faces, 128 existing cloth-top faces and 9 hem faces. The sun discs and each of the eight existing rays have explicit spatial protection masks; the original lower zigzag frieze is also protected. Stone uses two broad mineral washes, without random noise, sharpening or new joints. Cloth stripe positions follow the previous authored pattern and receive a narrow antialias transition. The hem selection expands through shared cloth edges and then filters position/pigment so it does not paint neighbouring wood.

`audit-workshop-rear.py` and `trace-workshop-rear.py` record 555 rear-band faces and author-selected motif landmarks. The line follows existing mesh edges, including shallow folds; boundary costs are a routing proxy, not a guaranteed sharp dihedral. Blender unfolds the rear relief instead of flattening it cylindrically. Paint uses three-dimensional distance to the chosen edges, with twice-resolution sampling before the final atlas. No geometry, silhouette, normals or rig changed. Rear door and sun decorations were not repainted or replaced.

The front arch and sun charts keep their exact D UVs. Space for the rear band comes only from compacting the 77 faces of the quiet front orange-clay chart: its new rectangle is 1280 x 68 texels; the rear band uses 1280 x 144. The orange chart is sampled from D and receives padding around its actual triangle boundary. No broad whole-atlas rescaling occurs. Other workshop UVs remain byte-exact to D, verified per indexed corner.

## Captures and rejected attempts

`detail-captures.json` contains C/D/E fixed camera poses and times (150 day, 350 night) for facade, awning, rear, medium and neighbour views. Medium is the full scene; the other views isolate the target diagnostically. These are actual Chrome WebGL WorldScene renders at 1280 x 720, media quality, not legal campaign screenshots. Compare matching filenames; do not compare different cameras as evidence of quality.

Three rejected captures remain as evidence:

- `rejected-hem-overselection.png`: an initial 77-face hem expansion also painted nearby wooden caps. Restricted to 9 faces.
- `rejected-rear-roof-selection.png`: broad rear selection reached large roof triangles. Removed 16 crossing faces and preserved source roof pigment outside the physical trim.
- `rejected-clay-chart-padding.png`: missing padding around the compact orange chart produced dark edging. Fixed with eight texels of dilation around the actual chart silhouette.

## Cost and checks

E loads 429,056 replacement geometry bytes and 712,674 colour bytes: 1,141,730 extra file bytes versus A, 17,684 more than D. It has 10,411 attribute vertices (+56 versus D), 7,992 unchanged triangles and the same one extra atlas/material as C/D. Estimated texture allocation remains +21.33 MiB versus A (RGBA8 with full mips); vertex storage increases 1,792 bytes. These are allocation/file-size figures, not GPU memory or compressed HTTP-transfer telemetry.

No CPU/GPU benchmark was run while the parent profiled the engine. No timing improvement or new measured draw-call result is claimed. The render structure retains the same material/triangle counts; timing requires a later coordinated isolated run.

Five targeted tests pass: original hashes, C geometry, shared-experiment resource accounting, D invariants, and E exact source positions/normals plus untouched neighbour buffers/textures and unrelated UV charts. Production build passes with existing chunk/import warnings. `resource-and-neighbour-check.json` also records the matched neighbour pixel comparison.

## Reproduce

1. Blender background: `tools/experiments/blender-paint-workshop-surfaces.py` (reads committed D paint/binary).
2. Python: `tools/experiments/audit-workshop-rear.py`, then `trace-workshop-rear.py`.
3. Blender background: `tools/experiments/blender-unwrap-workshop-rear.py`.
4. Encode `mapu-0-color-rear.png` as `public/assets/visual-lab/mapu-0-color-surface.webp` with Sharp WebP quality 95, effort 6.
5. Set `WG_ART_OUTPUT=docs/qa/global-visual-lab/workshop-surfaces`, `WG_ART_VARIANTS=village-art,village-finish,village-surface`, `WG_ART_VIEWS=facade,awning,rear,medium,neighbor-close`; run `capture-workshop-finish.mjs` against Vite port 5189. This tool captures visuals only and never invokes the benchmark.

`workshop-surfaces.blend` stores the explicit paint selections; `rear-unwrap.blend` contains the final full mesh, UV and packed texture. Original assets are never overwritten.
