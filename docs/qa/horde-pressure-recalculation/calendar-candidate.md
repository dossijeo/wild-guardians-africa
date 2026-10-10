# Canonical pressure calendar candidate

Integrated current maina18bb934 (uniform rank selector, exterior entry PR21, opt-in Q4) before implementation. Calendar is stored in player_revisions.json and generated into BALANCE.raids.night_budget_calendar. Existing threat_tiers remain unchanged; nightThreatBudget applies the declared five-tier ranges for nights6–100 only. planNight retains one timing draw, one threat draw and one uniform rank draw. No money/strategy input. Introduction1–5 and postgame bypass calendar; daytime uses existing7–10 independently. Save format has no new required field: an already generated nightPlan/group survives reload unchanged; it is not recomputed by the helper.

Canonical generator validates complete consecutive6–100 coverage, all five tier intervals and positive integer budgets<=256 BEFORE writing.256 is a validation guard, not a performance recommendation or accepted gameplay value. Centre800, wages30/40, crop seed/harvest values, species strike budgets, structure damages, reservations,Shield, crop two-hit rules and existing intro20% cap are unchanged. New runtime change is only budget range selection.

Tests:34 directed PASS;6 generator PASS; generator--check PASS. Native planning and first spawn assertions cover intro cap/minimum-hit contracts via existing tests; calendar test proves exact range boundary, intro/postgame timing RNG, uniform-rank RNG, wealth/spell independence and save/reload. Original index test's obsolete day6 oracle used old budgets; its first negative is retained before replacing only the interval table with independent declared ranges. Exhaustive per-rank equality to original compositions() and RNG assertions remain. New save fixture initially lacked plant positions and correctly failed validation; corrected positions, not validation. No gameplay patch was made to satisfy either negative.

## Proposed execution, not launched

Use a SINGLE maximum15-night producer for each declared arm, inspect checkpoints6/10/15 without restarting the producer. Examples (root must coordinate/authorize actual launch):

```
node tools/run_native_campaign.mjs --out NEW_CASE_DIR --days 15 --seed 712 --strategy good --biome gran-canon --culture saheliana --labour-policy q4 --stop-file NEW_STOP_PATH
node tools/run_native_campaign.mjs --out OTHER_NEW_DIR --days 15 --seed 712 --strategy no-walls --biome gran-canon --culture saheliana --labour-policy q4 --stop-file OTHER_STOP_PATH
```

Use distinct nonexistent outputs and stop files. At a declared recalculation trigger root writes the arm's stop file; real onTick detects it and preserves partial state/observer/receipts. Do not kill the process. Current CLI supports that stop contract with tests; it does NOT yet automatically implement the proposed rolling5 cashflow/stock trigger. Therefore this protocol requires coordinated read-only inspection and an explicit stop file, rather than claiming automatic early stops. Both strategies retain Q4 production/magic; defense and village investment differ naturally. No-walls is not magic-free. Expansive is a separate coverage case.

First technical blocker may be entry geometry: budget36 can contain36 actors, far beyond the validated12-actor fixtures, later max96. Current rank selector avoids composition materialization but does not prove physical arrival, CPU cost, collision clearance or completed raids for those groups. Entry/transport errors must stop incomplete with raw evidence, not invent native defeat or silently omit animals. No100/180 run is authorized or justified by this freeze. Keep mathematical capacity and actual rendered/physical loss separate.
