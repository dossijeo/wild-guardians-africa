# River coverage / underlying material isolation

24 real frames: native baseline, terrain-only diagnostic, filtered blade pigment, filtered ground underlay. Three matching poses day/night, seed 712, media, 1280x720. Native global recipe; candidates implemented through QA source interception only.

## Findings

The terrain-only day view retains much of the repeated fine mottling seen with coverage enabled. This demonstrates that changing blade distribution alone cannot remove that component. It does not imply geometry is unnecessary: switching it off visibly removes standing fibers and their collective volume.

`filtered` changes the blade pigment sample from mip 2 to mip 5. Inspection shows little material improvement in overall repetition, so it is not selected.

`underlay` retains original blade geometry, pigment and counts. It increases the ground color sample footprint up to 8x under nearby eligible grass, fading back between 30 and 48 units from the camera. Existing cover/moisture thresholds .20–.32 and wear fade .08–.25 restrict the effect. Day/night inspection shows a clearer separation of upright blades from the less mottled substrate. This is the more promising direction; keep as a candidate for motion/cost verification, not yet native integration or global completion.

The filter only changes ground color sampling. Normal and ARH sampling remain unchanged. It does not add a texture asset, geometry or draw, but source now resamples the base color after amount computation; do not assume the compiler removes the earlier sample or claim zero GPU overhead without measurement. No new timings were collected in this diagnostic pass. Earlier coverage benchmarks do not measure this candidate.

Important limitation: eligibility approximates coverage from terrain masks and distance. It does not consult the renderer's full obstacle/water exclusion or frustum-selected instance set. Some exposed ground can therefore be softened without geometry above it. Also, distance-dependent filtering may become visible during motion. Resolve these before adoption; preserve terrain fallback on lower quality/disabled coverage.

## Verification and reproduction

Six baseline/underlay pairs pass exact camera/target/time/call/triangle equality with no captured errors. Terrain-only deliberately draws fewer triangles and must not be presented as an optimization comparison. Its purpose is layer isolation.

```powershell
node tools/experiments/capture-river-coverage-pigment-scale-20261022.mjs
node tools/experiments/capture-river-coverage-underlay-20261022.mjs
python tools/experiments/audit-river-coverage-pigment-scale-20261022.py
```

Vite must run on port 5190. The second capture appends/replaces only underlay records. Captures and paired WebPs are in this directory; exact counters and cameras in `captures.json`.

An initial QA replacement matched an auxiliary texture sample before cover/wear variables existed, causing a shader compile failure (`ctx`/`wear` undeclared). The loading guard correctly rejected that world. The corrected patch targets `materialCover410=amount` inside the actual ground-material function. Failed captures were not used; all six underlay frames are from the corrected successful run. The harness now prints the guard's shader diagnostics on loading failure. Production source was not changed.

Next: moving-camera A/B/A/B cost and visual transition capture; then decide whether to connect filtering to actual coverage activation/quality and refine eligibility. Keep the native approved coverage unchanged until those checks pass.
