# Cooperative raid entry candidate - frozen review scope

This candidate follows d4d12580 and implements the approved fallback design. It is not promoted and no campaign has been run on it. Centre 800, wages 30/40, sale/attraction values, half structure damage, quota4, target exclusivity, FIFO and productive policies remain unchanged.

## Actual incremental work

Navigation pathSteps preserves native failed/prepared/query caches, reverse approach paths and eight-node A* yields. Shared packing/approach generators are consumed by both the worker and cooperative preparation. A private request Navigation owns every continuation; the game Navigation is never patched across frames. Every pump restores temporary budget wrappers. Request-key changes, disposal and errors close iterators and preview state. No search restarts from anchor zero at a slice boundary.

RaidEntryPreparer uses its existing update loop when worker construction or operation is unavailable. One bounded slice advances the request; completed readiness retains the original key/side/RNG and successful spawn allocates actors normally. The pending600 safety freeze remains unchanged, with camera/preparation still usable. Opaque iterators are never saved.

Per-pump targets are 16 yield boundaries or 256 geometry calls. This is NOT a hard millisecond or geometry ceiling: an eight-node native search batch can exceed the target before the next yield, and a cold geometry call can scatter a chunk. Observed Desert physical preparation used 311 slices, 418.03 ms summed pump CPU, maximum slice 15.17 ms and maximum374 checks. These are descriptive local CPU observations, not GPU/frametime acceptance or a mobile guarantee. Private construction cost was1.78 ms in that fixture.

Whole-request entry budgets remain32 actual searches /100000 geometry /50000 native yields. Optional approach warming now has a separate bounded best-effort budget64 searches /1000000 geometry /100000 yields. A warm-budget exhaustion retains the validated entry and available completed caches; an entry-budget exhaustion reports a null entry. Neither records an interrupted route as a completed failed path. Advanced-farm warming coverage remains unverified.

## Evidence

- cooperative-desert-first.log plus five biome logs:18/18 tests passed, full reply parity against the worker (including warmth), historical Desert packing exactly equal; eventual worker-disabled readiness and native pending600 resumption; immutable main state and disposal/invalidation.
- cooperative-cleanup-cache-tests.log:11/11 passed including native cached/prepared budget0, cancellation without failed-path poisoning, geometry/navigation invalidation, actionable per-key errors and method restoration.
- cooperative-core-first-tests.log:5/5 original budget/Desert prepared tests passed.
- Six cooperative physical fixtures use setImmediate between actual preparer updates, then the original native Game.tick traversal. Each has12 actors reaching their exact exit, one spawn/end, integer ledger and roundtrip. All initial/spawn/final SHA256 values equal the corresponding historical worker physical fixtures. Totals72 exits /12 hits /270 unused hits. This is an empty-farm seed712/Mapungubwe navigation fixture, not evidence of danger or campaign balance.
- cooperative-physical-comparison.json contains exact hashes and comparison results. cooperative-source-receipt.json records source/log hashes after execution. The executed physical observer source hash still matches the tools file; raw fixture payloads were not rewritten.

## Preserved negative and open gates

`node --test tests/acceptance-clock.test.js tests/acceptance-defensive-reservations.test.js tests/horde-entry-retry.test.js` exited1:15PASS/6FAIL. Full original output is cooperative-clock-reservations.log. No original assertions or fixtures were changed. Four clock cases fail because their navigation double lacks segmentClear, required by connected packing; two retry438 cases expect immediate synchronous12-actor spawn despite the later ad0 synchronous cap. Whether each is pre-existing versus a true candidate regression requires review against exact source; this document does not declare them waived.

Clock/reservation regression gate remains OPEN. Six-biome evidence covers one culture/seed and explicit group only, not30biome/culture matrix, advanced farms, naturally planned hordes, loading renderer performance, paired defense policy, bad-management defeat or100-night/<25% inactivity. No campaigns, PR, main integration or promotion are authorized by these results.
