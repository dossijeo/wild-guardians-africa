# Fine-noise volume — Volcanes/Mapungubwe day and night

Native in-app browser tab 665 loaded current main e461b550 from Vite 5183,
`/tests/browser/african-toon.html?case=16`, default medium quality, shadows,
seed 712. Four screenshots compare analytic/volume noise at day and night. The
controls were collapsed for each capture. The tab was closed after export.

The visible diagnostic reports the same camera coordinates and target for all
four captures, internal 1600×900 rendering, and 48 adapted shader compilations.
The volume switch reports 0/1/1/0; day/night lighting is deliberately changed
between pairs. This visual fixture includes staged workers, beasts, crops and
walls; it is not a paid gameplay run. No state-serialization equality or GPU
timing was measured here.

Visual review of this village view shows coherent building and terrain colors,
silhouettes and volcanic emission, with small pigment differences. Full RGB
screenshot comparisons (1280×720, no alignment or pixel masks):

| Phase | Changed pixels | Pixels with channel difference >8 | Mean channel difference /255 | Maximum /255 |
| --- | --- | --- | --- | --- |
| Day | 11,511 | 293 | 0.020889 | 22 |
| Night | 12,239 | 38 | 0.019086 | 14 |

This is not framebuffer equality. Small differences in this camera do not prove
periodicity invisible at all distances, actor/material coverage, destruction,
all cultures or mobile acceptance. The [earlier farm timing](../late-farm-noise-volume/README.md)
remains a separate measurement and is not extended to this scene.

Five ANGLE program warnings were captured, naming potentially uninitialized
`f_environment4` and `f_volumeFineNoise`. The current GLSL functions return on
all authored paths; these warnings do not establish an actual uninitialized
value or the cause of image differences. No scene error was reported. Eleven
directed noise/depth tests pass. The volume remains QA-only, disabled in gameplay.

Four campaign processes were active in the background. No performance or
memory gain is claimed by this visual check. Continue with near/oblique views,
other biomes/cultures, periodicity and native compilation controls before making
a production decision.
