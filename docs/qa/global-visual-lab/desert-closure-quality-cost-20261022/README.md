# Desert closure candidate: medium / low viability

Static actual settlement, seed712,1280x720, full backgrounds, frozen closure recipe. Medium/low/medium/low with day/night,60 warmup+90 GPU samples and separate cadence measurements.720 valid queries, no disjoint/errors. Both repeated profiles retain their own draw/triangle counts; cross-profile counts intentionally differ. This compares quality tradeoffs, not equivalent-image optimization.

| Phase | Medium GPU runs ms | Low GPU runs ms |
|---|---|---|
| Day |13.643 /12.715|13.167 /13.643|
| Night |14.758 /16.481|13.698 /14.017|

CPU render means3.1–3.8ms. Cadence means medium day16.63ms, night18.16/17.42ms; low16.62–16.99ms. These are paused/static measurements, not an FPS guarantee in active gameplay. Intel UHD reported by raw data. No steady daytime advantage from low; lower nighttime GPU in both pairs. Low removes projected shadows and reduces LOD, so do not call it same-quality acceleration.

Recommendation: preserve medium as art-reference profile for accepted Desert shadows; retain low fallback. Current static evidence does not compel sacrificing the shadows. Populated campaign, continuous camera and streaming performance still needed for closure. Raw benchmarks and audit script are reproducible; no source renderer change.

Run measure-desert-closure-quality-20261022.mjs then audit-desert-closure-quality-20261022.py with server5190 and no competing benchmark.
