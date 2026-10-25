# Volcanic seam isolation

Seed 712, current lab recipe, low quality, 720p. Paused simulation and fixed camera matching the midpoint of the prior excursion; terrain installation drained before captures. A/B/A toggles only farGroundSeam mesh visibility. No material, lava, model or authoritative terrain changes.

Result: hiding the vertical bridge exposes a sky-colored opening in the central background. The bridge is not an unnecessary surface that can simply be removed. The one observed bridge has 1028 vertex pairs and maximum native/proxy height difference 1.72143364 world units (not necessarily the maximum visible pixel location). Exact positions, world bounds and chunk state are in diagnostic.json. No console errors; final GL error zero. The screenshot pair was personally inspected.

A subsequent QA-only groundStep 16 route override failed before producing images: GPU compilation cancelled because the selected program was disposed. See ../volcanes-seam-step16/failure.txt. Do not infer quality or performance of step 16. Default groundStep remains 32. The cancellation must be investigated or isolated before a valid density comparison.

Reproduction (PowerShell, Vite at 5190):

```powershell
$env:WG_CURRENT_REVIEW='1'
$env:WG_GROUND_RESIDENT_MASK='1'
$env:WG_FIXTURE_BIOME='volcanes'
$env:WG_COVER_QUALITY='baja'
$env:WG_DIAGNOSTIC_GROUND_STEP='32'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/current-review-20261025/volcanes-seam-isolation-repeat'
node tools/experiments/diagnose-volcanic-ground-seam.mjs
```

The initial step-32 report predates added surface byte/triangle telemetry; it contains bridge height measurements but no total proxy memory measurements. This is a diagnosis, not a benchmark or accepted artistic fix.
