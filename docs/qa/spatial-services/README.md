# Experimental Wild Engine spatial services

Branch `codex/wild-engine-spatial-services` is stacked on the experimental native-intent branch at `d903d827`; neither branch is merged into `main`. This avoids maintaining a second live-entity index while the action planner is under review. The production WASM and player policies are unchanged. All measurements below use a separately built candidate WASM.

## First endpoint: damaged structures

The shared native target index now accepts structure HP, status and material deltas. Two ordered sets hold damaged walls and damaged work centers separately by descending damage ratio, then numeric structure ID. HP-only updates advance a separate damage revision; they do not change Wild Engine's topology or action-planning revisions, nor wake the event-driven task planner. Removing a structure clears it from the index. A rejected batch leaves the native index unchanged, and the JS bridge replays authoritative state.

`getDamagedWalls()` and `getDamagedCenters()` return IDs, HP, damage ratio, status, material, revision and the exact `repairCost()` rational calculated by the game's economic authority. The `paidCoins` field is the integer debit that `transact()` would settle. A ruined module is reported separately through its status and quoted at full reconstruction cost. These queries are for **advice**: ordinary game commands still decide permission, affordability and whether a repair is actually completed.

The bridge is still experimental. A full-state replay occurs once after load; later updates require committed `structureDamage` or target events. The normal game does not emit those events into this bridge yet. No bot decision has been switched to the endpoint.

## Reproduction and early evidence

Build the candidate with `SPATIAL_WASM_OUTPUT=.cache/spatial-services-prototype.wasm bash tools/build-spatial-savanna-wasm.sh` in the configured Emscripten environment. Set `WILD_ENGINE_SPATIAL_SERVICES_WASM=.cache/spatial-services-prototype.wasm` and run `node --test tests/spatial-native-damaged-services.test.js`. The test checks ordering, exact repair quote, HP-only invalidation, reconstruction, removal, rejected deltas and replay after save/load. The inherited native-intent tests also pass on this binary.

`tools/experiments/benchmark-spatial-damage-service.mjs` compares hot JS filtering/sorting with the candidate endpoint using frozen states and ABBA order. In two 5,000-query runs on the Desert day-7 repair state (58 structures, four damaged walls), JS arms ranged 10.9–17.0 ms and WASM arms 12.5–22.0 ms; initial native read-model synchronization took 13.7–16.9 ms and a damage delta 0.26–0.31 ms. These tiny query timings are JIT-sensitive and show **no established throughput advantage**. The latest candidate binary was 309,698 bytes. A second Desert day-15 state has 118 structures and zero damaged walls; it likewise showed mixed order-sensitive timings. Neither microbenchmark measures the player's actual decision loop or an entire campaign.

Before claiming a performance win, capture decision profiles at Sabana/712 days 3, 4, 12 and 14, measure synchronization and queries during normal bot actions, then compare sustained campaigns. The remaining four services—crop-group protection, incremental enclosure plans, planting-site search, and production event integration—have not been implemented. Wall-chain preview/build duplication and physical closure validation remain untouched.
