# Sixteen-view baobab isolation (not adopted)

Only Sabana slot2 is replaced in this QA experiment: 16 horizontal camera views, eight world-yaw lighting views, elevation0, LOD2, native fixed-sun toon, day/night, 128px per cell. Atlas2048x1024. The eight-view elevation0 control is archived in ../far-baobab-elevation-zero. Public assets and normal gameplay defaults are unchanged.

The QA fixture overrides the existing species attachment metadata explicitly, because the normal multi-biome owner configures eight views. `atlas-views=16` requires `atlas-elevation=0`; this is a diagnostic path, not a production selection. Camera, target, tree ID0:-6:-4, transforms and prepared level2 are held constant. Six model-only/sprite-only/blended day/night reports show empty errors and GL0. Raw reports are gzip-compressed; screenshots are unedited.

More angular samples make the interpolated crown closer in this pose, but do not remove the conspicuous screen-door pattern or base/lighting discrepancy. This does not establish moving-camera acceptance. The tree is roughly32m high and occupies about200verticalpixels at140m. Neither the larger atlas nor an alpha workaround is adopted.

The two larger textures add an estimated11,184,810.67bytes (10.67MiB) of RGBA8 plus mip storage for this active species, compared with its two1024x1024 atlases. This is texture storage arithmetic, not measured driver RAM. The existing owner summary assumes uniform atlas dimensions and therefore understates this QA override; do not use it as memory evidence. No GPU benchmark was performed.

Lossless WebP verification preserves alpha exactly and all RGB values at nonzero-alpha pixels. RGB under fully transparent pixels changes, as in the eight-view candidate; full raw RGBA equality is not claimed. See pixel-equivalence.json. Both bake reports retain their native recipe and source dimensions.
