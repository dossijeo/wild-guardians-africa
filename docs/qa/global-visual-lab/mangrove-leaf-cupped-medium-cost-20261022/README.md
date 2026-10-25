# Medium-profile cupped leaf cost

Same-world A/B/A/B, seed 712, 1280x720, Intel UHD 0x9A60 / ANGLE D3D11. Fixed camera, full impostor and mountain backgrounds. Original and cupped geometry share instance data; both geometry sets remain resident. This measures geometry cost, not final single-variant memory usage.

| Lighting | Original GPU ms | Cupped GPU ms | Difference |
|---|---:|---:|---:|
| Day, pair 1 | 20.451 | 20.886 | +0.435 |
| Day, pair 2 | 19.108 | 20.004 | +0.896 |
| Night, pair 1 | 20.446 | 21.031 | +0.585 |
| Night, pair 2 | 20.625 | 20.497 | -0.128 |

720 valid GPU timer samples, no disjoint or unresolved queries. Camera and leaf instance counts match; zero unexplained workload differences after accounting for leaf triangles and complementary opaque impostor draws. CPU/cadence are sampled separately; raw data and percentiles are in benchmarks.json and summary.json. CPU results are mixed; no FPS improvement is claimed.

Recommendation: retain the cupped visual option. The repeated daytime GPU increase is about 2.1–4.7%, worth tracking against its improved leaf volume rather than rejecting the art. Two pairs and a static camera do not establish an upper cost bound or moving-camera performance. Medium motion evidence is separately recorded in ../mangrove-leaf-cupped-native-motion-20261022.

Reproduce in PowerShell with the development server on port 5190:

```powershell
$env:WG_COVER_QUALITY='media'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-leaf-cupped-medium-cost-20261022'
node tools/experiments/measure-mangrove-leaf-cupped-static-cost-20261022.mjs
python tools/experiments/audit-mangrove-leaf-cupped-static-cost-20261022.py
```
