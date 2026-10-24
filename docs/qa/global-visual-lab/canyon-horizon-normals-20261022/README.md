# Canyon horizon normal isolation

Real campaign, seed 712, medium quality, 1280x720. Three along-river views, day and night. Twelve images, six pairs with identical camera, target, time, draws and triangle counts; no browser/GL errors captured.

Baseline: original flat face normals. Candidate (legacy filename `depth`): area-weighted averaged normals at exactly coincident vertices of the existing horizon terrain. No position, colour, index, terrain height, simulation, material or shader modification. No water-depth patch in this trial.

Visual review: diagonal bright facets on the distant right wall are softened, most clearly in day view 2. The stepped/sawtooth bank remains. Night changes are smaller. This establishes a normal contribution but not a complete seam solution. Retain as a QA candidate, not yet integrated. Original warm palette and model silhouettes are preserved.

Cost: same geometry buffers and GPU shader operations; transient JavaScript Map and key array at horizon construction, O(vertices) processing. The helper records construction timing on geometry.userData.qaNormalBuild, but this capture does not export it. No measured CPU/GPU timing or FPS claim. Before promotion, measure construction/streaming cost and compare resident-edge lighting. The naive string-key implementation is diagnostic, not a production optimization.

Reproduce with Vite on port 5190:

```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/capture-canyon-horizon-normals-20261022.mjs
python tools/experiments/package-canyon-horizon-normals-20261022.py
```

Next: preserve this candidate while isolating remaining coarse geometry/colour contributions. Do not increase mesh density globally or alter authoritative terrain to hide the artifact.
