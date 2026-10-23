# gran-rio: active low-profile review

Source c8938c6be, seed712,1280x720,low quality. Native selected recipe with full distant impostors and mountain system enabled. Saved paid12-crop/two-worker scene, tutorial skipped only in QA save. Real Game.advanceReal loop, live wind/material clocks,8m lateral sweep over20wall seconds per phase. Night continues daytime state; not an A/B comparison.

- day: 636 observed frames, 18.026 simulation seconds advanced, workers changed=True; 18 frames report pending far preparation. Geometry range [295, 320], textures [109, 111]. [Video](day.webm), [checkpoints](day-contact.jpg).
- night: 634 observed frames, 36.323 simulation seconds advanced, workers changed=True; 53 frames report pending far preparation. Geometry range [263, 321], textures [95, 111]. [Video](night.webm), [checkpoints](night-contact.jpg).

No paused frames, browser/GL errors or coverage overflow. Videos decode at1280x720 and exceed18s. Recorder/checkpoint overhead and dropped recorder frames preclude any FPS claim. Resource ranges do not establish leak absence.

Visual review: midday full-resolution checkpoint and five nighttime checkpoints inspected. Coverage, biome palette and paths remain visible. Low disables cast shadows and reduces fine vegetation volume; buildings look less grounded. Small crops are particularly hard to distinguish at night in Gran Rio. Keep medium as the art reference; low is a deliberate quality compromise, not an equivalent optimization. Foreground obstruction transparency remains visible.

This supplies the previously missing short low-profile active-play evidence. It does not close prolonged streaming, all transient impostor transitions, all campaign functions or whole-biome artistic acceptance. No source graphics/simulation modifications. The camera shows the far system but does not closely inspect distant mountain silhouettes. Earlier timing evidence remains attached to its original source revision.

Reproduce:
```powershell
$env:WG_FIXTURE_BIOME='gran-rio'
$env:WG_COVER_QUALITY='baja'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/gran-rio-active-low-20261023'
node tools/experiments/capture-populated-active-play-20261022.mjs
python tools/experiments/audit-populated-active-play-20261022.py docs/qa/global-visual-lab/gran-rio-active-low-20261023
```
