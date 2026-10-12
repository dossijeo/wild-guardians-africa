# Exact watering approach cache — experimental checkpoint

Branch `codex/watering-route-cache` starts from experimental recovery source
`14109b6c`. It must not be merged wholesale into production main: that ancestry
contains unapproved balance changes. No live campaign or main-based regression
source is patched by this experiment.

The current live CPU capture identifies watering approach selection inside
native task reservation as a dominant sampled stack. This candidate caches
only exactly repeated geometric watering queries. The underlying algorithm is
unchanged; its uncached source is frozen in the reference fixture, with its
original hash and only import paths adjusted.

Admission requires a real integer navigation epoch and a state identity.
Exact worker/target coordinates, body radius, crop identity/species and avoided
terrain form the key. Navigation version, state, terrain, obstacles, suppression,
prepared-path identity and query implementations form the invalidation context.
Adapters lacking an epoch bypass caching. Epoch changes during a query prevent
its admission. Both null and accepted answers are reusable; every returned
accepted route is copied so movement cannot consume the private cached path.

The cache is limited to 8,192 entries and 20,000 retained path points per
navigator, uses WeakMap ownership and stores no worker/crop object references.
Queries beyond the point limit are not retained. It changes no task ordering,
worker speed, growth, pay, purchase, crop resistance, powers or animal rules.

## Directed validation

- 42 watering, physical approach, building route and cache tests pass.
- After extending the two actual Canyon fixtures with a new enclosing solid
  and its removal, all eight cache tests pass again.
- Native repeats and reload match the frozen uncached destinations/waypoints.
- New solid placement invalidates an accepted route; removing it reopens a
  native swept-body-valid route.
- Tests cover mutable path isolation, failed-query reuse, exact input changes,
  epoch/world replacement, changed query functions and bounded storage.

Logs preserve the original bytes in gzip; readable copies normalize line
endings and trailing whitespace. This is neither a completed campaign nor a
GPU/render benchmark.

## Acceptance still pending

Broaden the completed microbenchmarks below to representative dense
workloads and all relevant dynamic geometry/biome cases; confirm cleanup under
repeated worlds.
Do not claim whole-campaign acceleration or integrate before that evidence.
The existing reference/recovery campaigns retain their original dependencies,
RNG and frozen policies and continue independently.

## AB/BA exact query and memory evidence

`native-query-abba.json` compares 128 repeated native queries per arm on the
two recorded Canyon scenes plus two explicitly synthetic enclosing solids.
Every output shares SHA-256
`7abb066e56aaf97cd35d902d7a9eaec4d784c386c0efecb90d11e53fd63117b4`.
All complete world states stay unchanged. The cold first batch is recorded
separately and is not claimed as an improvement.

| Arm | Repeated batch ms | Per-query p95 ms |
| --- | ---: | ---: |
| A: uncached | 219.91 | 3.0741 |
| B: cached | 5.53 | 0.0332 |
| B: cached | 2.00 | 0.0089 |
| A: uncached | 196.84 | 3.0619 |

The warmed cached batch makes no additional native route/segment/walkability
calls for these exact inputs. Moving origins or changed geometry are not
represented by that warmed-query measurement.

A separate synthetic storage probe fills 8,192 entries with explicit GC:
null results retain 1,123,768 additional heap bytes; two-point routes retain
4,040,472. After dropping the navigator and GC, measured residual deltas are
38,144 and 5,000 bytes. These are storage/cleanup probes, not peak application
RAM, VRAM or a leak proof across every possible loading lifecycle.

## Short paired native tick evidence

The QA adapter redirects only the control Game module's work-points import
to the frozen original. All other implementation imports remain native.
Each arm runs 30 ticks of 0.1 seconds. Complete serialized states, including
worker movement, tasks, events, ledger, RNG and clock, match at **every tick**
in all four fixtures. Two recorded scenes are untouched; the other two
explicitly enclose the existing idle workers in added native collision solids.

The initial single AB run remains in `native-tick-parity.json`. Its ordinary
scene timings vary and must not be presented as a general speedup. The follow-up
AB/BA separates actual tick time from serialization/hash verification:

| Blocked fixture | A tick ms | B tick ms | B tick ms | A tick ms |
| --- | ---: | ---: | ---: | ---: |
| Canyon 1 | 9,585.13 | 712.57 | 549.49 | 9,745.75 |
| Canyon 10 | 3,925.46 | 278.51 | 287.35 | 3,710.67 |

Native path invocations fall from 50,220 to 1,674 and from 15,284 to 532,
respectively. This demonstrates a benefit for repeated unavailable approaches
without fabricating progress or changing task selection. Normal fixtures have
few/no watering queries and supply state-parity evidence, not a meaningful
performance claim. Counters are installed equally in both arms; measurements
run alongside existing campaigns/full regression and include cold/JIT effects.
Neither result establishes GPU/FPS improvement or whole-campaign acceleration.

Reproduce with `node --expose-gc tools/benchmark-watering-route-cache.mjs FRESH.json`
and `node tools/check-watering-cache-native-tick.mjs FRESH.json`. The first
single-AB report was created before the QA tick tool added its AB/BA repeats;
its data is retained as historical evidence rather than relabelled.

## Signed-zero correction and final repeat

A new differential test demonstrated that ordinary JSON keys fold `-0` into
`0`, although `atan2(-0, -0)` chooses the opposite first approach to
`atan2(0, 0)`. The initial failure is retained. Numeric negative zero now has
a distinct internal key representation; geometry and output values are not
normalized. All nine cache tests pass, including the original native solids
and reload checks.

Final repeats are the `*-signed-zero.json` files. The query AB/BA batches take
224.20 / 3.29 / 3.44 / 186.77 ms and retain the same answer hash. Measured
storage deltas are 1,122,112 bytes (null) and 4,039,848 bytes (short paths),
with 38,000 / 4,408 residual bytes after dropping the navigator and GC.
Every native tick state still matches. Blocked tick times in AB/BA order:

| Fixture | A ms | B ms | B ms | A ms |
| --- | ---: | ---: | ---: | ---: |
| Canyon 1 | 9,552.56 | 754.57 | 655.90 | 9,667.33 |
| Canyon 10 | 5,045.00 | 258.91 | 300.16 | 4,013.25 |

Earlier reports are preserved under their original source hashes. These final
results remain local CPU/short-replay evidence, not full dense-farm or release
acceptance. No live comparison source or virtual policy was changed.

The final web build passes in 24.28 seconds. The existing large-chunk warning
remains. `final-checkpoint-receipt.json` ties the final source and evidence
hashes together; this build is from experimental ancestry, not a production
release artifact.

## Existing dense fixtures: 50 / 200 / 500 plants

`dense-native-tick-abba.json` reuses the already archived pre-funded Sabana
fixtures from agricultural-power QA. No plants, money, prices, contracts,
magic decisions or geometry are added by the new runner. Each arm starts
from identical original bytes, runs ten native 0.1-second ticks, and matches
the complete serialized state at every tick. These are short startup/crew
movement samples, not new campaigns or whole-day production measurements.

| Plants | A tick ms | B tick ms | B tick ms | A tick ms | Native path calls A / B |
| --- | ---: | ---: | ---: | ---: | ---: |
| 50 | 527.69 | 314.83 | 315.28 | 291.15 | 10 / 5 |
| 200 | 485.65 | 468.82 | 286.49 | 328.90 | 40 / 20 |
| 500 | 1,140.73 | 819.93 | 903.65 | 956.77 | 100 / 50 |

Counters consistently show fewer duplicate route/segment/walkability queries.
Cold/JIT effects and concurrent jobs make timings noisy: the final warm A
case at 50 plants is faster than the measured B cases. Do not claim uniform
acceleration, steady-state FPS, complete-day throughput or release acceptance
from these samples. The longer follow-up is recorded below.

The QA-only control import adapter is now shared by both replay runners.
`shared-control-regression.json` repeats the four original Canyon cases for
five ticks per arm and retains exact state parity. This refactor changes no
production module or active campaign source. Historical runner implementations
and evidence remain recoverable from their committed versions.

## Sixty seconds and a complete dense working day

The 500-plant replay first spans 600 ticks (60 simulated seconds), retaining
full state parity in all AB/BA arms. The follow-up then runs **3,000 ticks / 300
seconds** for each original 50/200/500 fixture, still without new funding,
manual actions, geometry, magic decisions or economic-rule changes. All full
serialized states match at every tick, including movement, water/growth/tasks,
crate delivery, events, ledger, RNG and the day/night boundary at time 300.
The ledger changes during the working day and remains identical between arms;
this replay is not an independent campaign ledger/physical-event audit.

| Plants / workers | A tick ms | B tick ms | B tick ms | A tick ms | Native path calls A / B |
| --- | ---: | ---: | ---: | ---: | ---: |
| 50 / 5 | 1,628.39 | 1,359.61 | 1,216.61 | 1,210.88 | 157 / 150 |
| 200 / 20 | 4,746.86 | 4,373.99 | 4,649.03 | 4,482.59 | 323 / 275 |
| 500 / 50 | 12,690.73 | 12,692.76 | 12,870.71 | 12,974.26 | 318 / 177 |

The complete accessible 500-plant day shows practically unchanged total tick
cost despite fewer geometric queries. Do not advertise a broad dense-farm,
FPS or whole-campaign speedup. Strong savings remain specific to repeated
unavailable approaches in the separately documented collision fixtures and
exact-query microbenchmark. This limits the acceptance claim rather than
discarding the neutral result.

Reports are retained losslessly as `dense-500-sixty-seconds-abba.json.gz` and
`dense-full-day-abba.json.gz`; their original bytes remain in the worktree.
`dense-day-archive-manifest.json` records byte hashes and confirms every replay
source still matches its recorded hash. Progress/stdout logs retain raw bytes
in gzip, with readable whitespace-normalized copies.

The runner accepts a bounded tick count up to 3,000 and an optional subset of
`50,200,500`, and reports every 100 ticks. Example: `node
tools/check-watering-cache-dense-tick.mjs FRESH.json 3000`. This is working-day
compatibility coverage, not 100-night survival or production integration.
