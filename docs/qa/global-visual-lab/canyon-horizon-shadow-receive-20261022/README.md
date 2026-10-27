# Canyon horizon shadow reception isolation

Seed 712, medium quality, 1280x720; three cameras looking 160 world units along the river, spaced 48 units apart. Day and night, real paused campaign, identical camera/time/draw/triangle counters. Twelve captures and six paired comparisons. The legacy `depth` filename means receiveShadow=true in this experiment; neither variant modifies water depth.

Result: five pairs pixel-identical. The remaining day pair differs by at most 1/255 in any channel, mean absolute channel difference 0.000003617. No visible improvement. Do not integrate this flag as a seam fix.

Source explanation: AfricanToon ground path computes groundVisibility directly with nativeShadowOcclusion under USE_SHADOWMAP; it does not gate this result with receiveShadow. The object path does gate nativeDirectVisibility. The missing horizon flag therefore does not establish missing ground shadows.

The coarse horizon still has pale diagonal facets and an irregular bank silhouette. This trial rules out the flag alone, not shadow bias, normal discontinuities, colour interpolation, or the coarse 4x8 world-unit lattice. Next isolate horizon normals before changing geometry or colour. No simulation or production renderer change.

No CPU/GPU timing claim: equal draw/triangle counters are not evidence of equal runtime. Existing timing drift remains unresolved.

Reproduce from repository root (Vite on port 5190):

```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/capture-canyon-horizon-shadow-receive-20261022.mjs
python tools/experiments/package-canyon-horizon-shadow-receive-20261022.py
```

See day/night paired WebP, captures.json, pair-audit.json and pixel-deltas.json.
