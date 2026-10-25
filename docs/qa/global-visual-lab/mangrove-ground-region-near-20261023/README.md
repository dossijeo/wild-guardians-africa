# Mangrove region cache experiment

Near visual probe only. Region crop MAE 1.201571, p95 maximum-channel difference 5. Cache storage 12.068466 MiB. Initial first tile blocked CPU for 92.4 ms despite compileAsync: rejected for streaming. Subsequent warmup experiment fixes where this first-use cost is paid; it does not erase it.

Raw benchmarks.json preserves parameters, CPU/GPU samples, scene state and errors.
