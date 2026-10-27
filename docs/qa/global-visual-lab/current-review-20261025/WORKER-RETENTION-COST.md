# Actor residency cost pilot

A/B/A/B, Manglares, media, 1280x720, original daytime fixture, active simulation, 180 authored camera frames over 96 m. A disables actor residency; B enables it. Pthreads, scheduler, graphical recipe and GPU query instrumentation are identical. The verifier checks hardware, options, camera, generated chunks and simulation continuity.

| Run | Mean presentation ms | P95 ms | Max ms | Mean GPU elapsed ms | Native chunks |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 | 43.93 | 82.99 | 116.47 | 35.41 | 25 |
| B1 | 42.33 | 82.97 | 116.49 | 33.50 | 26 |
| A2 | 41.48 | 66.60 | 116.22 | 33.01 | 25 |
| B2 | 41.48 | 83.18 | 99.97 | 33.23 | 26 |

All runs created 10 chunks, had 180 ready-actor samples and zero paused samples; no unexpected errors. WASM linear memory remained 16 MiB in all four runs. B retains one extra native chunk, not an extra graphical chunk. This does not measure total process memory or prove zero allocation overhead.

There is no consistent overall performance improvement. B2 has a worse P95 than A2, while the first pair is effectively equal; two repetitions cannot attribute that variation to residency. Mean GPU elapsed also does not move consistently. GPU queries include pipeline bubbles. Frame samples include final streaming drain, which explains differing sample counts. Active simulation follows wall time, so this is not pixel-identical simulation state.

Residency is a correctness mechanism, not an FPS optimization: corrected night tests demonstrate why data needed by workers must outlive graphical eviction. This pilot finds no consistent mean-frame penalty but does not exclude tail regressions or costs in larger populations. Keep QA gating until that limitation is addressed. No rendering, vegetation density or simulation rules were changed for this comparison.
