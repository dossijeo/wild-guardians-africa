# Stationary resident-mask cost

Intel UHD, Sabana media, 1280x720, paused simulation, fixed camera, 60 warm frames then 360 measured frames. Interleaved A/B/A/B; A clips the full rectangle, B uses installed-chunk coverage. All four runs created zero chunks, had unchanged simulation, matched camera/target/options/workers and no unexpected errors. GPU timer supported, zero disjoint events, 121 samples each. The verifier checks URLs differ only by the mask flag.

| Run | GPU elapsed mean ms | Presentation mean ms | Presentation P95 ms |
| --- | ---: | ---: | ---: |
| A1 | 16.783 | 18.846 | 33.265 |
| B1 | 16.593 | 18.615 | 33.270 |
| A2 | 17.673 | 19.770 | 33.335 |
| B2 | 16.813 | 18.707 | 33.305 |

No clear stationary overhead is observed, but two repetitions are insufficient for a speedup claim. Queries measure GPU elapsed intervals including pipeline bubbles. This test does not measure the extra visible fallback surface while chunks are missing, shader cold compilation, or other biomes/qualities. The mask adds a 256-byte source texture without mipmaps; driver allocation granularity and total VRAM were not measured. No extra rendering pass or draw object is introduced by the implementation.

Retain the opt-in candidate for remaining validation: it fixes visible holes in inspected motion checkpoints without a demonstrated stationary penalty. Do not promote globally from this narrow benchmark. Original reports and final screenshots accompany this note. Reproduce using check-spatial-thread-game.mjs with WG_GROUND_RESIDENT_MASK=0/1, WG_THREAD_DISTANCE=0, WG_THREAD_FRAMES=360, WG_THREAD_GPU=1, WG_THREAD_FROZEN=1, WG_THREAD_BENCH=1 and the current review/media/pthreads/scheduler options in the recorded URLs; do not enable WG_THREAD_ACTIVE.
