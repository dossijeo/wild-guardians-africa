# Day-40 tick: exact Growth accounting

This is a simulation-CPU experiment, not a rendering or military-balance change.
The frozen [Manglares/712 day-40 state](state.json.gz) has 29 simultaneous
Growth spells. Its compressed SHA-256 is
`b0c9045e9a45214cb789db6c1a6781dc3f407c6eb20d363347632bb201c1be4b`.
The same production WASM (`09616da85bf59c50c0cde7b743a4bdccb2eac06ec4eb0b79f79c44ef71d9caa9`)
was used for both arms. A is the source at `661b349c`; B changes only the
JavaScript Growth ledger update. Each run is a separate Node process and
replays the same 20 simulated seconds at `dt=0.1`.

A V8 CPU profile over the replay's measured window attributes roughly 247 of
488 sampled milliseconds inside `Game.tick` to `planTasks`; the exact rational
arithmetic helpers `canonical`, `add` and `gcd` also appear prominently.
Those are sampled CPU estimates, not independently additive wall times. The
29 spells charge the same daily account once per active spell per tick, when
that account can already have 400-digit numerator and denominator fields.

B accumulates nanosecond-denominator consumption within a crop pass and
updates each daily account once per observation boundary. It flushes before
events or a newly appended task can expose the ledger, and before leaving the
pass. Individual spell consumption remains exact and capped. With no active
Growth spell, the batch accumulator is not created. It does not change spell
power, crop growth, purchases, or the economic rules.

Reproduce the timing with `profile-frozen-native-tick.mjs` on A and B. For
each arm, sum the per-second `gameTickMs` values; do not use the inclusive
`ms` when comparing a fixture that loads sectors. A/B/B/A/B/A/A/B gave:

| Arm | A (`Game.tick`, ms) | B (`Game.tick`, ms) |
| --- | ---: | ---: |
| 1 | 418.431 | 359.900 |
| 2 | 408.085 | 365.643 |
| 3 | 407.129 | 360.192 |
| 4 | 410.483 | 389.525 |
| Median | 409.284 | 362.918 |

The median reduction is 11.3% for this Growth-heavy, daylight tick window.
All eight runs produced the same active-state SHA-256,
`826d8789f37c8391ebe69bdc754fe0fbecb886851ecc83419d434a68acb51a09`.
A directed differential test also compares the full daily account and every
spell after fractional steps, an intermediate flush, and entitlement caps.
This result should not be extrapolated to a whole campaign: ordinary windows
without many overlapping Growth spells may receive little or no benefit.

For repeatable attribution, run Node with `--cpu-prof`, add
`--profile-window` to the frozen profiler, then feed the emitted
`profileStartUs` and `profileEndUs` to
`summarize-frozen-cpu-profile.mjs`. The CPU profile is more intrusive than
the timing runs. No native navigation algorithm or WASM binary changed.
