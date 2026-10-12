# Exact open-route witness cache experiment

Branch `codex/raid-open-proof-cache`, isolated from active/stopping campaigns.
One QA runtime file differs from the stopped candidate-5 source inventory:
`tools/static-animal-certificate-cache.mjs`. The other 468 reviewed hashes
match. No economy, player policy, damage, crop growth or physical navigation
rule is changed. No main integration or new campaign launch yet.

The original cache retained only positive enclosure certificates. A physically
proved open route could be recomputed repeatedly. The experiment also stores
two native rejection reasons: `native-service-route-open` and
`native-service-direct-route-open`, with exact state identity, target tuples,
geometry signature and provider identities. It always reuses a rejection,
never marks an incomplete perimeter protected.

No negative reuse for timeout, missing component certificate, unproven origin,
bounded search exhaustion or worker-service failure. Changed crops, geometry,
proposal, bounds, outline, suppression or providers invalidate it. There is
one weakly held open-route entry per proof view, without a global growing list.
Worker checks still run separately before the animal proof.

## Evidence

49 unit/regression tests pass, including original positive/superset cache tests,
negative invalidation and explicit no-cache behavior.

The native replay loads the archived good-management day-10 snapshot and its
actual completed outline. It uses the real wall quote, full stable perimeter
proof, worker-service V3 and existing gate-animation invariant. No navigation
method is replaced. The baseline loader replaces only the cache module with
its exact archived original source, under the same module URL.

Two paired runs occurred chronologically **B/A/B/A**, not A/B/B/A. Each process
made two identical native proof calls. CPU profiling was enabled on the shared
desktop; cold timings should not be treated as noise-free benchmarks.

| Pair | Original first / repeat | Candidate first / repeat |
|---|---:|---:|
| 1 | 12,141 / 10,632 ms | 11,743 / 87 ms |
| 2 | 15,242 / 13,492 ms | 13,621 / 139 ms |

All eight calls reject with `native-service-route-open`; every process preserves
the exact serialized native state. Full semantic proof data match after excluding
only diagnostic work counters (`poses`, `blocked`, `certified`, physical/origin/
component counters, region count and terrain profiling diagnostics). Raw outputs
are retained. These exclusions are not visual or physical acceptance thresholds.

Repeated-query cost falls about 99% in these two pairs. The initial proof still
takes 12–15 seconds: this does **not** establish acceptable campaign throughput,
60 FPS, lower GPU cost or a general fix for expensive first-time planning.
The candidate must be tested with a full policy replay and many changing layouts
before any new 100-night launch. The normal campaign's outstanding cooperative
stop must also be observed to completion; do not edit its frozen runtime.

The first profile highlights terrain lattice lookup, fluid queries, wall bounds
and native segment clearance as remaining work. Preserve these limitations
instead of declaring the original performance gate passed.

## Reproduction

Run from the repository root, using fresh output paths:

```
node --test tests/static-open-route-cache.test.js tests/static-animal-certificate-cache.test.js
node --cpu-prof --cpu-prof-dir=.cache tools/check-native-open-route-cache.mjs .cache/fresh-candidate.json
node --cpu-prof --cpu-prof-dir=.cache --experimental-loader ./tools/open-route-cache-baseline-loader.mjs tools/check-native-open-route-cache.mjs .cache/fresh-baseline.json
```

The replay uses the tracked compressed snapshot/partial in
`docs/qa/integrated-spiritual-survival/candidate5-performance-stop/good/`.
The loader's original source is archived beside this report. Historical source
launchers correctly reject this changed QA file until a new explicit review.
