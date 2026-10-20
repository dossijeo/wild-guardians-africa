# Gran Cañón/712: economic defeat after 77 nights

This is a third balance reference beside the [two narrow 100-night victories](../two-biome-100-night-evidence/README.md). It uses the same legal campaign policy: Mapungubwe culture, `good` strategy, topological defense, native spatial advice and intents, and confirmed wall plans. No price, damage, raid-pressure or bot-policy parameter was changed. The source and Wild Engine WASM SHA-256 values are respectively `d169104538500fcb87f4dda20ecf93db0715df9087e7e9117175d7f7ae5b7781` and `6feeea330cf5c8d0e338503e85abbb007d6803cd1727c0b425623956234ec551`, matching the two victory reports.

The [campaign report](campaign.json) records 77 ordered daily state hashes. It ended in `defeat`, with verified raid evidence and no reported raid issues. At the final dawn the farm had no living crops and 31 coins. A second execution captured the [final state detail](defeat-detail.json): its serialized hash `2fbefb8df885971c0835a13464aa6ed081e1a4b5f32ab7c34c0e4f0f3063099e` matches the first run exactly. The final game message says the settlement cannot afford another day; the work center `structure-2` remains intact with 486 HP. This is the economic defeat branch in `closeNight()`, not a last-center collapse or a navigation failure.

The 77-night headless run took 232.08 s total, including 123.01 s in `Game.tick` and 25.38 s of bot decisions. These numbers describe one run on this Windows host, not a paired performance comparison. Its lowest recorded balance was 30 coins after day 75. The campaign demonstrates that the same policy that barely won Volcanes/712 and Sabana/123 can also lose in a different world. Three selected seeds do not establish overall win rates or prove that Gran Cañón is well balanced; the next balance decision should compare more frozen seeds, the construction history and the first irreversible economic shortfall.

Reproduce the daily report from `main` at `7be4fb7d` with:

```sh
node tools/experiments/compare-repair-preview-campaign.mjs batch OUTPUT.json 100 712 gran-canon
```

The requested horizon is 100 nights; the runner stops when the real game reaches defeat. The second run used the same `simulateNativeCampaign` options and recorded the final `messages`, work-center HP and serialized-state hash without changing the game.

## Daily finance and defense decisions

The [finance and defense report](finance-defense.json) repeats the same policy and game/WASM on the later docs-only `main` at `7b83a971`, using an instrumented campaign-reporting script. All 77 daily serialized-state hashes match [the original report](campaign.json); all daily finance reconciliation differences are zero. The runner source SHA-256 is `fe029930fc1d3a0dd5f90a799227ba8673d84dc5bdc655ad7af7a7a2e6b725`, and the WASM SHA-256 remains `6feeea330cf5c8d0e338503e85abbb007d6803cd1727c0b425623956234ec551`. The script records category totals without copying individual ledger entries into each daily row.

| Nights | Crops / coins at end | Income | Wages | Seeds | Repairs paid | Walls paid | Net | Crops destroyed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1–10 | 49 / 539 | 4,714 | 2,502 | 2,155 | 98 | 120 | −161 | 7 |
| 11–20 | 50 / 970 | 5,763 | 2,775 | 2,160 | 357 | 40 | +431 | 0 |
| 21–30 | 47 / 1,033 | 5,894 | 2,802 | 2,522 | 507 | 0 | +63 | 9 |
| 31–40 | 50 / 919 | 5,914 | 2,728 | 2,539 | 671 | 90 | −114 | 15 |
| 41–50 | 51 / 651 | 4,736 | 2,650 | 1,615 | 699 | 40 | −268 | 1 |
| 51–60 | 36 / 464 | 5,318 | 2,825 | 1,970 | 680 | 30 | −187 | 26 |
| 61–70 | 5 / 62 | 3,203 | 1,617 | 1,305 | 533 | 150 | −402 | 66 |
| 71–77 | 0 / 31 | 520 | 210 | 140 | 201 | 0 | −31 | 5 |

Across 77 nights, 36,062 coins of delivered income were outweighed by 18,109 in wages, 14,406 in seeds, 3,746 in completed repairs and 470 in new walls. The net change from the runner's first financial checkpoint (700 coins) was −669, leaving 31. The bot bought 47 wall modules and requested 599 repair tasks; a request is not itself a completed repair or a debit, so the 3,746 figure comes from the actual ledger. Verified raids recorded 129 destroyed crops and 1,687 wall hits. The late decline combines agricultural losses, falling income and continuing maintenance; these figures do not isolate whether a different defense policy or balance parameter would have saved the farm.

Reproduce this richer report with:

```sh
node tools/experiments/compare-enclosure-defense-campaigns.mjs gran-canon 100 712 OUTPUT.json topological
```

The reporting fix calculates daily hashes from the actual serialized game state; previously this tool read a nonexistent `row.stateSha256` field. The game simulation and defense policy were not changed.
