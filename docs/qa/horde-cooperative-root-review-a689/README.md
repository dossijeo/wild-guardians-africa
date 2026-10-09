# Independent root cooperative entry regression review

Root extracted immutable tracked sources, three named tests, the opening helper
and content JSON into separate cache directories for d4d12580 and a6893053.
Neither the agent's checkout nor main runtime was changed. The extraction
excluded untracked files and browser fixtures. Git retains both complete sources.

Both exact executions of `node --test tests/acceptance-clock.test.js
tests/acceptance-defensive-reservations.test.js tests/horde-entry-retry.test.js`
returned exit1, 15 passes and six failures. Original logs are compressed with
mtime0; receipt.json records their decompressed SHA256, full commit identifiers
and identical hashes for all three test files. Durations were2243.8867ms and
2210.1291ms. These are test durations, not a performance comparison.

The same failures occur before and after the cooperative change:

- Accelerated night arrival and animal movement boundary.
- One frame across arrival versus two split frames.
- Daytime/calm-night progression to blocked dawn.
- Last animal exit and restoration of night acceleration.
- Camera-bounds change at600 with persisted side and strike RNG.
- Successful first-attempt side-plus-strikes RNG order.

Four clock fixtures use a navigation substitute lacking segmentClear, already
required by the preceding connected packing implementation. Two retry fixtures
expect immediate synchronous twelve-body entry despite its existing bounded
fallback. Replaying the prior source establishes that these six failures
predate a689; it does not prove the intended clock contracts now work.

The original tests remain untouched. Additional real/prepared Navigation tests
are authorized in the isolated branch to retain the arrival, clock, pause,
physical-exit and RNG assertions. A paid multi-target planted farm is also
required before authorizing the paired balance pilot. No campaign, production
promotion, PR, GPU benchmark or native CI is approved by this replay.

Source review confirms a request-private Navigation and shared incremental
generators, with live navigation descriptors not held across render slices.
Work counters are not millisecond bounds. New worker and cooperative full-reply
parity consumes the same generator, so it is not independent equivalence to
historical warmth. Exact historical entry geometry and archived physical
initial/spawn/final states are separate, narrower comparisons. The six empty
farm physical fixtures cannot prove advanced-farm risk,100-night survivability,
the thirty-combination matrix or aggregate inactivity below25%.
