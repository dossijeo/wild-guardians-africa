# Smooth far transitions: moving full-scene validation

Sabana, seed 712, Mapungubwe, media, 1280x720; actual paused Wild Engine campaign. Native distant impostors and 2D mountain backdrop enabled. Same camera path, phase, grass and material clock. Day 150 / night 350. Warmup, dither, alpha, return-to-dither in one world per phase. Streaming remains enabled. No production shader/default change.

## Result

- All 240 frame-index camera positions and submitted draw/triangle counts match before/alpha/return in both phases.
- All ten before/return PNG checkpoints are RGB exact (0 differing pixels).
- Both variants submit 85–92 calls and 1,391,183–1,935,813 triangles along the path. Renderer counts stay at 204 geometries / 83 textures (resource counts, not VRAM bytes). Each pass reports background preparation pending on 53 frames; identical draw counts do not prove those asynchronous transitions are universally correct.
- No reported page or WebGL errors. Far background and mountain backdrop present throughout each recorded pass.
- Checkpoints show removal of the conspicuous dotted coverage on middle/far trees, with the near scene preserved. The candidate is worth retaining. These views do not prove general overlap-order correctness: standby rows remain near-first, whole transparent batches disable depth writes, and front-face culling cannot remove every overlapping foliage layer.
- No performance conclusion: recording and PNG readback perturb frame times. Use the separately documented static ABAB results for measured cost, with their limitations.

## Review

[Day comparison](day-after-contact.jpg) / [night comparison](night-after-contact.jpg).

Videos: [day original](sabana-media-before-day/motion.webm), [day alpha](sabana-media-after-day/motion.webm), [night original](sabana-media-before-night/motion.webm), [night alpha](sabana-media-after-night/motion.webm).

MediaRecorder encoded 235 frames per video from 240 requested captures, with wall-clock durations of approximately 8.5â€“9.0 seconds. Videos are qualitative, not frame-synchronized A/B proof. PNG checkpoints and frame logs provide the deterministic comparisons. Static vegetation/material time intentionally isolates transition behavior; this does not test wind.

This is a local 24-unit lateral excursion around one warmed area, not a long-distance streaming/leak stress test. Other biomes and denser foliage overlaps remain to validate before native adoption. No claim that all dithering paths have been removed.

## Reproduce

With Vite at port 5190:

```sh
node tools/experiments/capture-far-transition-motion-20261022.mjs
python tools/experiments/audit-far-transition-motion-20261022.py
```

Raw logs: captures.json; comparison audit: audit.json; decoder metadata: video-audit.json. Retain warmup and return captures as controls.
