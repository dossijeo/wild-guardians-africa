# Lower mantle weight study — 2026-10-28

Status: candidate only. The shipping GLB and editable source are unchanged. Visual runtime acceptance is still pending.

The broad wind exposed a steep front/back chain weight gradient across a 5.65 mm model-space edge near (0.19751, -0.000244, -0.306396). Its front-panel influence changed from 0.3615 to 0.4943 between neighboring vertices. Reducing animation amplitude would hide the issue rather than repair the gradient.

`hem_weights.py` applies three Gaussian relaxation passes (24 mm neighborhood, 12 mm sigma) only to vertices influenced exclusively by Torso/Mantle bones. Full strength begins below z=-0.21 with a smooth transition from -0.15. Feather, hanging wood, arm and facial groups are excluded. Export remains limited to four normalized weights. The first narrower mask left another seam at z=-0.217; widening the transition produced this candidate.

Both JSON reports sample the same ten clips, frames 1..289 every 12 frames, with Float and the appropriate mantle layer. These are geometric diagnostics, not visual acceptance or continuous-time bounds. Ratios compare deformed edge length with rest length; edges below 2 mm are omitted.

| Clip | Maximum ratio before | Candidate |
|---|---:|---:|
| Idle | 2.716 | 1.544 |
| Invoke | 3.310 | 1.782 |
| Grow | 3.310 | 2.895 |
| Multiply | 3.310 | 2.903 |
| Shield | 3.310 | 3.201 |
| Attack | 3.310 | 3.259 |

Attack p99 improves from 1.234 to 1.208. Its remaining worst edge is around (0.198, -0.081, -0.106), above the treated hem. This still needs inspection; do not claim all stretching resolved. Weights remain normalized within float precision, maximum four influences. Animation curves are untouched.

Reproduce from the repository root with Blender 4.5.3:

```powershell
blender -b --python tools/guardian/study_hem.py -- --output C:/tmp/guardian-hem-candidate.blend
blender -b --python tools/guardian/check_deformation.py -- --output C:/tmp/guardian-hem-baseline.json
blender -b --python tools/guardian/check_deformation.py -- --blend C:/tmp/guardian-hem-candidate.blend --output C:/tmp/guardian-hem-candidate.json
```

Next gate: export the separate candidate through the normal material batching pipeline and inspect broad wind plus arm casts from multiple views in the runtime before integrating these weights into the build.
