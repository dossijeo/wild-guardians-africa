# Baobab elevation-zero isolation (not adopted)

The 8-degree atlas control is archived in ../far-large-baobab-inspection/coverage-547736a. This candidate bakes only Sabana slot 2 at 0 degrees, otherwise retaining native fixed-sun AfricanToon, LOD2, LOD0 framing bounds, eight camera views, eight world rotations and 128 px per cell. Day/night bakes both report GL0 and empty errors. Lossless WebP is used only in this QA path; public assets/defaults are unchanged.

The first native preparation failed: the horizontal atlas had baseV=0 and generated `uv.y-0`, rejected as float-minus-int by GLSL. The original failure is preserved. Fix26b7260 emits float literals and passes five directed tests. After the fix the candidate loads and all seven native reports have errors[] and GL0.

QA URL uses `atlas-elevation=0&path-focus=tree&focus-height=32.24962524394025` to preserve the same analytic crown-centered camera as the 8-degree control; the original focus height is explicitly held constant despite the new atlas frame height. All eye/target arrays are exactly equal to that control. The selected tree remains ready1, and owned banks retain level2. Model-only/sprite-only/blended coverage is diagnostic only; no readiness or representation ownership is bypassed.

Changing bake elevation alone does not resolve the screen-door transition. Interpolated crown remains fuller/softer than native; discrete sampling is visually closer in this pose but does not establish angular/motion acceptance. The baobab is about32m high and occupies roughly200verticalpixels at140m here. No asset replacement, alpha workaround or activation is accepted from these images. No benchmark was run; cost remains pending.

Lossless conversion verification: alpha and RGB at every nonzero-alpha pixel are exactly equal for both day/night. Full raw RGBA is not equal: WebP clears RGB under fully transparent pixels (1,809,735 day and1,775,087 night channels changed); the renderer premultiplies alpha, so those hidden colors do not contribute. Original whole-RGBA assertion failed and was narrowed explicitly to visible color plus exact alpha, not reported as whole-RGBA equality. See pixel-equivalence.json.
