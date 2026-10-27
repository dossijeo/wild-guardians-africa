# Isolated nearest-surface fade: controlled cost

Reproduce with Vite on port 5190: `node tools/experiments/measure-isolated-fade-depth.mjs`, then `python tools/experiments/audit-isolated-fade-performance.py`.

Intel UHD / ANGLE D3D11, 1280x720, Sabana baja seed 712, view 17. ABBA per day/night; 960 valid GPU samples and 1440 separate cadence frames. One partial object is held at 35% opacity in both variants; obstruction updates are frozen after the first camera-step render. This differs from the earlier visual capture's two partial objects. All blocks have the same active count and coverage. The initial unfrozen run under `performance/` is excluded: warm-up completed the fade, leaving zero partial objects.

| Phase | Smooth GPU block means (ms) | Isolated GPU block means (ms) | Smooth render-entry interval means (ms) | Isolated interval means (ms) |
|---|---|---|---|---|
| Day | 19.91 / 20.45 | 18.52 / 17.04 | 21.60 / 21.84 | 20.98 / 21.05 |
| Night | 19.66 / 21.19 | 17.06 / 17.72 | 22.19 / 23.92 | 21.24 / 21.11 |

CPU render means overlap (3.31–3.57 ms). Draw calls increase 78 to 79 and submitted triangles 1,347,354 to 1,357,035: this is a depth pass that rejects hidden color fragments, not triangle removal. The measured GPU reduction is promising but does not establish a general gameplay FPS gain. Two blocks per variant are not confidence intervals; camera and world are stationary, opacity artificially held, and actual moving fades remain to be measured. No timer disjoint/error flags were recorded.

One isolated target was retained, nominally 7.03 MiB for RGBA8 plus uint32 depth at this resolution, excluding driver overhead. Renderer texture counters vary with residency and are not VRAM measurements. Do not interpret their similar totals as zero additional memory.

Keep the visual candidate. Next validate moving camera and real transparent effects, then optimize target allocation/area before integrating beyond QA. Main is untouched.
