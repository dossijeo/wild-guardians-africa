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
table was changed. Cross-biome checks and later horizons remain
necessary before recommending a balance candidate.

## Held-out Sabana seed 123

The same current-main pair completed 14 nights on seed 123 with the same bot
configuration. The control retained 101 crops and 715 coins after 153 crops
were destroyed; V1 pressure retained 149 crops and 975 coins after 22 were
destroyed. Both had one operational center and verified raid evidence with
zero issues. The control paid for 63 thorn-wall modules and V1 paid for 90;
that difference follows from the divergent farm trajectories under the
unchanged economic policy, so wall spending is not held constant here. The
[nightly ledger](current-main-sabana123-14-nightly.csv) and compressed full
reports preserve the comparison. Their gzip SHA-256 values are
`3a6b253ded94e9eb1061f04a50c742424d66ff84b5bbb674e34d867886bb02a9`
(control) and `36b9e06554133ac9a8994e716eecda097055c06b01e21eac3906b538552f4576`
(V1). Two Sabana seeds support continued evaluation, not adoption across six
biomes or a 100-night viability claim.

## Manglares seed 712

Both arms completed 14 nights with verified raids and zero technical issues.
The control retained 71 crops and 1,029 coins after 68 crop losses; V1 pressure
retained 145 crops and 1,152 coins after 24 losses. Both paid for 96 thorn-wall
modules, so this particular comparison does not include a wall-spending
difference. The [nightly ledger](current-main-manglares712-14-nightly.csv) and
full reports retain the physical and economic details. Report gzip SHA-256:
`7518fd195b8f55758f51fed693ec26a3001eb885709e603fa593744df6f0209f`
(control) and `ed6ae491ab23fdb639d0acf5512325c96d7db08adcf28764adb678f1ea7e6f18`
(V1). This supports a second biome at the 14-night horizon; further biomes
and later military escalation still require separate evidence.

## Gran Cañón seed 712

The control completed 10 nights and lost its sole center during night 11. It
ended with four living crops and 181 coins, below the cost of founding a new
center; this is a real military/economic defeat, not a technical stop. The V1
pressure arm completed all 14 requested nights with 54 living crops, 941 coins
and an operational center. Crop losses were 91 in the control's partial
11-night horizon and two in V1's 14-night horizon. Both paid for 34 thorn-wall
modules and both full raid reports verified with zero issues. These are
different exposure horizons, so the loss totals should be read with the
[nightly ledger](current-main-gran-canon712-14-nightly.csv), not as matched
rates. Both arms used the same expanding defense policy; this comparison
does not evaluate the opt-in topological planner. Report gzip SHA-256:
`6081e15f8c4c273aa377fc763ea756436c67ef866e31b61a394aad81728cbcf0`
(control), `bb44825495d9802029596d24ae7f50ebac414ea01b3ede230156065285801ec8`
(V1). Desierto, Gran Río, Volcanes and later horizons remain untested here.
