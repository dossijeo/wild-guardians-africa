# Early-discard cost: inconclusive

Full-background medium1280x720 Intel UHD static ABAB. Both arms use identical balanced shoreline and opaque core; only discard placement changes. 720 valid GPU timer samples, no query errors, zero paired workload mismatches. Raw and summary files include CPU, cadence and percentiles.

| Phase/pair | Balanced GPU ms | Early GPU ms | Delta |
|---|---:|---:|---:|
| Day1 |13.343|14.079|+0.736|
| Day2 |13.792|11.574|-2.218|
| Night1 |14.723|15.513|+0.790|
| Night2 |14.289|14.458|+0.169|

No consistent performance advantage demonstrated. Keep early discard as QA only; do not promote based on one fast run. Preserve balanced bank artistic candidate independently. Reload/order/thermal variability remains a limitation; a single-world shader-swap experiment could isolate the timing further if warranted. Current priority is movement/streaming validation of the retained art.

Residual-context.png in ../canyon-early-bank-20261022 locates the12–13 differing image pixels beside a building rather than the water; cause not established. Four other native views remain exact. No claim of whole-scene exact parity or compatibility with arbitrary alpha-map materials.

Reproduce using measure-canyon-early-bank-cost-20261022.mjs and audit-canyon-early-bank-cost-20261022.py, server5190, no competing browser benchmarks.
