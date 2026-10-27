# Volcanoes: reconcile post-merge triangle reduction

Source c9406dd97, 2026-10-23. No production renderer changes. This experiment toggles only `world.assetGroups.instanceCulling=false` in the QA browser for the control; selected native renderer stays enabled. Same populated saved fixture, seed 712, medium quality, 1280x720, full impostors and mountain background, day 150/night 350, three cameras. Both runs produce warmup and final captures; comparison uses six final pairs. All camera/target/time/elapsed/workers/render-origin controls match; no reported JS or GL errors.

Historical evidence: the old resident benchmark was committed in d97e5e8ce, an ancestor of merge 5cf14fc65. Its asset-groups.js had no instanceCulling. Current production integration does. Therefore it is incorrect to treat the old and recent benchmark as two equivalent versions of the same renderer.

| View | Culling OFF calls / triangles | ON calls / triangles | Changed pixels day / night |
|---|---|---|---|
| Game | 102 / 603198 | 88 / 326925 | 2 / 7 |
| Elevated | 64 / 521927 | 45 / 234566 | 8 / 7 |
| Reverse | 90 / 588864 | 75 / 297440 | 0 / 0 |

Counts above are final world-pass counters in these static captures, identical across day/night here. They are not whole-frame shadow-pass counts. Current OFF game 603198 vs old resident preparation 603242 differs by 44 triangles, matching the separately diagnosed initial far-region alignment delta (volcanes-aligned-native-20261022). The large remaining 276273-triangle difference is directly reproduced by the one-flag culling control. Do not compare old timed sample counters (which can include other draws) with preparation counters without naming the scope.

Visually inspected current full-resolution day game capture and night game side-by-side: terrain detail, inhabited settlement, vegetation and cast shading retain their appearance. Numeric comparison covers all six pairs: reverse views are RGB-exact; others differ in at most eight pixels, maximum channel delta nine. Tiny residuals are not isolated; no claim of universal pixel identity. This supports static visual preservation, not a moving-camera or offscreen-shadow regression proof.

Recommendation: retain production instance culling and the approved medium art. Recent allocation-aware measurements now have a concrete explanation for the lower workload; they must not be advertised as a new optimization or directly subtracted from pre-merge timings. This experiment measures draw reduction and images, not incremental CPU/GPU cost of toggling culling. Next is active Volcanoes movement/streaming/lava-edge validation, not more density reduction.

Reproduction (Vite 5190, PowerShell):

```powershell
$env:WG_FIXTURE_BIOME='volcanes'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/volcanes-current-populated-20261023'
node tools/experiments/capture-biome-populated-frozen-20261022.mjs
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/volcanes-current-no-culling-20261023'
node tools/experiments/capture-volcano-no-instance-culling-20261023.mjs
python tools/experiments/compare-volcano-instance-culling-20261023.py
```

Final PNG captures and metadata are saved in the two named directories. Comparison JPGs only juxtapose untouched renderer images; no exposure correction. Warmup PNGs can be regenerated and are not needed by the comparison script. Main, simulation, geometry assets and density remain unchanged.
