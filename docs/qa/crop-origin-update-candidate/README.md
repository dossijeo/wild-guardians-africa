# Crop origin update candidate — not adopted

Production already compares Float32 attributes, retains pending update ranges, caches immutable terrain heights and uses one shared wind clock. Stable plants do not upload their matrices or growth attributes again. This experiment only avoids setting all 72 original/bridge mesh positions when the render origin has not changed, and retains a single list for update/disposal rather than allocating it each frame.

The candidate passes the eight existing crop-upload tests, including recentering, reordering, dynamic heights, stable wind updates, bounded ranges and disposal. All presentation buffer hashes match across each A1/B1/B2/A2 group. This is not a native image comparison.

CPU-only synthetic geometry: 60 warm-up updates, then 600 samples for 1,200 plants or 2,000 samples for 128 plants, in four separate sequential processes. Background intensive campaigns remained active. The world starts with capacity 128 and grows its single batch when visible plant count exceeds capacity; the large-batch case therefore matters as well. Values below are p50 / p95 milliseconds.

| Plants / state | A1 | B1 | B2 | A2 |
| --- | --- | --- | --- | --- |
| 128 mature | .0259 / .1564 | .0224 / .1242 | .0230 / .1475 | .0235 / .1525 |
| 128 paused morph | .0408 / .1493 | .0253 / .1452 | .0279 / .1511 | .0413 / .1562 |
| 128 mixed growing | .0693 / .3316 | .0627 / .3070 | .0653 / .2967 | .0666 / .3206 |
| 1200 mature | .2543 / .7407 | .2602 / .7750 | .2643 / .5605 | .2752 / .4429 |
| 1200 paused mixed | .5833 / 1.2784 | .5395 / 1.4459 | .5488 / 1.2397 | .5732 / .9103 |
| 1200 mixed growing | .7439 / 2.7968 | .7786 / 4.4933 | .7284 / 4.4194 | .6880 / 2.6356 |

There is a small repeatable benefit in some small stable cases, but no consistent benefit across the large farm workload, and the large mixed-growing p95 is worse in both candidate processes. These observations do not isolate causality from background scheduling or GC. The candidate remains archived; production is unchanged. No claim of GPU, integrated frametime, FPS or mobile improvement.

`proof.json` contains all five states, source hashes and exact samples summaries. Gzipped JSONL files retain the raw process outputs. To reproduce, decompress the source snapshots into `.cache/`, then run `node tools/benchmark_crop_uploads.mjs 1200 600 .cache/crop-origin-baseline.mjs synthetic` and the candidate counterpart in A/B/B/A order; repeat with `128 2000`. The copied test file in the same directory runs with `node --test .cache/crop-origin-candidate.test.mjs`. The import adjustment for the baseline is only its relative rules-module path; production recipes are preserved.
