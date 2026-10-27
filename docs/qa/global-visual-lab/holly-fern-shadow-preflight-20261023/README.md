# Conservative shadow preflight: QA result

Baseline versus QA-only changed-fern-time shortcut. When native fern wind time changes, skip full shadow snapshot construction and redraw normally. When time stops, rebuild the full snapshot (one extra draw), then reuse normally. No stale map reuse, geometry/density/shadow removal, or production code changes. The QA route uses an observation global; it is not a production API.

Intel UHD0x9A60, ANGLE D3D11,1280x720,medium,seed712,populated paused save, complete backgrounds,2048 solar map, advancing deterministic wind and moving camera. ABAB,60warmup+90samples, GPU and cadence separate.

|Pass|Phase|GPU mean ms|CPU render mean ms|Frame interval mean ms|Interval p95 ms|
|---|---|---:|---:|---:|---:|
|A1|day|22.182|9.327|28.784|36.300|
|A1|night|24.237|9.230|29.813|37.400|
|B1|day|22.809|8.988|32.591|39.500|
|B1|night|22.974|7.171|27.691|34.000|
|A2|day|22.232|8.412|27.858|34.700|
|A2|night|22.471|9.900|33.528|42.800|
|B2|day|22.429|7.343|29.987|37.700|
|B2|night|22.867|7.514|29.044|36.400|

CPU decreases0.339/1.069ms day and2.059/2.386ms night. But day frame intervals worsen3.807/2.129ms, with worsep95 in both pairs; night improves2.122/4.483ms. GPU day increases0.628/0.197ms and night is mixed. Do not claim an overall FPS optimization or infer a cause for the cadence regression from these measurements alone.

All variants and repeats have identical per-frame draw calls, triangles and visible fern counts in GPU/cadence passes.720valid GPU queries; no disjoint/discarded/unresolved query or recorded GL/JS error; paused simulation unchanged. These do not prove active-campaign or all-biome safety.

[Same-load equivalence probe](../holly-fern-preflight-equivalence-20261023/comparison.json): day/night at wind times2/3, baseline forced draw versus changed-time shortcut, stable rebuild and next cached frame. All12comparisons have0changed pixels. Shortcut draws once; stable frame rebuilds once; next frame hits cache. This proves the checked cases only, not context loss or all quality/streaming transitions.

**Decision: retain QA, do not promote.** CPU snapshot work is reducible without altering these images, but the whole-frame result is not consistently better. Keep the native approved ferns unchanged. Do not spend further iterations on this shortcut until the day cadence discrepancy has a measured cause or the broader six-biome review demonstrates a need.

Reproduce with Vite5190:
```powershell
node tools/experiments/measure-holly-fern-shadow-preflight-20261023.mjs
python tools/experiments/audit-holly-fern-shadow-profiles-20261023.py docs/qa/global-visual-lab/holly-fern-shadow-preflight-20261023
node tools/experiments/probe-holly-fern-preflight-equivalence-20261023.mjs
```
