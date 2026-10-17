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

## Current-main replay (2026-10-17)

The original experimental branch predated several Wild Engine and campaign
changes. The candidate adapter was ported onto `d77d199a` without the branch's
unrelated engine modifications, then both arms were rerun in separate Node
processes with the same Sabana/712 `good` policy and event-driven expanding
defense. The detailed reports are retained alongside this document. The
first six day-end ledgers agree in crops and cash; subsequent farm trajectories
diverge as military outcomes change. Day-end hashes need not agree because
the selected pressure recipe is saved in the state.

| Arm | Nights completed | Day-14 crops | Coins | Crops destroyed, nights 6–14 | Wall pieces paid | Raid evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Current control | 14 | 51 | 454 | 173 | 86 | Verified, zero issues |
| V1 military pressure, current wall prices | 14 | 93 | 1,047 | 90 | 86 | Verified, zero issues |

Both farms remained active with an operational center. The V1 arm still lost
51 crops on night 14. Game.tick totals were 85.9 s control and 94.9 s V1;
different farm sizes and workload make those values unsuitable as an isolated
engine speed comparison.

The two 30-night requests used the same current-main code. Each arm reproduced
all 14 of its own shorter run's day-end state hashes exactly.

| Arm | Actual completed nights | Terminal state | Crops | Coins | Crop losses after night 5 | Raid evidence |
| --- | ---: | --- | ---: | ---: | ---: | --- |
| Current control | 21 | Economic defeat at dawn of day 22 | 0 | 27 | 285 | Verified, zero issues |
| V1 military pressure | 30 | Still active at horizon | 89 | 641 | 522 | Verified, zero issues |

The control still had an operational center; loss of agricultural production
and cash caused its real defeat. The V1 arm retained an operational center and
86 paid thorn-wall modules. Its losses increased from 90 on nights 6–14 to
195 on nights 15–21 and 237 on nights 22–30. Cumulative Game.tick was 259.4 s
and virtual-player decisions 65.2 s for the 30-night arm; the run took 349.9 s
wall time. This is survival at the 30-night horizon, **not** a 100-night
victory or evidence that late losses are sustainable. The night-by-night
[14-night](current-main-sabana712-14-nightly.csv) and
[30-night](current-main-sabana712-30-nightly.csv) ledgers and compressed full
reports are checked in for inspection. Cumulative losses across unequal
horizons must not be compared as an isolated damage rate.

The report gzip SHA-256 values are `d6d900f48cbb648b0fba5b07326c4144268f2b9c11e6bb73797af7ff98c21f51`
(14-night control), `0d016356f88d0d5d8f84fb26a330d526776d5d9403f387cfe9a117dd90a08984`
(14-night V1) and `1b13044a31777ba87b38cfd10a324b64e5da3e53970483d587858c8380d82546`
(30-night V1), and `04e156b0d877f231eb7f327fb8f7636292185c903268c76b70877f784e8d1c83`
(21-night control from a 30-night request). No production pressure or wall
table was changed. Held-out biome/seed checks and later horizons remain
necessary before recommending a balance candidate.
