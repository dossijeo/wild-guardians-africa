# Actual fern shadow resolution: correction and visual comparison

The previous fern QA modules called `resizeShadowMap(world.sun, 4096)`. The function accepts a quality name, not a numeric size. `nativeShadowSize(4096)` returns 1024. Previous claims that these runs used 4096 are incorrect. Raw historical JSON is retained; relevant prose reports are annotated. Historical benchmark `sceneAudit.shadowResolution` already recorded the actual 1024 value and takes precedence over hardcoded `cardStudy.shadowResolution: 4096` and narrative notes.

This pass uses the open fern candidate unchanged. A repeats the original call and records actual size; B calls `resizeShadowMap(world.sun, 'alta')`. Both requested mapSize and allocated render-target width/height are captured: all six A frames are 1024×1024 and all six B frames 2048×2048. Seed 712, 1280×720, medium quality otherwise, same day/night times and three camera poses; native distant impostors and mountains included.

## Artistic result

At 2048 the ground receives much clearer fern shadows, particularly on the shoreline side of the crowns. Prefer 2048 visually over 1024 for this candidate. It does not yet match the supplied mockup: the source leaflets are broader, ground has stronger high-frequency detail, water is darker, and the distant composition differs. No default change is made.

The solar orthographic map covers 150 world units: nominal texel widths are 0.1465 at 1024 and 0.0732 at 2048 before filtering. Small leaf shadows are consequently resolution-sensitive. The receiver bias/filter can still affect contact; this comparison does not prove resolution is the only limitation.

## Cost and limitations

Doubling each dimension quadruples shadow-map texels. GPU cost and allocated memory cannot be inferred from draw calls alone. A separate moving-camera A/B/A/B benchmark compares actual 1024 and 2048 with identical casters and geometry. It must not be described as equal-image optimization. This pass does not validate low quality, six biomes, context restoration or long sessions.

## Reproduce

With Vite on 5190, run each command sequentially in the lab worktree:

```powershell
$env:WG_CARD_TREATMENTS='cards'
node tools/experiments/capture-holly-fern-shadow-actual1024-20261023.mjs
node tools/experiments/capture-holly-fern-shadow-actual2048-20261023.mjs
$env:WG_COVER_QUALITY='media'
node tools/experiments/measure-holly-fern-shadow-resolution-20261023.mjs
```

See `resolution-side-by-side.jpg` for actual A/B and `mockup-side-by-side.jpg` for artistic reference versus actual B. No image relighting.
