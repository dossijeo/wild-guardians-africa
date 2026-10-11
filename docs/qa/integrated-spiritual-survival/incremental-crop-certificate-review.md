# Incremental positive crop coverage candidate

Explicit experimental option `incrementalCrops: true`; default QA behavior and
production remain unchanged. The 100-night campaign remains stopped.

When geometry/method/configuration signatures match, unchanged surviving crops
retain their original certificate. New crop IDs receive fresh native service
component checks: all 32 attack poses per species radius from the original
exterior origin, native swept-body/contact checks, and positive enclosed origin
components. Modified/reordered survivors, obstacles, suppression or epochs force
complete recomputation. Workers/crop service checks remain fresh on every call.

A failed addition is returned as failure, never recorded as positive coverage.
The prior positive certificate for prior crops may remain: future attempts must
physically evaluate the added targets again. No negative result is cached. This
allows a fast decisive rejection without replaying already certified targets.

Counters retain original `services` and separately record cumulative
`incrementalServices` pose totals and latest target IDs/diagnostics. Coverage
explicitly reports cumulative certified census, live census and retired anchors.
Neither historical counters nor retired anchors are represented as fresh work or
living plants. Storage retains one positive certificate per native view.

## Native frozen-snapshot evidence

Five real mijo purchases debit exactly 25 coins on separate disposable v111
snapshot copies. No ticks, synthetic income or original snapshot modification.

| Interior planting checkpoint | Complete certificate | Incremental candidate |
|---|---:|---:|
| Initial cold | 10865 ms | 10822 ms |
| After one new crop | 12708 ms | 114 ms |
| After five new crops | 13036 ms | 313 ms |
| Repeat after five | 38 ms | 41 ms |

The exposed bounds control remains invalid at every post-planting checkpoint:
2709 ms vs 65 ms after one plant, 2396 ms vs 12 ms after five. Repeated failures
still execute native checks. Cold bounds observations are 11044 vs 12141 ms; this
variation is retained and is not claimed as an improvement.

These sequential observations are not AB/BA, GPU or whole-campaign benchmarks.
Comparison tools assert identical placements, money, native source hashes,
worker-service results, relevant exterior/interior origins and total certified
pose accounting. Failed results identify the same exposed crop and attack point.

## Independent tests

44 tests pass across static certificate caching, worker v3 and integrated proofs.
A Canyon paid-contour fixture independently recalculates all current targets
from every retained exterior origin on fresh native views, then checks a complete
uncached certificate. Both pass and worker checks match exactly; state is unchanged.

The first test search requested a four-metre interior margin and found no valid
native point. A near-edge point instead produced `native-service-origin-unproven`:
this is retained as a separate rejection test, also rejected by complete uncached
certification. The positive test uses a native-valid point at least 2.5 metres
from the outline. No proof logic was weakened to make that fixture positive.

The sampled-pose certificate is not a universal continuous-angle theorem. Cold
geometry invalidations and prop suppression still require full native work.
Accumulated census size and short native policy throughput need further measurement.
Do not infer acceptable campaign performance or survival solely from these probes.

```powershell
node --test tests/static-animal-certificate-cache.test.js tests/native-worker-service-v3.test.js tests/native-integrated-perimeter-proof.test.js
node tools/probe-native-plant-certificate-cost.mjs STOPPED_V111_DIRECTORY FRESH_OUTPUT_JSON interior incremental
node tools/probe-native-plant-certificate-cost.mjs STOPPED_V111_DIRECTORY FRESH_OUTPUT_JSON bounds incremental
node tools/compare-native-plant-certificates.mjs BASELINE_JSON CANDIDATE_JSON FRESH_COMPARISON_JSON
```
