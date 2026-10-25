# River coverage structure study

18 real frames compare native baseline, correlated height (`patches`) and correlated height/pigment (`meadow`), three poses day/night. Seed 712, media, 1280x720, identical native global recipe. QA source interception only; production and main unchanged.

The patch field uses seeded hash values on a 4.5-unit lattice with smooth bilinear interpolation, computed when cached coverage tiles are built. It uses absolute coordinates and leaves placement, masks, water/building/path exclusions and instance count unchanged. No new geometry, textures, uniforms or draw calls. Height only decreases from the existing maximum, so the existing conservative bounds are not enlarged.

`patches` multiplies original blade height by .40+.60*patch. Inspection shows reduced volume and too little useful broad structure at gameplay distance: do not adopt. `meadow` instead uses .75+.25*patch and replaces the existing pigment variation input with the patch field, multiplying sampled pigment by .83+.30*patch. It preserves more volume and produces modest broad variation, but the existing fine texture still dominates. It is retained as QA, **not sufficient to claim the reference's natural coverage has been achieved**. Day/night game views were inspected. Do not increase density or declare success from pixel differences alone.

The next useful investigation is matching the scale/direction of the shared module and the underlying material, including the far LOD transition. Random height/pigment alone has not solved the repeated fine clumping. Keep the approved native coverage until a visibly stronger alternative is validated.

## Reproduce

With Vite at port 5190:

```powershell
node tools/experiments/capture-river-coverage-structure-20261022.mjs
node tools/experiments/capture-river-coverage-meadow-20261022.mjs
python tools/experiments/audit-river-coverage-structure-20261022.py
node tools/experiments/measure-river-coverage-meadow-20261022.mjs
$env:WG_BENCH_OUT='docs/qa/global-visual-lab/river-coverage-meadow-cost-20261022'
python tools/experiments/audit-canyon-native-composition-resident-cost-20261022.py
```

Six baseline/meadow screenshot pairs have exact camera/target/time/call/triangle equality, no captured errors. Paired WebP sheets are provided. Height changes mean pixel coverage/overdraw is not identical even though submitted geometry counts match.

## Intel UHD measurements

A/B/A/B, paused simulation, 4-unit camera loop and moving wind, 60 warmup + 90 samples per phase. Separate GPU-query and CPU/cadence passes. Resident chunks held fixed in both arms; this does not measure streaming or cache construction. All 720 GPU queries valid; exact per-frame camera/call/triangle equivalence; no disjoint/pending/GL errors, simulation unchanged.

| Phase/repetition | Base GPU ms | Meadow GPU ms | Base CPU submission ms | Meadow CPU submission ms |
| --- | ---: | ---: | ---: | ---: |
| Day 1 | 14.530 | 14.834 | 4.493 | 5.001 |
| Day 2 | 14.855 | 14.570 | 4.724 | 5.270 |
| Night 1 | 15.642 | 15.470 | 4.986 | 4.537 |
| Night 2 | 15.647 | 15.572 | 4.727 | 5.007 |

GPU day differences change sign. CPU submission is higher in both day repetitions by about .51–.55 ms, and changes sign at night; do not claim zero overhead or a speedup. No extra shader texture fetches, but different height/pigment and resulting raster coverage are part of the candidate. Cached CPU patch construction is additional work outside this resident timing fixture and remains unmeasured. Full raw data and p95 are in `river-coverage-meadow-cost-20261022`; mean cadence spans 17.04–18.65 ms with p95 up to 34.6 ms, not a smooth-frame guarantee or uncapped FPS result. No concurrent captures/tests ran during timing.

Recommendation: retain experimental evidence, leave the native recipe unchanged, investigate module/material scale before further parameter tuning. Motion capture, rapid streaming, modest quality and a second seed remain pending for any selected replacement.
