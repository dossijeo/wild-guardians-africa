# Reconcile previous negative evidence before further water changes

The 16.6 ms regional water-input cost is real but was already characterized in FAR-GROUND-ATTRIBUTION.md and removed experimentally in far-water-skip-abab and far-water-stream-abab. Those interleaved comparisons did not show a repeatable presentation benefit; some delivery/CPU tails worsened. Strict pixel equality also remained unresolved. Do not repeat skipping the attribute, or merely moving it to a worker, without a new measurable end-to-end hypothesis.

New analysis of the integrated-water ABAB: the 27 / 37 / 35 / 33 RAF intervals above 100 ms overlap neither a measured render invocation above 33.333 ms nor a recorded synchronous regional/scheduler unit above 16.667 ms. Associated render GPU queries exceed 50 ms in only 10 / 13 / 10 / 6 of those intervals. These observations do not prove idle CPU, GPU causation, thermal throttling, or display latency: timestamps reflect callback scheduling, instrumented spans are incomplete and GPU queries can contain bubbles.

Next diagnostic should record a bounded browser performance trace around the same camera traversal, including renderer main thread, compositor/GPU scheduling and RAF cadence. Inspect actual trace coverage before attributing missing time. Avoid another series of local water optimizations that does not address the dominant presentation symptoms. Preserve the validated incremental water implementation as experimental pending broader acceptance.

Reproduction: node tools/experiments/analyze-water-abab-slow-frames.mjs. Raw reports already archived in integrated-water-abab; decompress before analysis. Association details retained in slow-frame-associations.json. No production change in this step.
