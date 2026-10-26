# New tree atlas bake and generative pilot

2026-10-26. Branch: codex/global-visual-lab. No main merge.

The user approved retaining distant impostors following the controlled Manglares
comparison and requested a second, image-generated refinement of real-model bakes.

## Raster reference

Forty day/night atlases were rendered from the twenty approved LOD0 tree models
of Sabana, Gran Río, Manglares, Desierto and Volcanes. Gran Cañón is unchanged.
Each atlas contains eight camera angles by eight world rotations, preserving the
fixed native sun, AfricanToon shader and approved common visual profile.
Source cells are 512 px; the first candidate uses 256 px cells after a linear-light,
premultiplied-alpha box filter. Three filtering tests pass. All forty bakes report
zero shader/page/WebGL errors. This does not alone prove in-game visual equivalence.

Reproduce with `tools/experiments/bake-approved-tree-atlas.mjs` and
`WG_ATLAS_BIOME`, `WG_ATLAS_SLOT`; stage with
`node tools/experiments/stage-approved-tree-atlases.mjs`.
The staging script checks day/night frames and keeps Canyon metadata unchanged.
The QA harness accepts `WG_NEW_ATLASES=1` to load the staged manifest and adapt
cell sampling to each species' resolution. Production is not switched by this flag.

The 40 lossless WebP candidates total 74,357,394 bytes. At 256 px per cell, eight
RGBA8 atlases for one four-species biome require about 170.7 MiB including mipmaps,
versus about 42.7 MiB at 128 px. These are storage estimates, not measured driver
allocations. Source supersampling need not imply increasing runtime resolution.
Do not activate the higher-resolution set without evaluating that tradeoff.

## Image generation pilot

Built-in image_gen edited `mangrove-0/day.png`, saved non-destructively as
`mangrove-0/day-imagegen-candidate.png`. No API/CLI fallback was used.
Prompt: preserve the exact 8x8 grid, positions, scales, root baseline, directions,
silhouettes and per-cell fixed-sun lighting; refine only leaf/bark finish in the
same stylized African fantasy aesthetic; transparent background, antialiased
edges, no new objects, ground, glow, labels or borders.

The result is more illustrated but visibly changes roots, crowns and lighting.
After scaling only for measurement, binary alpha intersection-over-union is
0.888532; 169,155 pixels appear outside the reference mask and 20,364 disappear.
This metric is not a perceptual quality verdict. It demonstrates that the result
is not a geometry-preserving replacement. It remains an experimental candidate,
not a production atlas. Day/night consistency and angular transitions are not
validated for this generated version. Do not mass-generate replacements on the
assumption that a prettier individual sprite is automatically a better impostor.

The 128px runtime variant is also generated: 26,092,358 bytes for the 40 atlases,
with the same RGBA8 allocation dimensions as the current production set. Reproduce
with `node tools/experiments/stage-supersampled-128-atlases.mjs` after staging 256.
Day at 256 and night at 128 have run through the actual game without reported
page/WebGL errors, but visual inspection found magenta edge artifacts absent from
the source atlases. This is an unresolved integration gate, not a passing visual
validation. The QA-only `WG_ATLAS_HTML=1` isolates worker bitmap decoding from the
ordinary texture loader. No production asset has been replaced.

Follow-up: the HTML texture loader shows the same colored regions; hiding all
impostor meshes also leaves them visible (`game-mangrove-isolate/without-impostors.png`).
Therefore these regions cannot yet be attributed to atlas pixels or decoding.
Keep the observation open; do not claim the new atlas itself is corrupt.

The user selected the earlier all-3D comparison image as the best-looking result.
Use `impostor-3d-matched/1-1/normal.png` as the visual reference. It is the new
native models with LOD, not the generated-image candidate.

Next gates: resolve the color artifacts, inspect real-game day/night transitions, evaluate 128px supersampled
runtime output versus 256px, validate all five changed biomes and package sources
reproducibly before activating the new atlas set. Keep original Canyon atlases.
