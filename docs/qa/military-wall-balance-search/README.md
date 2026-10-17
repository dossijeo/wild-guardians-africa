# Military pressure and wall cost experiment

This branch holds the defended `good` virtual-player policy fixed. It changes only
the military budget from night 6 and/or the five wall specifications in a
process-local candidate. Economy, seed prices, wages, construction rules,
navigation, enemy movement and crop damage remain on the integrated game path.
No candidate is applied to the production balance file.

Run a real campaign with:

```sh
node tools/experiments/run-balance-candidate.mjs tools/experiments/balance-candidates/control.json 14 sabana 712 docs/qa/military-wall-balance-search/control-sabana712-14.json
```

The same command accepts any candidate JSON, a night horizon up to 100, biome,
and seed. Each campaign uses Wild Engine, native intentions, spatial advice,
event-driven expanding defense, and the existing `good` strategy. The report
records candidate and source hashes, per-night state hashes, crops, cash,
financial flows, raids, defense purchases, physical raid evidence and timings.
A reported victory requires actually completing night 100; a requested horizon
is not a survival result if the game ends sooner.

Candidate arms:

| File | Military pressure | Wall specification |
| --- | --- | --- |
| `control.json` | Current | Current |
| `v1-pressure.json` | Attached V1, attraction-dependent | Current |
| `v1-combined.json` | Attached V1 | Attached V1 |
| `affordable-walls.json` | Current | Exploratory cheaper, stronger table |
| `v1-pressure-affordable-walls.json` | Attached V1 | Exploratory table |

The attached V1 leaves thorn wall (`zarzas`) cost and body HP unchanged, although
the current bot builds that material exclusively. Thus V1 wall-only effects for
this bot mostly come from the stronger automatic gate; higher-material price
improvements cannot be credited with any campaign change until a separate
strategy experiment uses those materials. The exploratory table varies thorn
wall cost and HP while preserving increasing price per module, decreasing cost
per 100 HP, and gate HP below wall HP.

The first five nights introduce species one by one and are unchanged in the
experimental pressure recipe. Balance conclusions must rely on exposure after
night 6, especially prolonged campaigns; seven-night survival is not evidence
of a viable 100-night balance. Physical raid outcomes and real economic
feedback are authoritative. Nominal pressure factors do not directly predict
crop losses or certified enclosure protection.

The experimental pressure recipe is versioned in each committed night plan.
Loading a saved experiment requires registering the same candidate first;
production without that recipe rejects version 4 rather than silently treating
it as the current pressure or as a blocked raid. The branch does not change the
production save format.

## First matched result: Sabana/712, 14 nights

All five arms completed 14 nights with verified physical raid evidence and no
observer issue. Agricultural losses below are measured from nights 6–14. The
denominator sums living crops exposed at each actual raid spawn, rather than
assuming a fixed plantation size.

| Candidate | Crops at dawn 15 | Cash | Wall spend | Animals, nights 6–14 | Crops destroyed | Weighted loss |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Control | 51 | 370 | 860 | 126 | 162 | 18.45% |
| V1 pressure | 139 | 873 | 860 | 95 | 77 | 6.60% |
| V1 pressure + V1 walls | 139 | 873 | 860 | 95 | 77 | 6.60% |
| Affordable walls | 105 | 592 | 688 | 128 | 160 | 14.56% |
| V1 pressure + affordable walls | 133 | 795 | 688 | 92 | 27 | 2.27% |

The V1 wall table did not produce a measurable outcome difference from V1
pressure alone in this run. The bot bought only thorn walls, whose module cost
and body HP are unchanged in V1. Affordable walls caused a legitimate purchase
one day earlier (day 3 instead of day 4), so their campaign trajectory differs
even before military pressure starts. The combined arm's lower crop loss does
not automatically make it the better overall economy: it ended with less cash
and fewer crops than V1 pressure alone.

The control reproduced the previously frozen 14-night result: 51 crops, 370
coins, 86 paid thorn pieces, and 162 post-introduction crop losses. The first
five days match economically and militarily between control and V1 pressure;
serialized hashes differ because the experimental pressure plan records its
recipe provenance. This is a 14-night observation on one seed, not evidence of
100-night viability. Continue with sustained runs and additional biomes before
recommending production parameters.

The per-night finance and raid ledger is
[`sabana712-14-nightly.csv`](sabana712-14-nightly.csv). Full source reports are
stored as `*.json.gz` alongside this file and can be expanded with gzip. To
regenerate the table from expanded reports, run
`node tools/experiments/summarize-balance-candidates.mjs output.csv report.json ...`.
