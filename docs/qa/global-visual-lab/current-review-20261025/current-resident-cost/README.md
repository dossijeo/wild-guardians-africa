# Current resident cost: Manglares

Two fresh serial runs on Intel UHD 0x9A60 / ANGLE D3D11, Chrome, 1280×720,
media. Selected current review recipe, fixed512 ground, holly fern LOD,
full backgrounds, pthreads and scheduler. Native default streaming policy:
waterBed/waterShore/batchEviction/warmObstruction/retainPrograms all true.
No renderer source edits. Measured at e586b0e89 with pre-existing unrelated
worktree changes preserved; executed harness/source hashes accompany each run.

| Metric (ms) | r1 | r2 |
|---|---:|---:|
| GPU elapsed mean | 22.230 | 21.621 |
| GPU elapsed P95 | 26.644 | 24.603 |
| CPU render mean | 6.334 | 5.952 |
| Presentation mean | 24.272 | 23.556 |
| Presentation P95 | 33.440 | 33.420 |
| Presentation maximum | 50.135 | 49.875 |

Each run: 60 warm frames, 360 authored stationary frames plus 12 idle confirmation
frames, 125 valid GPU samples and no disjoint. Frozen populated simulation,
identical camera/target/workers/elapsed/native residency and effective options
verified by summarize-current-resident-cost.py. No new chunks during measurement;
far preparation settled. No errors except existing X4000 shader warnings.
Native memory capacity 16 MiB and 25 chunks remain constant; this is not GPU VRAM.
GPU elapsed includes pipeline bubbles. CPU render includes draw, not additive.
Loading readiness 32.635/33.207 seconds is contextual, not controlled cold-cache
load evidence. No video recording or parallel benchmarks were run.

Both final screenshots were inspected at full resolution: approved moss/bare
patches, dense fern cover, water margin, buildings, cast shadows and distant trees
remain present. Mean absolute pixel difference between repeats is 0.001309 on
0–255 RGB scale, not exact identity. Sources are real screenshots including HUD.

Interpretation: the selected stationary day scene falls around 22 ms GPU on this
hardware. This supports retaining the approved art, but does not demonstrate an
optimization relative to main, 60 FPS, or comparable cost during active streaming.
The roughly 50 ms presentation maxima remain visible in the measurements and are
not hidden by reporting only GPU means. Night, low quality and the other biomes
require their own matching current-condition evidence.

## Protocol correction retained

manglares-media-r1/r2 (without default in filenames) are earlier diagnostic runs
from this session. They used harness overrides with waterShore, batchEviction
and warmObstruction disabled. Preserve their reports and source hashes, but do
not pool them with the default-policy runs or call them a production baseline.
This was detected from the effective URL/policy before drawing conclusions.
The reusable runner sets WG_THREAD_DEFAULT_STREAMING=1; the summarizer rejects
explicit overrides of the five affected settings. No legacy policy is changed.

## Reproduce

With Vite on 5190, run `python tools/experiments/run-current-resident-cost.py
--biome manglares` then `python tools/experiments/summarize-current-resident-cost.py
--biome manglares`. The runner refuses to overwrite reports: use a fresh output
location for another set. It supports each of the six biomes and media/baja.
Reports from different biomes are not equivalent workloads or A/B speed claims.
