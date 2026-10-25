# Original dither streaming control

Same seed712 Mangrove campaign, medium quality, native Wild Engine-backed backgrounds, 1280x720, 0/96/192/96/0m day/night path. `WG_SMOOTH_FAR=0`; directory labels retain `native` to identify the actual renderer (not smooth mode).

The original route also changes its return image: 10564 daytime / 8262 nighttime pixels. Smooth returns changed 10556 / 8589. Thus return-image differences are not unique to smooth transparency. This does not establish every changed pixel has the same cause.

All ten smooth-vs-original checkpoints differ in workload by exactly the complementary opaque pass: +4 calls, +2190–2206 triangles depending on region. No additional workload discrepancy. Both use the same canonical region/instance selection; the measured counts support equivalent selection workload through this excursion. No browser/WebGL errors. Cleanup check passes with zero smooth resources expected in the original route.

`workload-comparison.json` contains each pair; captures and `stream-audit.json` retain return differences. Reproduce with `WG_SMOOTH_FAR=0`, `WG_REVIEW_OUT` set to this directory, and the native stream harness. This is not continuous-motion or CPU/GPU timing evidence.

Recommendation: retain the native smooth option for art and continue measured motion/quality validation. Do not reject it for the pre-existing return-state difference; investigate that stateful behavior separately if it produces visible popping. Do not enable globally yet or claim full transparency ordering is solved.
