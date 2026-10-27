# Host load observation after browser-mode comparison

No Chrome process remained at inspection. A 10-second, five-sample observation found ChatGPT process CPU activity around 1.09–1.22 core equivalents, plus other processes. About 22.6 million KiB physical memory remained free. This is later than the benchmark and is NOT evidence that these processes caused its slow frames. No process was stopped.

The sampler also consumes CPU: one observed pwsh interval reached 0.32 core equivalents. Therefore do not silently add it to performance acceptance runs or call its cost negligible. It is an optional diagnostic; use matched instrumentation or longer intervals, retain elapsed interval lengths, and measure observer overhead. It does not measure GPU utilization, clocks, thermal throttling or display scheduling.

Next use repeated fixed-scene windows inside one browser session to separate workload variation from time-dependent variation, then a matched diagnostic with host measurements if needed. The existing active streaming results remain valid observations, but lack a proven cause for their large A/A variance. Do not attribute a rendering regression or success from the unusually fast run alone.
