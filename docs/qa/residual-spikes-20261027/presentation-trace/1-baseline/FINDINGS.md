# Browser presentation trace

Bounded 40.257-second streaming trace completed, 784877 events, no reported trace data loss. User Timing markers identify the window. Renderer main, compositor, GPU process and worker threads are present. Source hashes and raw gzip trace retained.

Longest GPU-process task: 109.637 ms, nested WebGL command-buffer flush 109.460 ms. DXGI Present reaches about 75.7 ms. Renderer main task max about 53.8 ms. These are CPU-thread wall durations including waits, not GPU execution durations; nested events must not be added. They expose work outside World.render but do not establish a specific driver or hardware fault.

Next compare a visible-browser untraced control with the headless harness and associate slow intervals with command-buffer/presentation events. Do not optimize unrelated scene functions to explain missing time or claim a whole-game improvement from this trace. Tracing itself is expensive (157 MB uncompressed); it is disabled by default and not a production feature.

Reproduce: run-regional-tail-phases.mjs with output directory and --trace, then summarize-presentation-trace.mjs with the 1-baseline directory. Diagnostic only; no renderer behavior change.
