# Native resident-tree registry CPU experiment

Base runtime `97203a2f`; benchmark tool was uncommitted at execution. The receipt identifies that exact tool. Native world/rendering source hashes are included in report provenance; packed binary hashes are recorded per biome. Pack JSON and binary hashes are also recorded by the [foundation receipt](../receipt.json).

Six seed712 origin-centered 25-chunk regions use the actual procedural scatter and high-detail packed positions. They are not dense-farm rendered scenarios or spawn-camera regions. Terrain geometry, GLBs, materials, visual fades, controls and GPU are omitted. Native generation is outside all reported timings.

A1/B1/B2/A2 compares direct swept-sphere queries against the same volumes in the shared spatial index. Each arm has100 warm-up and600 measured deterministic camera-like paths, with identical ID/fraction hashes. One initial construction and one five-chunk-column replacement are measured per biome; these single timings are not statistical guarantees. Unchanged sync is measured1000 times and performs no scene work, verified separately by tests.

| Biome | Tree volumes | Direct p95 A1/A2 ms | Index p95 B1/B2 ms | Mean indexed candidates | Initial index ms | Five-chunk update ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| sabana | 113 | 0.2088/0.1027 | 0.0148/0.0115 | 1.84 | 5.351 | 0.560 |
| gran-rio | 137 | 0.0950/0.1613 | 0.0096/0.0061 | 1.94 | 2.976 | 0.487 |
| manglares | 98 | 0.0513/0.0774 | 0.0053/0.0039 | 1.32 | 1.273 | 2.142 |
| volcanes | 74 | 0.0377/0.0412 | 0.0042/0.0051 | 1.27 | 0.912 | 0.355 |
| gran-canon | 8 | 0.0045/0.0035 | 0.0015/0.0011 | 0.21 | 0.269 | 0.100 |
| desierto | 9 | 0.0054/0.0032 | 0.0015/0.0010 | 0.19 | 0.323 | 0.219 |

All six ABBA sets retain exact query results. Replacement rebuilds exactly five chunks, releases the dropped column and preserves unchanged chunk descriptors; final clear leaves zero index records. These are Node CPU measurements on one desktop, with JIT/timer/GC variability. The apparently tiny unchanged-sync durations are near timer resolution; do not extrapolate them to FPS or mobile.

This supports using the spatial index instead of a direct all-tree query in the optional prototype. It does not approve visual margins, renderer cost, actual OrbitControls motion, near-camera fades, physical mobile or normal-game activation. Protection remains off. The previously accepted camera traveling point is not reopened.

Reproduce: `node tools/benchmark_camera_tree_registry.mjs .cache/camera-tree-registry-reproduction`. Raw per-query timings, unchanged-sync samples, source provenance and summary output are preserved in gzip archives.
