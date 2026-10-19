# Gran Cañón/712: economic defeat after 77 nights

This is a third balance reference beside the [two narrow 100-night victories](../two-biome-100-night-evidence/README.md). It uses the same legal campaign policy: Mapungubwe culture, `good` strategy, topological defense, native spatial advice and intents, and confirmed wall plans. No price, damage, raid-pressure or bot-policy parameter was changed. The source and Wild Engine WASM SHA-256 values are respectively `d169104538500fcb87f4dda20ecf93db0715df9087e7e9117175d7f7ae5b7781` and `6feeea330cf5c8d0e338503e85abbb007d6803cd1727c0b425623956234ec551`, matching the two victory reports.

The [campaign report](campaign.json) records 77 ordered daily state hashes. It ended in `defeat`, with verified raid evidence and no reported raid issues. At the final dawn the farm had no living crops and 31 coins. A second execution captured the [final state detail](defeat-detail.json): its serialized hash `2fbefb8df885971c0835a13464aa6ed081e1a4b5f32ab7c34c0e4f0f3063099e` matches the first run exactly. The final game message says the settlement cannot afford another day; the work center `structure-2` remains intact with 486 HP. This is the economic defeat branch in `closeNight()`, not a last-center collapse or a navigation failure.

The 77-night headless run took 232.08 s total, including 123.01 s in `Game.tick` and 25.38 s of bot decisions. These numbers describe one run on this Windows host, not a paired performance comparison. Its lowest recorded balance was 30 coins after day 75. The campaign demonstrates that the same policy that barely won Volcanes/712 and Sabana/123 can also lose in a different world. Three selected seeds do not establish overall win rates or prove that Gran Cañón is well balanced; the next balance decision should compare more frozen seeds, the construction history and the first irreversible economic shortfall.

Reproduce the daily report from `main` at `7be4fb7d` with:

```sh
node tools/experiments/compare-repair-preview-campaign.mjs batch OUTPUT.json 100 712 gran-canon
```

The requested horizon is 100 nights; the runner stops when the real game reaches defeat. The second run used the same `simulateNativeCampaign` options and recorded the final `messages`, work-center HP and serialized-state hash without changing the game.
