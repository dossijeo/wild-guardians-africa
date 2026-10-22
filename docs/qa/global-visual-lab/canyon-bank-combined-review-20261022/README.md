# Canyon bank transition on the combined native composition

18 fresh real frames: baseline, retained shallow-edge QA, wider structured-edge QA; three identical cameras each in day and night. Seed 712, media, 1280x720, current global native recipe. No changes to production rendering, simulation or authoritative geometry.

## Result

The retained `depth` variant is too subtle to solve the artistic gap identified in the six-biome review. The `structured` variant makes shallow/deeper color separation clearly visible, with a 5-unit transition modulated by two world-space waves rather than a constant 3-unit band. It preserves the center's blue and fades toward green/turquoise at the bank. The night view retains the dark blue center and a subdued edge.

However, the wider transition still reads as a clean colored border rather than a naturally detailed shore. It is **not adopted into the native recipe**. Preserve both QA variants for further work rather than claiming a solved river or discarding an attractive direction on unmeasured performance grounds. The next experiment should address coherent material detail across the land/water boundary, not keep increasing tint strength. Do not change authoritative terrain or add fake terrain silhouettes.

The shallow parameter is lateral distance from the procedural river center/half-width, **not measured bathymetry**, transparency or refraction. It cannot reproduce underwater rocks or the reference's irregular shoreline alone. No broad claim of physical depth is warranted.

## Evidence and limitations

`captures.json` holds all frame cameras, targets, time and counters. Both six-pair audits pass exact camera/time/draw/triangle equivalence. No captured GL, console or HTTP errors. The baseline spans 32–39 draws and 232,389–399,675 triangles across the three views; candidates match each frame.

Neither candidate adds geometry, draws, texture samples or render passes. Both add the same two-float bank attribute; the structured fragment adds two sine evaluations and arithmetic. This is a source-level cost description, **not a timing result**. No fresh GPU/CPU benchmark was run in this pass, and no speedup or free-cost claim is made. Previous QA bank memory/stream evidence is recorded in `canyon-water-horizon-20261022`, but does not validate the new width modulation during motion. Current cameras also do not establish near/far seam-free behavior; that remains pending.

## Reproduce

With Vite on port 5190:

```powershell
node tools/experiments/capture-canyon-bank-combined-review-20261022.mjs
node tools/experiments/capture-canyon-bank-structured-20261022.mjs
python tools/experiments/audit-canyon-bank-combined-review-20261022.py
$env:WG_BANK_VARIANT='structured'
python tools/experiments/audit-canyon-bank-combined-review-20261022.py
```

The second capture appends the structured records to the first capture's JSON. It uses the same resident/horizon preparation hooks as the retained QA, with `qa-canyon-water-structured-20261022.js`. These hooks are explicitly experimental replacements; the underlying terrain/sky recipe is native. Paired WebP sheets show baseline on the left and candidate on the right.
