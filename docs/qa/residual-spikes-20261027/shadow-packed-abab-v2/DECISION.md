# Reject packed shadow snapshots

All four runs passed provenance gates and completed without game/console/request errors. Same native lazy-fixed WASM, fixture, hardware, resolution and harness. Sequence A/B/A/B.

CPU World.render P99: A20.870 / B23.010 / A21.125 / B31.440 ms. Presentation P99: 50.010 / 50.095 / 50.015 / 99.785 ms. Presentation maxima: 83.235 / 133.340 / 99.975 / 166.325 ms. Intervals over100ms: 0 / 1 / 0 / 24. Both candidate runs fail to demonstrate benefit. The large final deterioration may include thermal or external load variation; do not attribute its full magnitude causally to the patch.

Decision: restore original shadow-cache.js and native-shadow.js from73a4bb36c. Preserve exact-value regression tests, expanded GPU readback fixture, benchmark tools and raw evidence. No production adoption. The improved native eviction implementation is independent and remains pending wider validation.

GPU readback after the performance sequence passed all16 checks, including active/inactive instanced data, count growth and removal, cached versus forced depth, view changes, alpha and light changes. This is an isolated correctness fixture, not full-world image equivalence or performance. First-pair real screenshots show no obvious art loss but different camera/time/wind prevent pixel equality.

The expensive original snapshot traversal is still a real profile finding. Packing alone does not solve the end-to-end cost and is discarded. A future approach needs a distinct, measured hypothesis about avoiding redundant traversal or eliminating unnecessary shadow work, not another storage-only variation.
