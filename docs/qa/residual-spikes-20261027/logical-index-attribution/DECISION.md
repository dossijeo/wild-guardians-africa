# Do not retain regional index

Prototype f3baf8229 passed 12 tests, including 120 exact differential selections/LOD/matrix checks. The real-game diagnostic completed with no errors or failed requests. However, logical-preload P99 is 1.825 ms versus 1.640 ms in the preceding original diagnostic; far-total P99 is 10.625 versus 9.705 ms. Per-call mean preload is also essentially unchanged (0.0574 versus 0.0584 ms). Counts differ, so accumulated totals cannot be compared as savings.

This single instrumented pair is not proof of regression. It does not support the hypothesis that bounding the input spatially materially reduces the costly selection. Do not add ownership and memory complexity on this evidence. Restore production source and remove the index/tests; preserve the candidate patch and original commit for reproduction. Existing ten logical standby tests pass after restoration.

The remaining selection sorts candidates while recomputing Math.hypot twice per comparison. A future hypothesis must isolate that repeated arithmetic using the same candidate population and exact output, rather than retaining the unsuccessful spatial index or changing draw counts. No global improvement or visual acceptance is claimed here.
