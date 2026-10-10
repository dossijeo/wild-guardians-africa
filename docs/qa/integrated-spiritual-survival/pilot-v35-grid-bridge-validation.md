# Incremental native grid bridge for exhausted animals

The retained protected seed-123 failure now completes night 17 through native
ticks. The exhausted warthog physically traverses a 159-point route to its own
original exit. No actor, obstacle, strike budget or economic outcome is removed
or synthesized. The replay preserves ledger and structures, obeys the 3.8 m/s
speed bound and swept collision checks, reaches day 18 and opens normal hiring.

Implementation: after the existing fractional direct-exit search is exhausted,
sample at most eight local physical connector candidates per call. An accessible
candidate starts the existing native grid iterator, advanced one slice per call
(eight node pops per slice), with at most 2,048 slices per candidate. Validate the
returned route in groups of at most eight legs before returning it. Exhaustion
falls through to the existing footprint-corner fallback. Origin, exit, radius,
navigation epoch, navigator and geometry/provider identity invalidate attempts.

The optional `skipDirect` argument to `Navigation.findPathSteps` omits only its
long direct-ray shortcut for these bridges. Normal callers retain their existing
behavior. Native neighbor, endpoint and swept clearance checks remain unchanged.
It avoids a synchronous fractional ray across roughly 175 m, which produced a
277 ms diagnostic spike despite the incremental grid traversal.

Transient grid iterators use weak references and introduce no save-format fields.
Reloading a pending bridge restarts its bounded search; the test proves the same
route is obtained, not identical waiting time. Once returned, the actual route
is stored in the existing actor path and survives normal save/load. Tests cover
both pending-search reload and reload after physical movement begins.

Validation: 57 retreat/footprint/clearance regressions pass; a second focused run
passes 40 navigation, persistence and bridge tests (overlapping tests are not
additional unique coverage). Final production build passes in 11.16 s with the
existing bundle-size warning. The new five tests verify sliced work, provider and
epoch invalidation, conservative shortcut omission, same route after reload and
native completion of the retained failure without money or structural changes.

| Isolated diagnostic | Calls | CPU p50 ms | CPU p95 ms | Maximum ms | Total ms |
|---|---:|---:|---:|---:|---:|
| Final cold navigator | 975 | 1.185 | 4.306 | 121.234 | 1,836.655 |
| Final after existing route warmup | 975 | 0.898 | 2.538 | 59.270 | 1,205.732 |

The warmed run separately spends 128.495 ms preparing the same failed route
queries normally attempted before the bridge. It is not free work or an excluded
loading cost. The cold maximum occurs on the first call with two clearance queries;
procedural/navigation cache initialization still produces outliers. Therefore
these numbers do not prove a whole-frame GPU improvement or absence of stutter.
Maximum observed clearance queries per connector call is 145, including internal
native search work. Preserve cold and warm evidence and the rejected long-ray
candidate. The original synchronous positive-route probe remains historical.

No agricultural prices, damage parameters, wall material values or labor policy
changed. The original incomplete campaign remains a technical failure, not a
defeat. Repeat a fresh full seed-123 campaign under the new frozen source hashes
before accepting 21-night coverage. Keep this work outside main pending integrated
balance and performance review.
