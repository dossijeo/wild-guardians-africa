# Lower mantle weight study — 2026-10-28

Status: lower-mantle correction integrated into the editable source, build recipe and shipping GLB after runtime inspection. Remaining upper-arm stretch is not resolved.

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

Reproduce from the repository root with Blender 4.5.3 at pre-integration commit a148996f9 (the current source already includes the smoothing; do not apply it twice):

```powershell
blender -b --python tools/guardian/study_hem.py -- --output C:/tmp/guardian-hem-candidate.blend
blender -b --python tools/guardian/check_deformation.py -- --output C:/tmp/guardian-hem-baseline.json
blender -b --python tools/guardian/check_deformation.py -- --blend C:/tmp/guardian-hem-candidate.blend --output C:/tmp/guardian-hem-candidate.json
```

The candidate was exported through the normal material batching pipeline; runtime evidence and the integration decision follow below.

## Runtime inspection

The actual Three.js inspector passed all 84 assertions (runtime-checks.json). Attack was inspected at 1 s in three-quarter view and 2.5 s in side view; screenshots are included. A 24 s idle recording covers two mantle cycles; its 24-frame contact sheet was inspected for silhouette and cloth continuity. These sampled views show no open seam or jagged lower hem. The video is supplied for motion review; this is not proof of all-angle or continuous-frame artifact absence.

459 accessor checks preserve all animation sampler values, mesh positions, normals, indices and morph values against the pre-change GLB. Skin weights intentionally differ; tangents are excluded from exact parity because Blender re-export rounding may vary. The asset retains 37 bones, 3 draw primitives and exactly 2,765,144 bytes. No extra runtime computation is introduced.

WorldScene daytime integration recorded six successful agricultural casts with camera/zoom changes, no reported errors, maximum one visible Guardian and zero active summons afterward (day.json/day.mp4). Sampled contact frames confirm appearance and disappearance near the crops. Build and web-package verification passed: 993 files, 494,970,113 bytes. Nighttime revalidation and remaining upper-arm correction are still pending; prior night evidence predates this weight change.
