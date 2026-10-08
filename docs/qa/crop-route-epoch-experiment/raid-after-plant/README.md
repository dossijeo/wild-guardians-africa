# Live crop targeting after static raid preparation

A native seed712 Sabana/Mapungubwe opening pays for its centre, first millet and one older female worker. The real entry worker computation prepares a warthog entry and one static route. After that request has completed, the player buys maize on verified cleared native ground. The geometry epoch and raid-entry key remain unchanged.

Two clones of this current farm spawn the same ordinary introductory warthog raid: one uses the old prepared entry/warmth and the other calculates from scratch. Complete states match at spawn and all 200 following 0.05-second ticks. The animal physically moves in 85 sampled ticks and chooses the new maize, which was absent from the preparation request. It destroys that maize with two real hits while the first millet survives, then retreats and ends the raid. Native raid completion still rebuilds navigation, advancing the epoch from 2 to 3. Neither a stale target nor preview reservation is copied into real gameplay. No time, terrain, money, growth, speed or damage override is used; the only ordinary forced scenario trigger is calling native `spawnRaid` directly.

The first archive verifier incorrectly expected the initial epoch to persist even after raid completion and failed (3 versus 2). That verifier expectation was corrected to require the actual native RaidEnded rebuild; no simulation or result was altered to pass it.

An initial millet-only version also passed state parity but targeted the original crop, so it did not establish selection of a newly planted target. This stronger final case uses the ordinary higher maize harvest value and explicitly requires the new target. The scenario is one biome/culture/species, not all raid combinations, a full night or a performance benchmark.

The final runner exited 0. Direct source hashes, runner and full final state/report are archived; this is a partial dependency archive of the local epoch integration under validation. `verify.mjs` verifies stored integrity and paid/current-target evidence; it does not replay the 201 comparisons independently. Full suite acceptance remains separate.
