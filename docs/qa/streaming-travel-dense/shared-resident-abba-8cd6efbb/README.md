# Shared resident preparation: native negative ABBA

The same-source experiment reduces resident preparation calls but does **not** establish a consistent frame-time benefit. Do not activate it as an accepted optimization or promote a runtime PR from this result.

Root executed A1/B1/B2/A2 sequentially in tabs 910/911/912/913, saved each completed report before starting the next arm, then disposed/closed all four worlds. The recipe, fixture and preparation sources remained frozen at `8cd6efbbaf6b9a0378f4a9c88d0442a726850733`, with production code byte-identical to baseline `795f773e83640d3f7541d8e3d826764c3d779750`. B differs only by the existing `sharedPreparation` URL flag. The manifest records both URLs and file hashes. No reroll or selective removal of arms.

All 12 original final/disposed/console JSON files and the final A2 JPEG are preserved as gzip with raw-byte and compressed SHA-256 hashes. `streaming-travel.html.gz` is the frozen raw fixture. `verified-summary.json` includes global summaries, scoped compile counts, per-position 30 m bins and every recorded seam-v2 slow draw. Reproduce the read-only check with Python 3:

```powershell
python docs/qa/streaming-travel-dense/shared-resident-abba-8cd6efbb/verify.py
```

Gzip encoding used Python `gzip.compress(raw, compresslevel=9, mtime=0)`; original report bytes are verified after decompression. Quantiles use nearest rank `ceil(N*p)-1`. GPU frame indices join the matching frame timestamp; bins derive distance from `clamp(at/1000,0,15)*12`. The initial negative RAF offset is clamped to distance zero, not excluded. No adapter union-upload counters are summed: shared preparation returns the same union result to multiple subscribers and such sums would double count.

## Conditions and verification

Gran Río/Suajili, seed 712, medium quality; paused historical farm `e461b550` (23,700 total plants, 1,257 living plants, 34 workers, one structure, recorded victory). Native movement covers 180 m in 15 seconds. Resident programs/textures, crate shadow preparation, awaited actors, isolated preparation and trace/chunk phases are identical in both arms. Owned compilation/waits remain false.

Every timed arm uses viewport 1280×720, drawing buffer **1600×900**, DPR **1.25**, Chrome 154 with ANGLE/Intel UHD (0x9A60)/Direct3D11. All frames report visible. Initial/final camera and target, device, farm, quality, logical state and stream statistics match exactly across arms. The stream creates 40 chunks from an initial 25, with no discard/failure/fallback and no remaining queue. All four reports are done, errors and console logs are empty; all 1,004 GPU queries completed with zero pending/disjoint/discard/overflow/foreign-query/allocation failures. The four separate close reports confirm disposed worlds and lost contexts. Query `gpu.contextLost` is its historical collector field; actual closure is the top-level `contextLost` in each disposed report.

Root and the other agents confirmed no local tests, builds or heavy replay/benchmark during this slot. The campaign jobs discussed elsewhere were remote GitHub Actions jobs, not evidence of local CPU contention. This is not exhaustive control of OS background activity, thermals or power state. Resource-functional QA at other resolutions is not a timing comparison to these arms.

## Global result

| Metric | A1 | B1 | B2 | A2 |
|---|---:|---:|---:|---:|
| Frames / GPU queries | 250 | 249 | 255 | 250 |
| Frame interval p95, ms | 116.4 | 116.4 | 116.4 | 116.4 |
| Frame interval p99, ms | 149.6 | 149.5 | 149.6 | 149.6 |
| Intervals >100 ms | 18 | 20 | 19 | 21 |
| Frame CPU median, ms | 23.8 | 25.5 | 24.5 | 25.5 |
| Frame CPU p95, ms | 36.3 | 42.5 | 37.5 | 36.7 |
| GPU median, ms | 47.57 | 50.89 | 46.91 | 48.18 |
| GPU p95, ms | 71.70 | 73.92 | 68.58 | 68.77 |
| Standby compile invocations | 108 | 110 | 110 | 111 |
| Resident merged compile invocations | 102 | 72 | 68 | 105 |
| Other compile invocations | 12 | 12 | 12 | 12 |

Resident calls decrease by approximately 30–37, but GPU/CPU measurements are mixed and every frame-interval p95 stays 116.4 ms. The shared mechanism remains experimental. Invocation reduction alone does not justify activation.

## Position-specific result

Frame interval p95 / frame CPU p95 / GPU p95, milliseconds; full counts and scoped call distributions are in the verified summary.

| Meters | A1 | B1 | B2 | A2 |
|---|---|---|---|---|
| 0–30 | 149.5 / 38.4 / 79.31 | 149.5 / 49.9 / 76.33 | 149.6 / 42.1 / 77.82 | 149.6 / 39.0 / 79.16 |
| 30–60 | 132.8 / 36.6 / 67.23 | 132.9 / 52.6 / 82.05 | 116.4 / 38.4 / 65.40 | 116.3 / 35.4 / 65.74 |
| 60–90 | 99.8 / 35.4 / 64.75 | 115.3 / 35.0 / 66.15 | 99.9 / 37.8 / 64.00 | 99.8 / 33.4 / 64.18 |
| 90–120 | 116.5 / 39.0 / 61.60 | 133.1 / 37.2 / 62.38 | 133.0 / 32.7 / 61.52 | 133.0 / 29.8 / 62.13 |
| 120–150 | 99.7 / 36.5 / 55.85 | 99.7 / 43.2 / 55.94 | 99.7 / 38.6 / 56.90 | 99.8 / 39.0 / 56.78 |
| 150–180 | 83.1 / 30.6 / 42.09 | 66.5 / 39.0 / 42.70 | 66.5 / 34.5 / 41.63 | 66.6 / 32.6 / 41.53 |

The final B improvement in frame intervals is also present in A2. It cannot be attributed consistently to coalescing.

## Next isolated hypothesis: seam preparation scope

All four largest slow `renderBufferDirect` events identify the same unnamed MeshBasicMaterial/farGround recipe, `far-ground-native-water-mask-v1:seam-v2`: A1 **154.1 ms at 98.78 m**, B1 **140.4 ms at 98.64 m**, B2 **112.9 ms at 97.76 m**, A2 **106.0 ms at 97.83 m**. The containing renderer calls last 162.5/147.4/122.7/118.0 ms. These are synchronous wall times and can include GPU backpressure or uploads; the trace does not prove shader compilation caused them. Nested trace categories must not be added to GPU time or frame CPU.

Source inspection clarifies ownership: the main far-ground mesh is added to `candidate.impostors`, and an initial seam is also added there after its own preparation before the whole candidate warmup. Therefore the main soil is not omitted from candidate preparation. Subsequent discrete-bound seam replacements are separately prepared by `native-far-ground.js`, which calls `prepareNativeFarGpu` without forwarding the world's `farIsolatedPreparation` option. For native mapped water-mask ground its warm scene is the full `world.scene`; the replacement seam is not yet attached to candidate.impostors until that call succeeds. A separately isolated seam warmup is the concrete next source-level candidate, preserving the actual scene's lighting/fog recipe, fence/ownership/cancellation and old seam until replacement readiness. This is a hypothesis for a new branch and new native comparison, not a benefit demonstrated by this ABBA.

No geometry, assets, quality, shader recipe, runtime defaults or public files change in this evidence commit. Mobile behavior, visual acceptance during all movement, long-session memory and general FPS are not established by this measurement.
