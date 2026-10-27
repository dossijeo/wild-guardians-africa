# Detailed GPU trace

Opt-in gpu.decoder/service/device categories over 8.109 seconds expose TraceCmd async b/e intervals. Several kBufferSubData intervals reach 39.7–45.9 ms inside WebGL trace intervals. Do not label these JavaScript call time or isolated GPU execution: tracer semantics and prior-work dependencies need verification. The longest renderer main task is 86.297 ms; the former 109 ms flush was not reproduced in this shorter run. No direct comparison is valid across instrumentation and duration changes.

Next identify buffer upload owners, targets, sizes and update frequency, then relate them to trace intervals. Hypothesis: updates of in-use buffers may wait for previous work; not proven. Preserve partial dirty ranges and visual/instance equivalence. No runtime change justified yet.

Category source: https://chromium.googlesource.com/chromium/src/+/main/base/trace_event/builtin_categories.h . CDP Tracing.getCategories returned an empty list both before and after page creation on this host, so declaration alone was not treated as availability; actual events confirm emission. Reproduce with run-regional-tail-phases.mjs OUTPUT --trace --gpu-detail.
