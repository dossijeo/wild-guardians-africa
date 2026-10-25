# Horizon normal construction cost

Live Canyon campaign, seed 712, medium quality. Existing resident horizon buffer: 103212 vertices, 17970 unique positions, 3715632 bytes. Browser construction microbenchmark, not a GPU/frame benchmark.

Initial string-key implementation: 12 runs, 28.7–52.9 ms. Subsequent alternating A/B sequence: eight string/numeric pairs; exclude first pair for warmup. Median string 29.5 ms, numeric 10.5 ms. Timings vary substantially, so this is evidence of lower local construction cost, not a promised FPS improvement.

Numeric keys pack validated integer X/Z lattice coordinates and verify a single Y per coordinate. All 16 runs preserve every position and colour. Every resulting float32 normal equals the reference exactly. Existing visual candidate therefore has identical normal data; no new artistic variant or image claim.

GPU buffers, triangle counts and shading are unchanged. Numeric scratch keys use 825696 bytes plus an unmeasured Map allocation; the original uses a string array and Map with unmeasured heap overhead. Scratch is construction-only. No reliable driver VRAM measurement.

Recommendation: retain numeric candidate, perform normal preparation in the existing horizon worker before transferring its buffer. Do not put even the faster 10.5 ms median construction into main-thread streaming. Worker scheduling/latency and moving-camera frametimes are still pending; not integrated.

Reproduce with Vite on 5190:
```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/benchmark-canyon-horizon-normals-20261022.mjs
```
This regenerates cost-abab.json. cost.json preserves the initial string-only measurement. No production or simulation changes.
