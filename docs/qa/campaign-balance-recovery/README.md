# Post-jam balance investigation — not an accepted release change

The four native Canyon campaigns at `3324d17dd2305ea8595aea311c518cc6db2404ad` survived 100 nights but failed the user's strictly-below-25% daylight inactivity criterion. Their full archives are in PR 13's `docs/qa/campaign-ci/current-3324d17d-terminals/`. The original reports, policy, seed and negative results remain unchanged.

`frozen-canyon-capacity.json` is produced by the read-only `tools/analyse_campaign_capacity.mjs` from those audited report/snapshot pairs. It records decompressed SHA-256 identities and asserts the source revision, result, night count, and append-only planting counts. Run the tool with an output path followed by the four archived case directories. Analysis took under one second on this machine while another agent performed visual loading QA; this is not a performance benchmark.

| Canyon culture | Accessible plots selected by strategy | Final living crops awaiting first water | Deliveries / worker-day, nights 1–20 | Nights 81–100 |
|---|---:|---:|---:|---:|
| Mapungubwe | 2,632 | 69.00% | 4.18 | 0.86 |
| Musgum | 2,612 | 69.17% | 4.39 | 0.82 |
| Ethiopian | 2,619 | 70.88% | 4.24 | 0.85 |
| Sahelian | 2,695 | 77.22% | 4.05 | 0.91 |

The first-water backlog is real, but it does not prove permanent inaccessibility. Its oldest living crop is only 11–12 days old in each case; 945–1,220 crops have waited at least five days, and none have waited twenty days. Task service, commuting, watering stand-off routes, growth delays and delivery routes require native investigation before attributing the slowdown to one mechanism. A snapshot at dawn does not measure daytime worker utilization.

The unchanged strategy is spatially finite: one center, a 1.5 m candidate grid inside `activeChunkRegion(center)` (240 m square on medium), bidirectional native routes, one planting opportunity per simulated daytime second, no second center and no relocation of the search rectangle. Canyon's narrow cultivable floor further reduces that finite area. This is a faithful record of this strategy's limitation, not proof that the entire procedural world has only these plots. Changing the strategy or enlarging its rectangle to hide the failed metric is not part of this candidate.

Early idle is predominantly a working-capital constraint; late idle is predominantly occupied planting space and physical turnover. More harvest income may reduce early budget idle but fill the finite area sooner. Income alone must not be claimed to solve the latter.

## Candidate protocol

The first isolated candidate will use `ceil(original current harvest value × 1.25)` for all eight species. It preserves 1,500 initial coins, 30/40 wages, crop costs, growth/watering, physical pickup/delivery, damage, raid attraction thresholds, FIFO and the original responsible policy/seed. Increased harvest values also increase attraction; that risk remains enabled.

This is an experimentally chosen, moderate reinvestment-margin hypothesis, not a prediction from a static break-even formula. The uniform rule preserves relative economic ordering without species-specific tuning to one deterministic case. Rounding produces a slightly larger increase for cheap crops and must be recorded explicitly.

Candidate harvest prices: millet 11 → 14; sunflower 36 → 45; sorghum 13 → 17; maize 17 → 22; sweet potato 23 → 29; cotton 178 → 223; cassava 32 → 40; banana 267 → 334. `player_revisions.json` and the generated browser/Node balance carry the candidate values. Exact day-raid threshold fixtures retain 9,999 and 10,000 attraction, and the closest-edge delivery test retains its pre-arrival/no-double-payment checks with the new paid value. Historical economic fixtures are untouched.

At the candidate commit, generation consistency is verified, but local runtime tests are intentionally pending the shared GPU timing reservation. Remote CI and the complete native pilot are required; neither changing an expected price nor regenerating the module establishes balance acceptance.

Start with an unchanged 100-night native Canyon/Mapungubwe pilot plus ordinary poor-management tests on the frozen candidate branch. Keep failures and partial artifacts. A short run or static cashflow is diagnostic only. Before any PR or production integration, require the complete six-biome/five-culture responsible matrix, actual physical deliveries, survival, strictly less than 25% recorded inactivity, integer ledger/snapshot reconciliation, ordinary bad-management defeat, and regression checks. Any remaining capacity problem must be investigated rather than concealed with a different policy or seed. No assets, rendering, camera or collision changes belong to this balance candidate.
