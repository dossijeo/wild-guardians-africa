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

Root also independently ran `python
docs/qa/horde-cooperative-root-review-a689/verify-physical.py` from the repository
root, with both frozen commits available in Git. All30 recorded source/log
hashes and every archived payload hash matched a689. Decompressed initial and
final snapshots matched the historical worker fixtures byte-for-byte in all
six biomes; spawn-state hashes matched separately. Each of72 actors reached
its exact stored exit, with one spawn/end per biome,12 total StructureHit events
and270 unused strikes. This reads immutable evidence; it does not rerun physical
simulation. The raw physical reports' sourceCommit names the pre-execution
parent d4; the separate post-execution source receipt identifies the changed
runtime bytes matched to the eventual a689 freeze. Do not label d4 as the
executed cooperative runtime or imply a pre-execution frozen commit.

## Additional real-navigation contracts, frozen0c9eaab2

Root independently reviewed and ran the three additional native-prepared clock,
calm/pause and paid-farm test files on clean0c9eaab25a8cf02677d844c76b8cd57312c8ce51.
All10 tests passed, exit0,2450.8099ms. Actual prepared arrival retains accelerated
boundary splitting and normal animal speed; a complete physical last exit
restores acceleration once. Persisted side/strike RNG and pending600 freeze
retain their assertions with real Navigation. The calm-night cases explicitly
isolate the clock, not the guaranteed-raid distribution.

The paid Sabana fixture's initial/final hashes matched the agent's frozen result
d43e35cf0e8ab9f04b9884e219ce9592daa4be1749688fe66e40f6aa22fb064c /
81cc6e65571f6dff92f4e5ab1ebf5f6f61710020236f49b4afabb1f8a6b7d14a.
Six ordinarily paid crops in three groups retained670coins,12 physical exits,
four simultaneous exclusive owners,10 logical hits,6 CropHit events and three
destroyed crops. Root's observed maximum preparation pump was22.5715ms with320
checks; this is CPU test observation, not a frame guarantee or GPU measurement.
These fixtures change setup to isolate boundaries; they are not campaigns.

Only implementation of a separately named paired runner is now authorized in
the isolated branch. Its first proposed pilot is20 nights, GranCañón/Saheliana,
seed712, using the reviewed responsible/neglect protocol. Execution requires
frozen producer source, legal-command/transport tests and root review first.
No pilot has run. No100-night acceptance, thirty-case matrix, economic promotion
or main runtime integration follows from these10 directed contracts. The six
original failures remain preserved and require explicit fixture reconciliation
before an eventual production PR can pass its full regression suite.
