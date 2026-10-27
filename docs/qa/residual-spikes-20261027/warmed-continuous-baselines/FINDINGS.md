# Warmed original-runtime A/A

No production change. Both runs use Intel UHD, 720p medium, the same agricultural save, 25 resident chunks, empty preparation queues and identical camera/target. Both visit 40 distinct chunks during a 40-second active-simulation excursion. Warmup reaches simulation elapsed 30 seconds, then waits for 60 stable-residency frames. Actual start elapsed remains 31.319 versus 32.064; dynamic actors are not forced to identical state.

CPU render P95 16.13 / 19.55 ms; P99 21.795 / 24.935; maxima 33.115 / 31.93. Presentation P95 49.93 / 99.83 ms; maxima 99.60 / 149.765. No page or console errors. Screenshots start 156 / 189 ms after the measurement window, so they cannot explain these measured tails. This protocol did not establish adequate baseline stability. Neither run is an optimization treatment.

GPU-query statistics in comparison.json are joined to timed CPU frame IDs; no disjoint events. They cover elapsed GPU query intervals, including possible bubbles/driver scheduling, not exclusive shader execution. Variation remains and no thermal/background-process cause is established. Do not accept small performance gains against either reference in isolation.

Reproduce with node tools/experiments/run-warmed-continuous-baselines.mjs, then node tools/experiments/compare-warmed-continuous-baselines.mjs. Raw reports are preserved as gzip; decompress to their original names before rerunning the comparator from a fresh checkout. Provenance records runtime/fixture hashes and all WG settings. Default spell-visibility capture behavior remains unchanged; delayed capture is opt-in for performance controls.

Next bounded hypothesis from source audit: smooth-far-transitions invalidates sorted instance copies with all 16 view elements, although depth ordering depends only on elements 2/6/10 plus instance attributes and height. Camera translation should not require resort/copy/upload. Validate orientation/attribute/height/origin invalidations and measure actual avoided uploads before any production adoption. No implementation or benefit claimed yet.
