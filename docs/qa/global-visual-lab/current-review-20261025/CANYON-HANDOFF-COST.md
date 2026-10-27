# Canyon handoff cost pilot: A/B/A/B

Intel UHD 0x9A60 via ANGLE D3D11, 1280x720, media, pthreads, Global Frame Scheduler. Same populated fixture, paused simulation, native camera/time 150. Sixty warm frames, then 180 camera samples along Z (0.8 m/sample), followed by settling. A: original; B: horizonHandoff=atomic. Capture disabled during measured travel. Conditions checked by summarize-canyon-handoff-cost.py; GPU queries supported, no disjoint, no unexpected errors.

| Run | GPU mean ms | CPU render mean ms | Presentation mean ms | P95 ms | P99 ms | Max ms | Travel + settle ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A1 | 17.116 | 7.055 | 21.224 | 33.335 | 33.540 | 149.455 | 6834.25 |
| B1 | 16.652 | 7.002 | 20.512 | 33.325 | 33.525 | 49.860 | 6850.94 |
| A2 | 16.915 | 6.584 | 20.725 | 33.280 | 33.460 | 133.180 | 6984.32 |
| B2 | 16.248 | 6.840 | 19.791 | 33.310 | 33.435 | 33.540 | 6867.58 |

All created 15 chunks and settled with 29 native chunks, 16 MiB WASM linear memory. The latter is not GPU memory and does not measure transient retained geometry. 108–116 GPU queries per run. GPU intervals may include pipeline bubbles. CPU render calls and presentation intervals measure different quantities.

Conclusion: this bounded pilot shows no obvious sustained cost increase or added total settling latency; P95/P99 are effectively unchanged. Lower maxima in B are encouraging but not causal proof with two repetitions. Do not claim general GPU speedup: old/new horizon visibility differs during handoff and A can expose missing ground. This is the cost of correcting coverage, not an equivalent-image optimization benchmark. Wall-clock travel speed differs because the trajectory uses frame samples. Loading times and active-simulation throughput are not assessed.

Combined with the separate 2408-frame coverage check, the candidate remains promising. Still required: peak graphics memory, cancellation/exit during held work, forced rebuild handling, active-simulation cost and seam inspection. Do not enable by default yet.

Reproduce check-spatial-thread-game.mjs with WG_CURRENT_REVIEW=1, WG_THREAD_PORT=5190, WG_THREAD_BIOME=gran-canon, WG_THREAD_QUALITY=media, WG_THREAD_FROZEN=1, WG_THREAD_RETAIN_APP=1, WG_FRAME_SCHEDULER=1, WG_THREAD_BENCH=1, WG_THREAD_GPU=1, WG_THREAD_FRAMES=180, WG_THREAD_DISTANCE=144, WG_THREAD_AXIS=z, WG_THREAD_POSE_FILE pointing to canyon-handoff-cost-pose.json. Alternate WG_HORIZON_HANDOFF=off/atomic/off/atomic and distinct WG_THREAD_REPORT paths. No quality/context fault injection in these runs.
