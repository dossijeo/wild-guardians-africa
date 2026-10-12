# Recovery pressure checkpoint

This checkpoint tests the existing candidate-4 quantity response; it introduces no new military parameters or player-policy changes. The active good-management seed-123 Sabana/Mapungubwe campaign remains on its original frozen sources.

The former candidate used `max(current value, EMA)` for pressure and a square-root count progression with a nonzero temporal contribution. Consequently, a smaller farm did not necessarily receive a substantially smaller cohort. The audited candidate-3 terminal campaign ended after night 33; its last raid still had 16 animals for two exposed crops. This is historical evidence, not a result of the candidate-4 campaign.

Candidate 4 limits quantity using current living base-harvest value: `max(1, round(base count * V / (V + 1000)))`. EMA still governs species/individual profiles. Neither cash, harvest maturity nor pending magic bonuses increases this value. The product budget is recomputed before RNG selection. The first five introductory nights retain their original single animal.

`prepareClockEvents` in `src/simulation/game.js` calls `planNight` once when time reaches 300 seconds and no night plan exists. The plan therefore samples the farm at nightfall, rather than using a stale morning census. Reloading retains the committed cohort/RNG. This adjustment affects newly planned raids; it does not erase animals, undo physical damage or reroll an existing raid mid-night. Such cancellation would obscure the matched comparison and permit reload exploitation.

The 33 pressure-budget, recovery, plan and candidate-migration tests pass. They cover immediate count reduction despite a high historical EMA, monotonic/bounded counts, exact budgets, determinism and committed-plan restoration. Their original TAP log is archived here.

The receipt verifies the live PID and all 464 recorded source hashes without drift. The source manifest and observed progress are preserved losslessly. Progress is intermediate and is not a victory/defeat result. Candidate 4 remains experimental: recovery efficacy, full campaign survival, frozen-profile win rates and the larger biome/seed matrix still require native evidence before a balance merge.
