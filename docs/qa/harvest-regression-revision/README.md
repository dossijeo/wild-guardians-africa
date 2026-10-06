# Regression acceptance after harvest price revision

The full local suite loaded before commit 2544988 finished with 128 failures. CI on 25752fb finished with 48 failures after the first 80 stale assertions were corrected. These reports were failures, not acceptance.

This change updates exact crop/crate values and settlement assertions to the approved post-jam harvest table. Male millet crates remain rational 66/5 and settle once at 14; female millet crates settle at 11. Physical watering, walking, pickups, gate waits, reloads and ledger idempotency assertions remain in place. The 30 native biome/culture delivery cases now expect 679 after the same paid opening.

Audio activity fixtures now include empty plants/structures, as the production game state does. The preparation mock implements shared URL caching and verifies five unique warthog/arrival resources, no repeated decode on the second preparation, and nine total after adding lion. No new voice starts from preparation.

Directed validation: 126 tests passed, plus four lifecycle tests passed. These do not substitute for the complete suite; it will be rerun after this commit.

## Complete-state hash provenance

`comparison.json` records the historical and revised one-night states with unchanged default 12-plants-per-worker policy. Both serialized states are archived as gzip. The revised hash is also identical with an explicitly selected value of 12.

The historical source differs in balance, shield placement exclusions, and structure audio facts; those differences are recorded by source hash. To isolate the price change, an additional diagnostic child process used the current code with only the eight old harvest values. Its exact complete-state hash equals the historical hash. That diagnostic does not change repository sources or production balances and is not a responsible-player acceptance campaign.

The new test retains an exact revised state hash and checks default versus explicit policy; staffing and normal wage checks remain. Increased income changes planting opportunities and subsequent state, so the old complete-state hash is deliberately preserved as historical evidence, not required as today's game result.
