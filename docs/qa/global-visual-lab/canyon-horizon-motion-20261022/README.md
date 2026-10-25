# Canyon horizon normals: moving-camera A/B/A/B

Four fresh real campaign runs, seed 712, medium quality, 1280x720, paused simulation/day150. Thirty RAF warmup frames, then 180 frames moving 192 world units along the river. A original; B native `canyonNormals=smooth`. Same frame-index camera path and scene options. This is a short streaming diagnostic, not a broad performance certification.

|Run|CPU median / p95 ms|RAF interval median / p95 ms|Worker latency median ms|
|---|---|---|---|
|A1|5.0 / 7.1|16.8 / 43.1|92.6|
|B1|4.9 / 7.2|16.7 / 41.9|121.5|
|A2|4.7 / 6.4|16.7 / 35.0|94.4|
|B2|4.8 / 6.7|16.7 / 35.6|109.4|

CPU covers syncChunks and render submission. RAF intervals are not GPU time; no GPU query results were collected. Rendering is manually invoked once per measurement RAF; simulation is paused. Results cannot establish GPU savings or gameplay FPS improvement. Five horizon jobs per run; B preparation median 15.3/12.8 ms occurs in the worker.

Live residency differs: 20/180 and 16/180 corresponding frames have different triangle/draw counts because asynchronous updates complete at different times. Both arms span 299839–563508 triangles and settle to exactly 41 calls/431335 triangles at the same camera/target. Repeated A endpoint images are pixel-identical, as are repeated B images. No browser/GL errors; workers active. The test settles before endpoint capture. It does not prove every transient frame is visually equivalent.

Conclusion: the visual improvement remains worth retaining. Moving its preparation into the worker avoids directly executing it in render submission, but increases horizon delivery latency. No clear median frame regression in this short trace; p95 drift and residency differences prevent a strong performance claim. Keep opt-in, optimize generation rather than discard attractive shading solely for cost. Continuous night motion and longer traces remain pending. Sawtooth bank geometry is still unresolved.

Reproduce with Vite port 5190:
```powershell
$env:WG_REVIEW_BIOMES='gran-canon'
node tools/experiments/benchmark-canyon-horizon-motion-20261022.mjs
python tools/experiments/summarize-canyon-horizon-motion-20261022.py
```
Raw motion.json includes every measured frame and worker job. summary.json and residency-audit.json distinguish latency, CPU, RAF and draw differences. Endpoint PNGs preserve before/after evidence.
