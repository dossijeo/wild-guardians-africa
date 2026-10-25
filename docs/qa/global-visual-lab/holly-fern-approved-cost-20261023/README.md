# Manglares approved art: current combined cost

2026-10-23, source d9b9f2c83. User-approved native holly fern recipe, including e612c37df sunlit crowns, production instance culling, medium quality and full background. Original dense round leaves are the reference, not an equivalent-image baseline. No source/art change in this pass.

## Reproduction

Vite 5190, PowerShell:

```powershell
$env:WG_COVER_QUALITY='media'
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/holly-fern-approved-cost-20261023'
$env:WG_FRAME_DIAGNOSTICS='1'
node tools/experiments/measure-holly-fern-native-combined-20261023.mjs
python tools/experiments/audit-holly-fern-shadow-20261023.py docs/qa/global-visual-lab/holly-fern-approved-cost-20261023
```

Intel UHD 0x9A60 / ANGLE D3D11, 1280x720, seed712, same populated saved scene. Original/fern/original/fern, each day150/night350. 60 warmup +90 measured frames per separate GPU and cadence pass. Camera oscillates 8 m in X along identical per-frame coordinates. Simulation paused, material clock frozen, vegetation clock sample-driven. Streaming remains enabled; no large chunk excursion. Diagnostics collect grouped-render/shadow/obstruction stats and may add instrumentation overhead outside the timed render call.

## Results

| Variant/time | GPU mean first / repeat ms | CPU render mean first / repeat ms | Cadence interval mean first / repeat ms |
|---|---|---|---|
| Original day |20.455 /19.371|8.140 /6.624|25.624 /24.494|
| Fern day |21.513 /22.506|8.196 /8.014|27.330 /27.860|
| Original night |21.142 /20.116|7.911 /6.751|27.347 /26.073|
| Fern night |23.084 /23.142|8.388 /8.390|28.966 /30.002|

Fern GPU p95 day25.681/27.075 ms, night26.853/28.521. Cadence p95 day32.700/33.800, night34.700/39.300 ms. These observed intervals do not establish 60fps viability, campaign-wide FPS, or a device-independent budget. Compared with original, fern GPU increases day1.058/3.135 ms and night1.942/3.026 ms. Cadence also increases in both repetitions. This is an artistic upgrade with measurable cost, not a speedup.

All720 GPU queries valid with no disjoint/discarded/pending/errors; unchanged saved state, identical camera sequences and initial memory on same-variant repeats. Triangle sequences match exactly across same-variant repeats. Original day GPU pass differs in calls in one frame by two calls with zero triangle delta; not isolated. Other call sequences match exactly. Do not describe every draw sequence as identical.

## Cost attribution and limits

Original shadows1024, fern2048. Across the two measured passes plus preparation/capture, shadow cache draw counter increases38 for original versus304 for fern, repeated exactly. The moving fern shadow causes substantially more whole shadow-map rendering. Mean whole-frame calls88.4 vs123.3; triangles521786 vs907905. These include shadow work and are not vegetation geometry counts alone. This supports investigating shadow-update work, but does not quantitatively isolate resolution, animated caster cost and CPU invalidation traversal.

Initial resources: original day278geometries/131textures, night285/131; fern278/133 and285/133, repeated exactly. Two fern maps add approximately10.67MiB RGBA8+mip payload, excluding driver/compression and larger shadow targets. This is not measured total GPU memory. Grouped renderer snapshot example7uploads/107936bytes is a single frame, not a mean or a standalone CPU preparation timing. Coverage selection stats are cumulative since construction; do not subtract or label them per-frame kernel cost.

Full-resolution fern day capture inspected: approved crowns, density, moss, deep water and projected shadows retained in the populated benchmark view. PNGs for all eight endpoints retained. It is not a fresh six-view mockup comparison or active campaign validation.

Recommendation: retain approved art. Performance validation now has a current reproducible medium baseline and identifies shadow update work as a candidate for optimization without thinning foliage. Do not automatically lower resolution or disable shadows. Prior shadow preflight experiment worsened cadence, so do not promote it based only on CPU-function savings. Still needed for broad performance acceptance: active-play total-frame measurements and modest profile checks with the same approved recipe, and any new optimization must preserve day/night images and motion. User artistic approval remains final; this result does not reopen mockup matching.
