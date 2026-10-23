# Mangrove fern sunlight / mockup comparison

Retained in the existing opt-in `mangroveFerns=holly` recipe. Daytime fronds receive 20% more direct solar response and a lighter yellow-green tint; root occlusion, real solar shadows, geometry, density, edge thinning, wind and ground material remain unchanged. Night tint remains the previous value. This follows the supplied mockup without replacing the source holly fern or thinning vegetation.

## Visual findings

`mockup-side-by-side.jpg`: supplied reference left, untouched renderer capture right. `before-after-day-0.jpg`: previous native material left, selected material right. The selected material improves crown visibility and separation from the moss while retaining dark bases. It does not reproduce the entire mockup: the original holly has broader leaflets, the distant vegetation layout differs, the ground is cooler and water remains darker/less blue. These are visible limitations, not a claim of visual equivalence. The approved deep water direction is preserved.

Seed 712; medium quality; 1280x720; full distant impostors and mountains; three close/game/reverse poses at day 150 and night 350. Twelve real screenshots. Camera, target, hour, draw calls and triangles match for all six pairs; no captured JS/shader/WebGL errors. Day changes are concentrated on fronds; night differs by only 3, 2 and 0 pixels respectively (maximum one channel unit). Independent-load resource residency differs by 1–12 geometries, textures match. This is not an equal-memory or performance benchmark. No GPU/FPS improvement claimed. The shader adds no texture fetch, draw pass, instance or triangle; timing effects were not measured.

## Reproduction

With the lab served on port 5190:

```
node tools/experiments/capture-holly-fern-sunlit-20261023.mjs
python tools/experiments/review-holly-fern-sunlit-20261023.py
```

The script now reverses the two lighting constants only for `baseline`; `sunlit` uses native source directly. Initial captures used the equivalent forward patch before promotion. The comparison script checks paired camera/state/draw counts and writes the contact sheets from unmodified captures. No image generation or exposure correction is applied to renderer captures.

Validation: two existing fern integration/ownership/quality tests passed; Vite production build passed, retaining existing large-chunk and mixed static/dynamic-import warnings. Main and simulation untouched. This is an artistic refinement, not completion of the biome or broad visual-lab goal.
