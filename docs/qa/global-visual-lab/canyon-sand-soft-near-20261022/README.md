# Soft sand blend: near/gameplay check

Seed918271, medium1280x720, gameplay/close/oblique cameras, day/night. Twelve real campaign captures. Identical optimized adaptive mesh and smooth normals in both arms; only the footprint-dependent sand blend differs. Six pairs have matching camera/time/draw/triangle counts and no captured errors.

Visual review: foreground sand ripples, ground detail, shadows and warm colour remain readable; no obvious loss of near detail. Differences are concentrated in more distant/grazing regions, so images are not exactly equal. Pixel deltas describe differences but do not prove quality. Canyon wall-foot sawtooth forms are still present in both arms.

Retain the soft candidate, with temporal fade validation pending before native integration. This is not a GPU/CPU performance benchmark. Same texture samples, geometry and draw calls; extra scalar blend arithmetic only. Other quality profiles remain untested for this candidate.

Reproduce with Vite5190:
```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/capture-canyon-sand-soft-near-20261022.mjs
python tools/experiments/package-canyon-sand-soft-near-20261022.py
```
Source remains an in-memory QA route; production shader unchanged.
