# Adaptive horizon: wide second-seed inspection

Seed918271, medium1280x720. Full2x2 vs optimized adaptive; three wide lateral/elevated poses day/night. Twelve real campaign captures, same camera/time/calls, active horizon workers, no captured errors. Unlike the close-angle fixture, these show substantial horizon terrain and its coarse outer region.

Visual review: adaptive corridor retains the fine wall appearance. Small contour/lighting changes outside it, no obvious cracks in these stills. Pixel equality does not hold here: mean absolute channel differences0.047–0.108 on0–255 scale; maxima up to65 along contours. Those metrics are descriptive, not an artistic pass threshold. Do not generalize earlier exact-image claims beyond their six specific views.

Both variants expose broad blotchy plateau material and conspicuous distant representation changes. These are shared limitations, not corrected by dense geometry. Treat material blending separately; adding triangles is not a demonstrated solution. Missing far props and world-edge visibility in these wide QA poses also remain outside this mesh trial's success claim.

Retain adaptive candidate for subsequent streaming/integration work. Still-image review on two seeds is not exhaustive temporal/seed validation. No GPU/CPU/FPS measurement in this fixture. Keep default renderer density unchanged.

Reproduce with Vite5190:
```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/capture-canyon-adaptive-wide-20261022.mjs
python tools/experiments/package-canyon-adaptive-wide-20261022.py
```
See day/night paired WebP, pair-audit.json, pixel-deltas.json and raw captures.
