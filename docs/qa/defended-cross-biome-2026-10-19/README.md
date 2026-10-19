# Current Wild Engine defended campaigns across three biomes

These are legal, continuous campaigns with the production military/economic
rules, `good` virtual-player strategy, Mapungubwe, native intentions and wall
plans, and event-driven topological defense. They are game simulations without
Three.js rendering. They do not measure interactive frame rate or VFX cost.

| Biome / seed | Requested horizon | Actual result | Verified raids | Final crops | Final cash | Crop raid losses | Wall hits | Paid wall pieces | `Game.tick` total |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| [Sabana / 123](../defended-campaign-regression-2026-10-18/README.md) | 100 | Victory at 100 | 100/100 | 1 | 66 | 1,386 | 3,404 | 43 | 766.0 s |
| [Gran Cañón / 712](../defended-canyon-2026-10-19/README.md) | 100 | Defeat at 79 | 79/79 | 0 | 11 | 159 | 1,792 | 28 | 226.2 s |
| Manglares / 712 | 100 | Defeat at 96 | 96/96 | 0 | 31 | 864 | 2,735 | 141 | 1,239.7 s |

The Manglares run used source checkout `f9999bde` (documentation-only changes
since `main`), campaign runner SHA-256
`745a77d05768a992ffe5c30853227a4415dbace813f393edf0ae4d02000b7b91`,
and production WASM SHA-256
`674bdf018817e1fa75e5181525faa3f516b90b9072af844fdc08e64fdcbf6b9c`.
Reproduce it with:

```sh
node tools/experiments/compare-enclosure-defense-campaigns.mjs manglares 100 712 report-100.json topological
```

The complete per-night and raid report is
[`manglares-712-96-nights.json.gz`](manglares-712-96-nights.json.gz);
its uncompressed JSON SHA-256 is
`83e2a644925509223a04d79da69e72679f9d1bef4b8ebde2f47d474a88f76e00`.
The report records `result: defeat`, 96 completed nights, verified raid
evidence and no evidence issues. The farm first fell below ten crops on night
94. At night 96 it had no crops and only 31 coins, below the recovery minimum
required at dawn. This is an economic defeat, not an unfinished raid or
navigation exception. The player bought 141 wall pieces for 1,410 coins.

## Manglares simulation cost

| Nights | Mean living crops | Mean `Game.tick` per night | Maximum |
| --- | ---: | ---: | ---: |
| 1–20 | 113 | 7.94 s | 13.46 s |
| 21–40 | 111 | 13.26 s | 19.31 s |
| 41–60 | 122 | 19.16 s | 30.27 s |
| 61–80 | 98 | 15.74 s | 34.10 s |
| 81–96 | 36 | 7.35 s | 18.43 s |

Total player-decision time was 210.8 s; total wall time was 1,518.3 s. The
middle-campaign `Game.tick` increase is measurable even though mean living
crops were similar in the first three periods. The later decline rules out a
simple monotonic cost per elapsed day, but it does **not** identify the
expensive subsystem or rule out retained spatial/task state. A frozen late
state and phase profile are needed before changing the engine. The native
campaign has no renderer, so spell VFX and full-screen overlays cannot cause
these particular `Game.tick` delays.

These three runs demonstrate one narrow victory and two late, legitimate
defeats. They cannot estimate a win probability or certify all six biomes.
Production balance remains unchanged; any military/wall-cost candidate must
be evaluated separately from engine stability and virtual-player policy.
