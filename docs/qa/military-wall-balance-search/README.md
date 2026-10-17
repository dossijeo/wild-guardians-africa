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
| `moderate-pressure-affordable-walls.json` | More animals than V1; same hit and structural factors | Exploratory table |

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
| Moderate pressure + affordable walls | 129 | 883 | 688 | 99 | 37 | 3.10% |

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

## Second biome: Manglares/712, 14 nights

Both arms completed with no raid-observer issue. The existing pressure control
lost 47 of 1,038 exposed crops (4.53%) and ended with 89 crops, 847 coins and
960 coins spent on walls. V1 pressure lost 27 of 1,153 exposed crops (2.34%),
ending with 158 crops and 1,035 coins at the same wall spend. Thus the control
was already much closer to the initial agricultural-loss target in Manglares
than in Sabana. The V1 result is promising, but two biomes and one seed each
cannot establish an appropriate universal military curve.

The extra surviving crops also exposed a severe runtime cost: V1 Manglares had
one `Game.tick` day of 354 seconds, whereas the control's worst day was 52
seconds. Sabana's sustained V1 runs likewise recorded days of hundreds of
seconds after night 14. These runs did advance without physical-audit errors;
they are not yet evidence that 100-night campaigns can be evaluated at a
practical throughput. Wall-clock performance and physical correctness remain
separate acceptance dimensions.

## Held-out seed: Sabana/123, 14 nights

The independent seed again favors the candidate economically, but also exposes
a difficulty risk. The current-balance control completed with 92 crops, 846
coins and 84 losses among 1,006 crops exposed from nights 6–14 (8.35%). V1
pressure plus affordable walls completed with 161 crops, 939 coins and **zero**
agricultural losses among 1,228 exposed crops. Wall spending was 900 versus
720 coins. Both raid observers verified all incursions without issue. A zero
loss outcome on one seed does not prove that the candidate makes the game
trivial, but it prevents treating its Sabana/712 loss rate of 2.27% as a
universal estimate. The V1-pressure-only arm separates military and wall
effects. A moderate-pressure candidate holds the
wall table and hit/structure factors constant while increasing only the animal
count factor from `0.35 + 0.60u` to `0.45 + 0.52u`; its matched 14-night arms
test whether this restores meaningful pressure without losing solvency. Both
arms completed: Sabana/712 lost 37 of 1,192 exposed crops (3.10%), ending
with 129 crops and 883 coins; Sabana/123 lost 4 of 1,255 (0.32%), ending with
163 crops and 973 coins. Both observers verified all raids with zero issues.
The moderate setting increases losses in both seeds compared with the V1
combined arm, but the substantial seed variation remains. A sustained
30-night Sabana/712 run is in progress.

V1 military pressure **without** cheaper walls also completed Sabana/123 with
159 crops and 1,066 coins. It lost 23 of 1,150 exposed crops (2.00%) and paid
900 coins for walls. Thus both V1 arms performed far better than the control
on this seed; affordable walls eliminated the remaining crop losses during
these nine post-introduction incursions. This is a strong seed-specific
protection result, not a universal loss forecast.

## Sustained result: Sabana/712, V1 pressure, 30 nights

The V1-pressure arm with **current** wall prices completed 30 real nights and
did not reach a victory or defeat terminal state. At dawn of day 31, it had 84
living crops, 1,465 coins and an operational center. The raid observer verified
all incursions, with no coverage loss or issue. This proves survival to night
30 for this one seed; it does not prove future solvency or a 100-night victory.

| Nights | Destroyed | Exposed at spawn | Weighted loss | Animals |
| --- | ---: | ---: | ---: | ---: |
| 6–14 | 77 | 1,167 | 6.60% | 95 |
| 15–21 | 200 | 1,117 | 17.91% | 106 |
| 22–30 | 263 | 1,316 | 19.98% | 137 |

The later loss rate is incompatible with treating the early V1 results as a
sustainable 2–4% agricultural balance. The 30-night run took 3,072 wall-clock
seconds, including a 453-second `Game.tick` day. These costs make direct
100-night sweeps impractical until the sustained `Game.tick` bottleneck is
understood. The candidate with affordable walls is still running and must be
compared before attributing the later losses to military pressure alone.

The per-night finance and raid ledger is
[`sabana712-14-nightly.csv`](sabana712-14-nightly.csv). Full source reports are
stored as `*.json.gz` alongside this file and can be expanded with gzip. To
regenerate the table from expanded reports, run
`node tools/experiments/summarize-balance-candidates.mjs output.csv report.json ...`.
The corresponding Manglares ledger is
[`manglares712-14-nightly.csv`](manglares712-14-nightly.csv).
The independent-seed ledger is
[`sabana123-14-nightly.csv`](sabana123-14-nightly.csv).
The sustained V1 ledger is
[`sabana712-v1-pressure-30-nightly.csv`](sabana712-v1-pressure-30-nightly.csv).
