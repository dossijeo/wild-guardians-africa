# Mangrove static material cache: detailed region experiment

## Decision
Continue investigating; not ready to enable by default. Static composition is a significant cost. A coarse per-chunk cache plus a detailed near-camera region preserves more detail than uniform 512 caches without paying for a full 2048 chunk. Dynamic light, shadow and normal response remain in the original shader. Fern density and lighting are unchanged.

## Reproduction
PowerShell, lab server on port 5190, Chrome/Intel UHD 0x9A60, 1280×720:

```powershell
$env:WG_VARIANT_SEQUENCE='base,region,base,region'
$env:WG_PHASES='day,night'
$env:WG_VIEW='normal'
$env:WG_COVER_QUALITY='media'
$env:WG_MODES='frame,cadence'
$env:WG_SAMPLES='240'
$env:WG_WARMUP='180'
Remove-Item Env:WG_FRAME_STEP -ErrorAction SilentlyContinue
$env:WG_REVIEW_OUT='docs/qa/global-visual-lab/mangrove-ground-region-long-20261023'
node tools/experiments/measure-mangrove-ground-hybrid-20261023.mjs
python tools/experiments/audit-mangrove-ground-long-20261023.py $env:WG_REVIEW_OUT region
```

Do not edit, build, run other GPU work or inspect images during timing. Seed 712, paused populated fixture, deterministic camera path, background impostors included. Separate GPU-query and uninstrumented cadence windows. This is not an active-simulation or streaming benchmark.

## Whole-frame results (milliseconds)

| Run | Phase | GPU | Cadence mean | Cadence p95 |
|---|---|---:|---:|---:|
| A1 original | Day | 23.437 | 29.544 | 35.7 |
| B1 region | Day | 21.663 | 27.233 | 31.8 |
| A2 original | Day | 23.784 | 31.553 | 44.7 |
| B2 region | Day | 22.433 | 27.360 | 35.4 |
| A1 original | Night | 24.242 | 30.122 | 35.5 |
| B1 region | Night | 22.155 | 27.770 | 36.3 |
| A2 original | Night | 24.250 | 30.966 | 38.7 |
| B2 region | Night | 22.347 | 28.109 | 35.0 |

Strict audit passes: 1,920 valid GPU queries, matching per-frame camera, calls, triangles and fern coverage. GPU savings 1.351–2.087 ms. Cadence improves in all four pairs; p95 worsens by 0.8 ms in the first night pair, so temporal stability is not yet conclusively improved. Raw CPU render measurements, memory counters and query diagnostics are in benchmarks.json and summary.json.

## Representation and memory
Coarse weights cache selected by projected importance, plus a 1024² detailed region covering 24 m rather than an entire 48 m chunk. Shared moss/mud textures retain fine color and normal detail. The extra cache allocation including gutters/mips is **16.183609 MiB** for this view; this is a calculated texture-storage estimate, not measured driver allocation. Fine/coarse weights blend across a 1.5 m boundary.

The region is generated in 16 scissored tiles, published only after completion. Measured maximum tile GPU time across installations: 0.356 / 0.472 / 0.387 / 0.417 ms; maximum CPU submission 0.2 / 0.2 / 0.4 / 0.3 ms. Shader compilation and first-use warmup happen separately during preparation; these costs are not eliminated. Generation has not yet been tested during live streaming. Concurrent old/new targets and allocator overhead are not included in the resident-view figure.

## Visual evidence
See day-side-by-side.png, night-side-by-side.png and the two ground crops. Day crop RGB MAE 0.694, p95 maximum-channel difference 3; night 0.338 and 2. These statistics supplement visual inspection, not a perceptual guarantee. Separate near-view experiment shows MAE 1.202 / p95 5, comparable to full-chunk 2048 (1.204 / 5) with less storage. Near view needs 12.068466 MiB for its selected caches.

## Open gates
- Selection is frozen at installation: no camera-driven region relocation, cache eviction or event invalidation yet.
- Low-quality attempts failed exact workload audits; their faster timings are provisional, not accepted comparisons. A fixed visual dt did not eliminate the discrepancy. Draw census is investigating the changing submissions.
- Elevated views, active simulation, buildings/crops changing masks, loading/streaming, transient peak memory and disposal/recreation need validation.
- Do not adopt or generalize to other biomes until those gates pass. PR #159 stays draft.
