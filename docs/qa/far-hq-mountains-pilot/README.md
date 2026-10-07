# HQ mountain backdrop pilot

The six exports are candidates, not visually accepted replacements. Public
backdrop assets and the normal gameplay profile still use the previous artwork.
Native browser review is in progress. CPU mip checks are not GPU readback proof.

## Reproduction

From the repository root with the locked dependencies installed:

```sh
node tools/prepare_hq_backdrops.mjs .cache/hq-backdrops
node tools/audit_hq_backdrop_mips.mjs .cache/hq-backdrops
node --test tests/hq-backdrop-frame.test.js tests/biome-backdrop.test.js tests/far-vegetation-ownership.test.js
```

`assets-source/far-backdrops-hq/export-contract.json` pins all six source and
export SHA-256 hashes, dimensions, crop and encoder versions: Sharp 0.35.5,
libvips 8.18.7, libwebp 1.6.0. Generation checks every output before writing any
candidate file. The encoder uses lossless WebP effort 6 after a top-only crop
and proportional Lanczos3 reduction. All originals remain preserved.

The 2172Ãƒâ€”724 sources lose only the transparent top 181 rows, producing a
2172Ãƒâ€”543 crop before reduction to 2048Ãƒâ€”512. The original Desert image is
deliberately rejected: its crop would cut 52 pixels at the runtime alpha cutoff.
`desert-v2.png` is an imagegen edit that reframes the peaks without stretching;
its complete prompt is preserved in `desert-v2-edit.json`.

Six lossless exports total 6,040,574 bytes. One active 2048Ãƒâ€”512 RGBA texture
with mipmaps requires approximately 5.33 MiB, the same dimensional allocation
as the existing backdrop. WebP bytes do not measure resident GPU memory.
The QA comparison also loads the original texture, so its additional allocation
must not be attributed to production. There is no separate night texture.

## Cylindrical wrap

The opt-in `backdropMirrored` option maps a cylinder through UV 0..2 using
MirroredRepeatWrapping. Both reflected joins share the same edge texels;
geometry positions, triangle count, shaders and texture sample count are
unchanged. This avoids an arbitrary left/right image mismatch, but does not
establish artistic acceptance: reflected mountains and silhouette tangents
must be inspected during a full rotation. Normal API default remains false.

## Recorded controls and limits

`directed-tests.txt`: 28 tests passed, covering framing, unchanged cylinder
geometry, mirrored UV seams, shader/sample count and owner cancellation.
`cpu-mips.json`: read-only linear box-filter reference through 1Ãƒâ€”1, with zero
visible saturation outliers above 160 RGB range and zero base pixels below
the shader cutoff at every level. Real GPU filtering can differ.

The native harness is `tests/browser/hq-mountain-horizon.html`, with URL
`?biome=sabana` (also gran-rio, manglares, volcanes, gran-canon, desierto).
It compares original/HQ in fixed camera poses, offers day/dusk/night, a 73-pose
360Ã‚Â° rotation and a 20 m lateral parallax step. Export exposes a DOM receipt;
closing disposes the world and the separately borrowed comparison texture.
It renders paused state and uploads QA UV changes, so it is **not** a valid
frametime benchmark. Native six-biome receipts, visual acceptance and a
controlled cost comparison are still pending.

## Native Sabana result: reflected panorama rejected

Root reviewed the fixed-eye Sabana harness at this branch's `f6083dd1` and
archived 73 yaw poses each for day and night, plus four screenshots, in
`savanna-mirror-counterexample`. The native world loads without JS or GL
errors and the artwork adds detail. Nevertheless, yaw 180Ã‚Â° exposes an
exactly bilateral mesa with repeated wings; a similar reflection is apparent
at yaw 0Ã‚Â°. This is a visual rejection of mirroring, despite continuous edge
sampling. It does not approve the other five biomes.

The geometry also stretches each 4:1 panorama across half of a radius-430 m
cylinder of height 110 m (approximately 12.3:1 along the arc). Next candidate:
separate asymmetrical mountain silhouettes on proportionate horizon arcs,
with joins in low/open atmospheric areas and a shared atlas/material. This
candidate has not yet been generated, integrated or accepted. Public assets
and default wrapping remain unchanged.

## Proportionate arc diagnostic, v3

The isolated-source pilot is now available at the native harness with
`?biome=sabana&arcs=1`. It is one mountain ridge, not a completed 360Ã‚Â° panorama.
Three of four atlas cells are deliberately empty. The original comparison
control is disabled for this diagnostic; the mirrored reference remains
available by omitting `arcs=1`.

`savanna-isolated-v1.png` has 343 visible saturation outliers at alpha Ã¢â€°Â¥90
(69 after tile reduction). Its attempted cleanup v2 worsened that count to
1,380 and was rejected. Both sources and exact prompts are retained. The new
v3 artwork continues its apron past the bottom canvas edge instead of drawing
a flat outline. It has zero visible saturation outliers at the same cutoff.
It is still awaiting native artistic acceptance.

```sh
node tools/prepare_mountain_arc_pilot.mjs
node tools/audit_hq_backdrop_mips.mjs .cache/hq-arc-pilot
node --test tests/mountain-arcs.test.js tests/biome-backdrop.test.js tests/far-vegetation-ownership.test.js
```

`arc-v3/export.json` records the source/export hashes and recipe. A 960Ãƒâ€”240
image occupies the top-left 1024Ãƒâ€”256 cell of a 2048Ãƒâ€”512 atlas, with 32 px
horizontal and 8 px vertical padding. The 440 m wide arc on radius 430 m
spans 58.63Ã‚Â°; its 110 m frame preserves the 4:1 artwork ratio. Its authored
foot is anchored at -35 m, with the same bounded parallax and shared global
fog/night inputs. All arcs can batch into one geometry, material and sampler;
there are no shadows, colliders or procedural world IDs for decoration.

The optional arc shader uses local frame height for fog grading rather than
the atlas cell coordinate. Normal gameplay still has no arc layout and retains
the prior cylinder/shader path. The renderer borrows the atlas from the existing
far owner. Twenty-eight directed tests pass; 145 browser fixtures pass syntax.

The CPU reference has no visible saturation outliers across all twelve mip
levels, but only one cell is populated. This does **not** prove absence of
cross-variant bleed in a completed four-cell atlas. Four variants, native
mips/borders/base, open composition under rotation/translation, all six biomes
and controlled cost remain pending. None of these sources replace public assets.

Root's first native arc review is preserved under `arc-v3/native`: day and
night each completed 73 yaw poses with unchanged paused state and no JS/GL
errors. Examined views have much better proportions and no evident mirrored
symmetry or chromatic fringe. The horizontal foot remains visibly cut above
the grey horizon band in day/night/dusk and at yaw 25Ã‚Â° or after a 20 m lateral
move. This is pending integration, not artistic acceptance.

The file labelled `dusk-receipt.json.gz` actually contains the prior **day**
rotation. The first export button retained an old receipt after phase changes;
the dusk screenshot is retained but those 73 rows do not test dusk. The harness
now clears a completed receipt on manual phase/mode/yaw/move changes, exporting
the current snapshot until another rotation completes.

`arcs=1&arc-shift=-30` is a diagnostic that translates the same geometry down
30 m to place the foot behind existing near ground, preserving mountain aspect,
height, atlas and shader. Its shift is explicit in each snapshot. It is awaiting
native review and is not proof of all camera heights or distant ground coverage.
NativeHorizon supplies only canyon/desert terrain, but the integrated far
adapter separately supplies FarGround for Sabana. Therefore the foot problem
must not be attributed to missing ground from the NativeHorizon condition
alone. Existing base fog grading is another candidate for matching the far
ground's atmospheric color, without additional texture reads or noise.


The native base comparison is preserved under `arc-v3/base-comparison`.
At the identical initial eye, base-fog 1 preserves the mountain's relief and
integrates its foot better with the existing distant ground. Translating the
whole arc down 30 m hides almost all its slopes and is discarded. Base-fog 1
is the selected direction for the next pilot, not final approval of one cell.

The four-cell Sabana candidate uses four distinct imagegen sources, with exact
prompts retained beside each PNG. `node tools/prepare_mountain_arc_four.mjs`
produces `.cache/hq-arc-four/{atlas.webp,cells.json,export.json}`. The current
atlas is 2048Ã—512, 787504 bytes, SHA-256
`151312cc3dec8bf2bca0d2791fb6db10808b5d212042a904453614886aa19666`.
Sharp 0.35.5 / vips 8.18.7 / WebP 1.6.0 resize a safe top crop uniformly to
960Ã—240, then place each cutout in a 1024Ã—256 cell with 32Ã—8 transparent padding.
All four sources have zero visible chromatic outliers at alpha â‰¥90. Their
baseline reaches the canvas edge; the native far ground/base fog must hide
this contact naturally. Transparent ends are not assumed from the prompt.

`node tools/audit_mountain_atlas_bleed.mjs` performs read-only CPU box-mip
alpha provenance, sampled bilinearly on a 41Ã—41 grid per actual UV rectangle.
Levels 0â€“4 have no foreign visible contribution. Mixing starts at level 5
(6/5/0/0 samples) and grows at coarser levels. This is a retained counterexample,
not GPU filtering acceptance; the colour-outlier audit alone cannot prove no
cross-variant bleed. A QA-only no-mip LinearFilter comparison is available to
check the alternative without adding texture reads or a custom mip path.

Four-cell native URL:
`http://127.0.0.1:5192/tests/browser/hq-mountain-horizon.html?biome=sabana&arcs=1&arc-cells=4&arc-base-fog=1`
Append `&arc-no-mips=1` for the filter comparison. Both use one batched mesh,
96 triangles and one atlas sampler. Four arcs retain exact image aspect 4:1,
with deterministic decorative seed rotation and broad open valleys. Neither
variant replaces public assets or enables arcs in gameplay. Native day/night,
360Â° movement, alpha/filtering and cost acceptance remain pending.

The four-cell exporter now checks every source SHA, pinned encoder versions and
reviewed output SHA/length before writing any output. Its tracked contract is
`assets-source/far-backdrops-hq/savanna-four-export-contract.json`. A second
export to `.cache/hq-arc-four-repro` reproduced all 787504 bytes exactly. The
public atlas and runtime profile remain unchanged.


Remaining biome masters are continuous panoramas rather than isolated cutouts.
Splitting them at low valleys still cuts visible slopes; their narrower source
windows would also change angular coverage if natural aspect and peak scale
are retained. No quadrant crop is a ready replacement.
The first Grand River separation edit (`grand_river-separated-v2.png`) made
straight vertical cuts, so it is retained as a rejected direction. A new
reference-guided isolated ridge (`grand_river-isolated-v3.png`) instead tapers
naturally: 2172×724, zero visible saturation outliers at alpha ≥90, zero pixels
cut by the top 181 crop and zero visible pixels in the outer 16 columns. These
CPU properties do not approve native filtering or foot contact.

`node tools/prepare_mountain_arc_pilot.mjs .cache/hq-arc-pilot-grand_river grand_river`
exports one 960×240 padded cell in a 2048×512 atlas, with source/output hashes
recorded in `river-single/export.json`. The arc keeps aspect 4 and height 85 m
(the biome's current backdrop height), rather than stretching the panorama
around the full circumference. Three other cells remain empty. Native URL:
`http://127.0.0.1:5192/tests/browser/hq-mountain-horizon.html?biome=gran-rio&arcs=1&arc-base-fog=1`.
This is a single-silhouette framing/contact test before additional variants,
not a finished 360° composition or a new public asset.


Initial isolated candidates for the other four biomes are retained with exact
imagegen prompts. Mangrove v3 and Volcanoes v3 pass the safe top crop and visible
colour gate. Canyon v3 is rejected for 156 visible chromatic outliers; v4 removes
those but its tallest mesa would lose 1645 visible pixels in the top 181 crop.
Imagegen reframed it downward in v5 without stretching or cropping its summit.
Desert v3 is rejected for 7 visible chromatic outliers; v4 passes both gates.
Selected sources all have zero crop losses and zero visible chromatic outliers.
Mangrove 53 and Desert 15 visible pixels in the outer 16-column margin are at the
foot, so their native contact/end treatment remains to be reviewed. Those
counts are not silently treated as fully transparent margins.

The single-cell exporter supports all six logical biome IDs, verifies source
alpha/crop/fringe before writing, and retains their existing backdrop heights:
Savanna 110 m, Grand River 85 m, Mangrove 60 m, Volcanoes 160 m, Canyons 130 m, Desert 115 m.
No change to public assets or normal rendering profile is made. Each new atlas
still uses 2048×512, a single 960×240 padded cell and one sampler; other cells
are empty. Per-biome export/source/mip reports are in `other-singles`.

Use `node tools/prepare_mountain_arc_pilot.mjs .cache/hq-arc-pilot-ID ID`, where
ID is `mangrove`, `volcanoes`, `canyons` or `desert`. The native harness uses
`?biome=manglares|volcanes|gran-canon|desierto&arcs=1&arc-base-fog=1`.
Only Sabana currently has four distinct silhouettes and a 360° composition.
These other pilots are framing/contact studies, not complete horizon or mobile
acceptance. Do not generate further variations until native placement is sound.
