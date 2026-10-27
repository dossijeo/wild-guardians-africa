# Manglares and Gran Río: 100-night Wild Engine balance references

These are two additional unmodified, legal campaign runs from `origin/main` at `633fe366`. They use the same game source SHA-256 `d169104538500fcb87f4dda20ecf93db0715df9087e7e9117175d7f7ae5b7781` and Wild Engine WASM SHA-256 `6feeea330cf5c8d0e338503e85abbb007d6803cd1727c0b425623956234ec551` as the [Volcanes/712 and Sabana/123 victories](../two-biome-100-night-evidence/README.md) and the [Gran Cañón/712 economic defeat](../gran-canon-712-economic-defeat/README.md). Both select `good` strategy, Mapungubwe culture, topological defense, native spatial advice and intents, and confirmed native wall plans. No economy, military, navigation or bot-policy parameter was changed.

| Campaign | Result | Living crops / coins after night 100 | Lowest coins | CropDestroyed events | `Game.tick` / bot decisions / elapsed |
| --- | --- | ---: | ---: | ---: | ---: |
| [Manglares/712](manglares-712.json) | Victory, 100/100 nights | 4 / 172 | 172 on day 100 | 1,246 | 329.25 / 84.24 / 483.02 s |
| [Gran Río/712](gran-rio-712.json) | Victory, 100/100 nights | 10 / 116 | 116 on day 100 | 1,687 | 344.45 / 104.94 / 502.68 s |

All 100 nightly serialized-state hashes and the separate timings are in each report. The raid evidence is `verified` with no reported issues in both. These outcomes are narrow by surviving crops and cash. The four victories and one defeat across selected worlds show that the current policy can both win and lose, but do not establish a win rate or certify balance for every biome and seed. In particular, a 100-night victory does not show that a farm with four or ten remaining crops can sustain postgame indefinitely.

The `CropDestroyed` totals are event counts across the run, not an attribution of every loss to a specific animal or proof that each candidate attack was physically valid. The headless timings were collected sequentially on one Windows host and are not browser FPS, GPU measurements, or an A/B performance comparison. `Game.tick` in Manglares took 59.05, 91.13, 73.61, 57.63 and 47.83 seconds in consecutive 20-night blocks; in Gran Río it took 63.80, 107.49, 77.75, 63.89 and 31.53 seconds. Neither run exhibits a continuously increasing tick cost, but that observation alone cannot rule out retained-state problems elsewhere.

Reproduce from `633fe366` or a later docs-only descendant with:

```sh
node tools/experiments/compare-repair-preview-campaign.mjs batch OUTPUT.json 100 712 manglares
node tools/experiments/compare-repair-preview-campaign.mjs batch OUTPUT.json 100 712 gran-rio
```

The runner stops at the actual victory or defeat. If game or WASM source changes, compare the recorded SHA values before treating results as directly comparable. Additional seeds, policies and browser-rendered runs remain necessary for broader conclusions.
