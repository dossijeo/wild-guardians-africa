# Mangrove region cache experiment

Same-format offscreen shader compile and 1×1 warm draw before tile generation. Compile wall 123.1 ms; warm draw CPU 27.7 ms. Tile CPU 0.1–0.3 ms, GPU 0.090–0.309 ms. Output exactly matches the previous near probe (maximum pixel delta 0). Startup warmup remains a real cost. No live-streaming claim.

Raw benchmarks.json preserves parameters, CPU/GPU samples, scene state and errors.
