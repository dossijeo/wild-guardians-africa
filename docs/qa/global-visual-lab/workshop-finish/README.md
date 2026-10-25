# Exclusive workshop finish: D, still partial

`visualLab=village-finish` returns to the exclusive 2048 x 2048 workshop atlas. The failed shared repack is not used. Nine neighbouring units retain their exact original binary views, UVs and colour texture. A remains baseline, C is `village-art`, D is this flag. Default production rendering is unchanged.

## What improved

The gable timber (93 explicitly selected faces) now reads as wood rather than diffuse reddish blotches. Existing porch poles (481 selected faces) have quieter dark timber pigment and directionally placed growth marks. The selective cloth, pottery, step and plinth pass from the previous checkpoint is carried over without reducing workshop density. The roof remains terracotta tile; the porch cover remains red/cream cloth, not straw. Existing solar motifs and the orange clay face are preserved from C.

The 602 arch faces were welded only in the authoring mesh and unfolded with Blender Angle Based UV. Their natural UV aspect is about 0.127:1 and fits the existing reserved strip. No other charts were reduced. The runtime mesh retains 10,355 attribute vertices and 7,992 triangles, with exact source positions/normals per indexed corner. UVs change only on the arch. There are zero degenerate UV triangles in the new arch chart.

Paint is evaluated as distance to selected existing three-dimensional mesh edges on each triangle, then sampled at twice the strip resolution before reduction to the final 2048 atlas. Lines use a 0.0288 m nominal full width and a quieter warm ivory. This avoids treating the relief as a flat cylindrical projection.

The side view exposed an additional problem in C: the old geometric filter omitted short connectors and selected multiple parallel edges. Hand-set landmarks following the original zigzag guide the new continuous edge route. The two border-edge sets remain the previously measured ones. The route uses shallow folds as well as sharp ones; boundary edges receive a routing cost proxy, not a measured dihedral. Thus `minimumCreaseAngle` is not a full-mesh geometric guarantee. It is incorrect to describe every line as a sharp ridge. The painting follows existing mesh edges, with unchanged silhouette and no fabricated normal map.

## Visual judgement and limits

Compare `0-*`, `village-art-*` and `village-finish-*`, especially **both** facade and awning views. The awning camera catches the opposite side of the arch that the original frontal assessment missed. D has fewer floating/doubled fragments and more continuous zigzag paint; the motif still has irregular corners dictated by the source topology. The border is not an immaculate constant-width graphic at extreme oblique views. Do not describe the entire arch or building as finished.

At the medium full-scene view the cleaner gable, poles and roof give a clearer material hierarchy. At night this remains readable, with no added emissive detail. Close views still expose blurred stone/pigment around the solar panels, the back arch, parts of the cloth hem and support timber, crates and other porch objects. The cloth boundaries remain uneven across the fragmented original charts; the original solar surrounds are much softer than the restored suns. These areas need authored charts/paint before a whole-building finish is credible. No other building has been repainted or generalized.

The straightened projected-line trial is saved as `rejected-projected-arch-awning.png`: a frontal-only review would have missed its lateral fragmentation. A routing trial that insisted on sharp creases took unacceptable detours; another trial through independent intermediate vertices created branches. Neither is the shipped D image. The retained route allows shallow real folds and uses the unchanged border selection. This is a partial improvement, not a claim of perfect reconstruction of the original motif.

## Cost and validation

D loads 427,264 bytes of replacement geometry and 696,782 bytes of colour, 1,124,046 extra bytes versus A. Compared with C this adds only 20,650 file bytes, with the same extra 2048 texture allocation (21.33 MiB estimated RGBA8 plus full mips), material count and triangle count. This keeps neighbour quality by accepting the existing extra-atlas cost; it does not solve that cost. File size is not compressed HTTP transfer telemetry.

No new CPU/GPU benchmark was run while the parent agent profiled the campaign. Previous timing numbers must not be presented as D measurements. Captures use real Chrome WebGL WorldScene fixtures, fixed cameras and times 150/350; medium keeps the full scene, other views isolate the selected unit diagnostically. They are not legal campaign screenshots. The neighbour close comparison is an additional visual check; the automated test proves exact neighbour buffer/texture preservation. The night neighbour screenshot is pixel-identical; the day image differs by only 0.000111 mean channel levels out of 255 (see `neighbour-image-check.json`).

Four targeted tests pass: source hash preservation, C invariants, rejected shared resource accounting, and D's exact source geometry/normal/UV bounds plus untouched neighbours. Production build passes with the existing chunk/import warnings. Original assets and metadata remain untouched.

## Reproduction

1. Existing accessory paint is the input from `../workshop-shared/mapu-0-color-accessories.png`.
2. Run Blender background with `tools/experiments/blender-finish-workshop.py` to paint the selected timber.
3. Run `python tools/experiments/trace-workshop-arch.py` for the authored landmark/edge route.
4. Run Blender background with `tools/experiments/blender-unwrap-workshop-arch.py`. `arch-unwrap.blend` contains the final full mesh, UV and packed paint. `workshop-finish.blend` records the timber selections before the arch change.
5. Encode `mapu-0-color-unwrapped.png` to `public/assets/visual-lab/mapu-0-color-finish.webp` using Sharp WebP quality 95, effort 6.
6. Run `node tools/experiments/capture-workshop-finish.mjs` against Vite port 5189. This script captures visuals only, never invokes the benchmark. `WG_ART_VARIANTS` optionally filters variants and merges their manifests.
