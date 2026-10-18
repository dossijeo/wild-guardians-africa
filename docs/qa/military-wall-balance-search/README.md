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
event-driven expanding defense, and the existing `good` strategy by default.
Pass `topological` as a sixth argument to compare the integrated opt-in
topological enclosure policy from PR #62; use `expanding` for an explicit
control. Compare those policies with the same candidate, seed and biome before
attributing a balance outcome to military parameters. Since PR #104, the
topological policy requests ordinary paid wall and center repairs in response
to structure events. Archived topological runs made before that merge still
reflect the earlier policy without wall maintenance. The report
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

## Thirty-night exploratory wall-cost pair, Sabana/712

With V1 military pressure held fixed, source commit `d48858fa` and the same
expanding `good` bot, the current wall table was compared with the exploratory
cheaper, stronger table. Both completed 30 real nights with verified raids and
zero issues. The current-table replay reproduced all 30 daily state hashes of
the earlier V1 run exactly. The pairs used the same Wild Engine binary and
game code; CPU times are descriptive because they ran simultaneously.

| Wall table | Live crops | Coins | Crop losses, nights 6–30 | Modules bought | Build cost | Repairs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Current | 89 | 641 | 522 | 86 | 860 | 1,125 |
| Exploratory | 132 | 892 | 495 | 86 | 688 | 1,010 |

The bot used thorn walls exclusively. Thus this comparison tests the change
from 10 coins/100 HP (75 gate HP) to 8 coins/120 HP (90 gate HP), not the
higher four materials. The exploratory arm initially held less cash at night
14 (941 versus 1,047) while retaining more crops, then led on both measures
by night 21. Its higher final cash is a coupled consequence of lower defense
spending, farm survival and later income; it is not a direct 172-coin price
saving. One seed and a 30-night horizon do not establish late-game fairness or
a production recommendation. A fresh 100-night exploratory run is underway.

The paired [nightly ledger](current-v1-sabana712-wall-cost-30-nightly.csv)
and full [current](current-v1-standard-sabana712-30.json.gz) and
[exploratory](current-v1-affordable-sabana712-30.json.gz) reports retain the
physical and economic trajectories. Their gzip SHA-256 values are
`fa6c20225de3de4d32b0f60dbdfbb7eaf4ccdc5e1c0269c36fb08415272d5e00`
and `023471d95010f29ec1f7dc2f77818f61c8efe717763836759220564bce8c6a6e`,
respectively.

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
(V1). Later horizons remain untested in this biome.

### Effect of the integrated topological defense option

After PR #62 was merged, the same V1 pressure recipe, Gran Cañón/712 opening,
`good` player and source commit `6c6898ac` were replayed for 14 nights with
only `defensePolicy` changed. The 7-night topological run reproduced the first
seven daily state hashes of its 14-night run. Both 14-night raid ledgers are
verified with zero issues.

| Defense policy | Nights | Live crops | Coins | Crop losses, nights 6–14 | New wall modules / cost | Repairs paid |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Expanding rectangle | 14 | 54 | 941 | 2 | 34 / 340 | 236 |
| Topological closure | 14 | 34 | 1,013 | 59 | 21 / 210 | 0 |

At source commit `6c6898ac`, before PR #104, the topological bot bought its
initial certified 12-module closure for 120 coins on day 3, then paid for
nine more modules after subsequent changes and
breaches. It spent less and retained 72 more coins, but lost 20 more crops at
the horizon. Losses concentrated on nights 8–11 and 14. The topological policy
bought new certified closures but did not repair damaged wall HP;
the expanding policy spent 236 coins on repairs. This is a comparison of two
complete policies, **not** an isolated geometry or military-pressure effect.
It shows why integrating the topology service cannot by itself justify a
balance recommendation or replacing the established defending bot.
The later [event-driven maintenance comparison](../topological-defense-repair-events.md)
isolates that policy addition under the same seed and pressure candidate.

The paired [nightly ledger](current-main-v1-pressure-gran-canon712-defense-policies-14-nightly.csv)
and full [expanding](current-main-v1-pressure-expanding-gran-canon712-14.json.gz)
and [topological](current-main-v1-pressure-topological-gran-canon712-14.json.gz)
reports preserve purchases, attacks and hashes. Their gzip SHA-256 values are
`be05fdb5fee231dabbacedd92fd228e11a4cd92806a9be667f8ca402f40a43e6`
and `43c56a6afd989f8bea1e2829242fb5938979014bcd46a84c37564a67a407c382`,
respectively. The expanding arm's 14 daily state hashes also match its earlier
run exactly, despite the intervening retreat-cleanup engine fix.

## Desierto seed 712: economic warning

Both arms completed 14 nights with an operational center and verified raids.
The control ended with 46 crops, 1,085 coins and 86 crop losses; V1 ended with
77 crops, **644 coins** and 51 losses. V1's lower cash is material: it spent
990 coins on 99 thorn-wall modules versus the control's 440 coins on 44
modules. The unchanged virtual player bought 53 modules and then another two
on day 14, but its rectangular quote still reported tree/rock, building and
crop gaps. Those purchases cannot be counted as a certified closed enclosure.
V1's higher retained crop count changed the bot's subsequent investment
opportunities; this is a coupled gameplay outcome, not an isolated wall-price
effect. It could leave the player less solvent despite fewer agricultural
losses. [Nightly data](current-main-desierto712-14-nightly.csv) and full reports
are retained; gzip SHA-256 values are
`1cde26a26cd1097b975328430d991479f1aa8184bd75e6bd8d5233e79c4b1819`
(control) and `cb3d2c0e041fa86ccc18ebfb5deea1fdcff40e770e298e9e6240bec89df59d62`
(V1). This result prevents a blanket claim that V1 is economically better.

## Gran Río seed 712

Both arms completed 14 nights with the same 86 paid wall modules and verified
raid reports. The control retained 20 crops and 299 coins after 206 crop
losses; V1 retained 150 crops and 1,203 coins after 52 losses. The
[nightly ledger](current-main-gran-rio712-14-nightly.csv) shows the progression.
Report gzip SHA-256: `d40657cf5284d49517bd9495c37ebd6ce535c89acab35dfaf919c87b3e968ddf`
(control), `c0a64355761f56b83d754e258778a668afffb5fb0deef93af01bef143c0e3f78`
(V1). These simultaneous runs are functional balance comparisons; their
wall-clock timings are not used to claim an engine speedup because the
processes shared CPU resources.

## Volcanes seed 712 and six-biome view

The final 14-night pair also completed with verified raids and no technical
issues. Volcanes control ended with 28 crops, 596 coins and 180 crop losses;
V1 ended with 150 crops, 1,136 coins and 58 losses. Both paid for 86 wall
modules. The [nightly ledger](current-main-volcanes712-14-nightly.csv) and
full reports have gzip SHA-256 values
`850eec02d1af9e21c87d6b51f4563d493f8cf5a1ae411eddb4974bff8805fac8`
(control) and `d6febe4928f4a06ad0b3c8bdae328c43356218e869ab0f3028a4d32d79282a04`
(V1). These processes also ran simultaneously, so their wall-clock times are
not compared.

The [six-biome summary](current-main-six-biomes-712-summary.csv) collects the
12 real 14-night requests at seed 712. V1 retained more crops and reduced
crop losses in every biome. It also retained more cash in five of six;
Desierto is the exception because the virtual player bought substantially
more still-incomplete wall pieces. Gran Cañón control ended in night 11, so
its final counts have a shorter exposure horizon. All 12 raid reports are
verified with zero technical issues. This is one seed per biome. Sabana's heavy late losses and
Desierto's lower liquidity warn against adopting these parameters now.

## Sixty-night Sabana continuation

The same V1-pressure configuration requested 60 nights from a fresh start
and completed all 60 without a technical stop or game-over. Its first 30
day-end state hashes exactly match the earlier 30-night run. It ended with
46 crops, 604 coins and one operational center, after 1,345 cumulative crop
losses. The loss counts were 296 on nights 31–40, 304 on nights 41–50 and
223 on nights 51–60. All 60 raid reports verified with zero issues and no
coverage loss. Cumulative Game.tick was 544.2 s and virtual-player decisions
164.8 s; the run took 776.5 s. These are descriptive totals from the single
run, not an algorithmic speed comparison. The
[nightly ledger](current-main-v1-pressure-sabana712-60-nightly.csv) and
compressed full report (gzip SHA-256
`9ec6b6cde18a5617053dabd12fa87e309dd9f0e158b5bab439ff9c6972f16da6`)
are retained. Crop count declined from 89 at night 30 to 46 at night 60,
despite continued replanting. This result supports a 100-night trial but
does not yet demonstrate victory or economic sustainability to that horizon.

## First authentic 100-night victory, Sabana/712

V1 pressure requested 100 nights from a fresh start on source commit
`b8fb422336d8806c40a18217599364692f75fb0e` and completed all 100.
The terminal event is `CampaignWon` at dawn of day 101, with 16 living crops,
217 coins and one operational center. All 100 raid reports verified with zero
issues and no coverage loss. The first 60 day-end state hashes match the
separate 60-night run exactly. The final serialized-state SHA-256 is
`3633b2484d989ae112478bf6b261c7204ba4a695f1bfb16c8cdf2b726c62784c`.

There were 1,958 cumulative crop losses. The arm spent 860 coins on 86
thorn-wall modules; cumulative Game.tick was 732.0 s and virtual-player
decisions 273.2 s in a 1,137.2 s wall-clock run. This was a narrow victory,
not a healthy end state: night 96 left only eight crops, and the final ten
nights ended with 16. The [nightly ledger](current-main-v1-pressure-sabana712-100-nightly.csv)
and compressed [full report](current-main-v1-pressure-sabana712-100.json.gz)
preserve the trajectory and all raid receipts; report gzip SHA-256 is
`f715dfe004d3a49fcc5d78341311e48b612fa8e175fe0466f71ac9f0f6d1b1c1`.
One seed proves that the current engine and fixed defended bot can reach a
real 100-night victory under this experimental military recipe. It does not
estimate win probability or justify changing the production balance yet.

Weighted by living crops at each raid spawn, agricultural destruction was
7.96% in nights 6–14, 19.98% in nights 15–30, 22.89% in nights 31–60,
24.19% in nights 61–80 and 38.52% in nights 81–100. These are ratios of
actual crops destroyed to actual exposed crops summed within each interval,
not a proportional transformation of structural damage. They are far above
the provisional 2–4% nightly target for a well-defended farm. The bot's
wall purchases do not certify a closed enclosure here, so this is evidence
of a balance/strategy interaction rather than proof that the military
pressure alone is too high. The terminal victory is fragile and should not
be treated as acceptable final difficulty without further trials.

## Exploratory thorn-wall cost and HP, Desierto/712

A second biome used the same V1 military pressure, seed 712, expanding bot
and 14-night horizon. The standard thorn wall (10 coins, 100 HP; gate 60 HP)
ended with 77 living crops and 644 coins. The exploratory 8-coin, 120-HP
wall (gate 90 HP) ended with 107 crops and 1,065 coins. Actual crop losses
on nights 6–14 were 51 and 3, respectively. Both arms paid for 99 modules;
the purchase totals were 990 and 792 coins. Each completed all 14 raids with
`raidEvidence.status=verified`, no coverage loss and no issues. The
[nightly paired ledger](current-v1-desierto712-wall-pair-14-nightly.csv) and
compressed [standard](current-v1-standard-desierto712-14.json.gz) and
[exploratory](current-v1-affordable-desierto712-14.json.gz) reports retain
the parameters, hashes and raid receipts.

The exploratory arm first stopped technically on night 11 because a
retreating animal requested a route through an unloaded sector. PR #101 made
that unknown route wait for the existing residency service; a full replay
then completed 14 nights. The first ten day-end hashes of the replay match
the interrupted exploratory run exactly. The standard arm ran before this
engine repair and the exploratory replay after it, so this is a gameplay
signal, not a strict same-binary speed comparison. Their wall-clock times
must not be compared because other campaigns ran concurrently. The large
night-14 difference warrants independent seeds and longer horizons before
any production wall change.

## Held-out 100-night completion, Sabana/123

A fresh V1-pressure run with the unchanged expanding bot and current wall
specs completed all 100 nights on seed 123. `CampaignWon` occurred at dawn
of day 101 with six living crops, 122 coins, one worker and one operational
center. All 100 raid reports have `status=verified`, zero issues and no
coverage loss. The terminal state SHA-256 is
`0ea559a6d02728520f1feebbbb9cae9412d62aaa910c5ad30a86947b7dc715ae`.
The [nightly ledger](current-main-v1-pressure-sabana123-100-nightly.csv) and
compressed [full report](current-main-v1-pressure-sabana123-100.json.gz)
retain the actual trajectory. This run incorporated the separately merged
retreat and crop-connector fixes from PRs #99 and #100. Earlier attempts
stopped technically at nights 27 and 37; their first 26 and 36 daily state
hashes, respectively, matched the repaired replay. Neither interruption was
counted as a gameplay defeat.

Two Sabana seeds have now reached 100 nights under V1 pressure, but both
victories were precarious (16 crops/217 coins on seed 712 and six crops/122
coins on seed 123). This evidence supports continued cross-biome and
multi-seed testing; it does not establish a reasonable survival probability
or justify promoting V1 pressure to production.

## Longer exploratory wall-spec trials

The 8-coin/120-HP thorn-wall candidate also completed a real 100-night
Sabana/712 campaign under V1 pressure and the fixed expanding bot. It ended
with 18 crops and 257 coins, against 16 crops and 217 coins for the current
10-coin/100-HP wall. Both bought 86 modules (688 versus 860 coins), and both
had 100 verified raids with zero issues. The exploratory arm suffered 2,042
crop losses against 1,958 in the standard-wall arm. The small terminal
improvement therefore did not come from uniformly better agricultural
protection. The [nightly ledger](current-v1-affordable-sabana712-100-nightly.csv)
and compressed [full report](current-v1-affordable-sabana712-100.json.gz)
retain the actual run. The runs used slightly different engine revisions
because technical raid-path fixes were merged between them; wall-clock time
is not a controlled speed comparison.

On the independent Sabana/123 seed, a 30-night exploratory arm ended with
142 crops and 1,072 coins, versus 156 crops and 1,158 coins at the same
point of the standard-wall 100-night run. Agricultural losses through night
30 were 189 versus 356; both bought 90 modules, costing 720 versus 900
coins. Fewer crop losses did not translate into a better terminal crop or
cash count because the full campaign trajectory and bot actions diverged.
Its [nightly ledger](current-v1-affordable-sabana123-30-nightly.csv) and
compressed [report](current-v1-affordable-sabana123-30.json.gz) preserve the
evidence. The candidate should remain experimental; these two seeds do not
support a monotonic or universal benefit.

## Same-code price × durability ablation, Desierto/712

To separate the two wall levers, four 14-night arms used the same source
commit `dbe91d00`, identical WASM and input hashes, V1 military recipe,
seed, expanding bot and fixed game rules. All paid for 99 thorn modules and
completed 14 verified raids without issues. The higher-material candidate
table is identical across the three experimental arms; the bot selected
only thorn walls. The variables below are therefore the effective thorn
price and HP (including gate HP):

| Thorn specification | Crops at night 14 | Cash | Crop losses, nights 6–14 | Wall purchase cost |
| --- | ---: | ---: | ---: | ---: |
| Standard: 10 coins, 100 HP, gate 60 HP | 77 | 644 | 51 | 990 |
| Price only: 8 coins, 100 HP, gate 60 HP | 164 | 1,004 | 9 | 792 |
| Durability only: 10 coins, 120 HP, gate 90 HP | 165 | 852 | 7 | 990 |
| Both: 8 coins, 120 HP, gate 90 HP | 107 | 1,065 | 3 | 792 |

Both single-lever changes produced many more surviving crops than standard
walls on this seed. Combining them had the most cash and fewest raid crop
losses, yet fewer terminal crops than either single-lever arm. The game and
bot are path-dependent: changes to early purchases, staffing, planting and
raid encounters alter later opportunities. This interaction makes an
additive extrapolation from the two single-lever results unsound. The
second wall purchase occurred on day 14 with standard specs, day 11 with
price-only, day 12 with durability-only and day 11 with both changes.
Earlier investment is one concrete mechanism behind divergent exposure;
purchase timing alone does not certify that each enclosure was closed. The
[four-arm nightly ledger](factorial-desierto712-14-nightly.csv) and compressed
[standard](factorial-standard-desierto712-14.json.gz),
[price-only](factorial-cheap-desierto712-14.json.gz),
[durability-only](factorial-tough-desierto712-14.json.gz), and
[combined](factorial-cheap-tough-desierto712-14.json.gz) reports preserve
every campaign and its input hashes. One seed and 14 nights cannot rank
the candidates for production; the first five introductory raids also
limit what this horizon says about sustained military pressure.

## Same-code 30-night price × durability ablation, Desierto/712

The four Desierto arms were rerun from a fresh state for 30 nights on source
commit `68a53c3c` after the physical retreat connector fix in PR #103. The
WASM, `game.js`, `raids.js`, runner, seed, V1 pressure and expanding bot
hashes match across all four reports. Each completed 30 real raids with
`raidEvidence.status=verified`, zero issues and no coverage loss. The older
14-night runs used the preceding retreat behavior and must not be spliced
onto these 30-night trajectories.

| Thorn specification | Crops at night 30 | Cash | Crop losses, nights 6–30 | Modules bought | Wall purchase cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| Standard: 10 coins, 100 HP, gate 60 HP | 123 | 1,014 | 251 | 99 | 990 |
| Price only: 8 coins, 100 HP, gate 60 HP | 106 | 1,021 | 169 | 99 | 792 |
| Durability only: 10 coins, 120 HP, gate 90 HP | 125 | 761 | 86 | 99 | 990 |
| Both: 8 coins, 120 HP, gate 90 HP | 63 | 707 | 324 | 127 | 1,016 |

At this horizon the combined candidate is worse than standard on terminal
crops, cash and agricultural losses. It bought 28 additional modules on day
29, while the other arms stopped at 99; its seed spending was also about
5,600 coins above standard. These are observed changes in the fixed bot's
investment trajectory, not proof that stronger, cheaper walls are physically
weaker. The price-only candidate preserves roughly the same cash with fewer
raid crop losses but fewer terminal crops. Durability-only sharply reduces
raid losses while ending with less cash. No single arm is justified as a
production recommendation from one seed. The
[nightly ledger](factorial-desierto712-30-nightly.csv) and compressed
[standard](factorial-standard-desierto712-30.json.gz),
[price-only](factorial-cheap-desierto712-30.json.gz),
[durability-only](factorial-tough-desierto712-30.json.gz), and
[combined](factorial-cheap-tough-desierto712-30.json.gz) reports contain the
complete economic and physical evidence.

The first price-only 30-night attempt ended technically on day 25 when a
rhino in retreat held an unresolved graph route. Its partial state was
frozen; PR #103 reused the existing bounded physical connector and verified
the resulting path against native static collisions. The replay completed
30 nights. The interrupted run is not counted as a balance defeat.

## Same-code 60-night continuation, Desierto/712

Three arms extended the same Desierto/712 experiment to 60 nights on source
commit `a1860f35`. The V1 military recipe, expanding bot, seed, WASM and
`game.js`/`raids.js`/runner hashes match. The day-30 serialized-state hash in
each 60-night report exactly matches its archived 30-night run. All three
completed 60 real raids with `raidEvidence.status=verified`, zero issues and
no coverage loss. None won or lost by night 60.

| Thorn specification | Crops at night 60 | Cash | Crop losses, nights 6–60 | Modules bought | Wall purchases | Repairs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Standard: 10 coins, 100 HP, gate 60 HP | 51 | 695 | 674 | 99 | 990 | 5,286 |
| Price only: 8 coins, 100 HP, gate 60 HP | 81 | 642 | 420 | 99 | 792 | 4,187 |
| Durability only: 10 coins, 120 HP, gate 90 HP | 116 | 681 | 453 | 99 | 990 | 5,086 |

From nights 31–60 alone, raid crop losses were 423, 251 and 367 respectively.
The durability-only arm has the most living crops at this horizon, but its
losses in this later period exceed the price-only arm. The price-only arm
retains more crops than standard with 53 fewer coins; neither single-lever
arm dominates every metric. All three bought the same 99 modules, so the
additional surviving crops did not come from purchasing more wall pieces.
Their planting, repair and raid trajectories still diverged, and one seed
cannot establish a general recommendation or a probability of surviving 100
nights. The first five nights introduce animals; losses are reported from
night 6 onward for the sustained-pressure comparison.

The [nightly ledger](pareto-desierto712-60-nightly.csv) and compressed full
reports for [standard](pareto-standard-desierto712-60.json.gz),
[price only](pareto-cheap-desierto712-60.json.gz) and
[durability only](pareto-tough-desierto712-60.json.gz) preserve every action,
raid and input hash. The ledger also contains per-night `Game.tick` and bot
decision time. Those wall times were measured with the three CPU-heavy runs
concurrent and with different campaign trajectories; they are evidence of
computational cost, not an isolated speed comparison between wall specs.

## Held-out Gran Cañón/123: 30-night single-lever check

The V1 pressure candidate and established expanding `good` bot were held
fixed on source `243c4452`; only the thorn-wall price or durability changed.
Each arm completed 30 real nights with verified raid evidence and zero
issues. This seed was not used for the Desierto/712 cost comparison above.

| Thorn specification | Living crops | Coins | Raid crop losses, nights 6–30 | Animals | Wall purchases | Repairs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Standard: 10 coins, 100 HP, gate 60 HP | 74 | 510 | 174 | 226 | 790 | 616 |
| Price only: 8 coins, 100 HP, gate 60 HP | 104 | 823 | 63 | 247 | 704 | 323 |
| Durability only: 10 coins, 120 HP, gate 90 HP | 66 | 955 | 124 | 229 | 790 | 612 |

The price-only arm finished with more crops and cash than the other two
despite facing more animals; it also spent less on repairs. The durability
arm retained the most cash but fewer crops than standard. Farm growth changed
the later raid sizes, so these are complete policy outcomes rather than
equal-workload estimates of wall efficiency. The distinct Desierto/712 result
also prevents recommending a production price change from these two seeds.
The full reports are [standard](heldout-standard-gran-canon123-30.json.gz),
[price only](heldout-cheap-gran-canon123-30.json.gz) and
[durability only](heldout-tough-gran-canon123-30.json.gz).

## Event-driven maintenance with V1 pressure: Gran Cañón/712, 60 nights

After the structure-condition events and autonomous repair policy from PR #104
landed in `main`, the unchanged V1 military candidate and standard wall table
were run with the topological bot for 60 real nights (source `7c2c3ab1`). The
first 30 nightly state hashes exactly match the earlier archived PR #104
30-night run. Raid evidence is verified, with zero issues and no missing raid
coverage. The game had neither won nor lost at night 60: it had 49 living
crops, 636 coins and one operational center. This is survival to 60 nights,
not evidence of a 100-night victory.

From night 6 onward, 594 animals attacked and 39 crops were destroyed. The
bot executed 585 repair requests, spending 3,885 coins on repairs, while wall
purchases cost 330 coins. Its accumulated decision time was 52.3 seconds and
`Game.tick` time 257.9 seconds. The measured `Game.tick` cost was 4.21, 3.99,
4.01 and 4.68 seconds on nights 14, 30, 45 and 60, respectively; this run
does not show runaway per-night tick growth. The compressed [full
report](current-main-repair-v1-topological-gran-canon712-60.json.gz) retains
the per-night economy, decisions, raids, hashes and timings.

This is one seed and biome under experimental V1 pressure. It does not rank
wall-cost candidates or establish a general survival probability. Its
100-night continuation is recorded below.

## Same-input 100-night attempt: economic defeat after night 82

The 100-night request used the same Gran Cañón/712, V1 pressure, standard
walls and topological maintenance policy. Its first 60 nightly serialized
state hashes exactly match the archived 60-night report. It ended in an
authentic economic defeat after night 82, with zero living crops, 22 coins,
one operational center and one worker. It did not reach night 100. All 82
raids have verified physical evidence with zero issues and no coverage loss;
this result is not a navigation stop.

| Nights | Crops at end | Cash at end | Raid crop losses | Animals | Income | Wages | Seeds | Repairs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6–30 | 55 | 950 | 33 | 240 | 15,882 | 6,868 | 7,223 | 1,200 |
| 31–60 | 49 | 636 | 6 | 354 | 16,739 | 7,985 | 6,243 | 2,685 |
| 61–70 | 29 | 202 | 63 | 105 | 3,944 | 2,010 | 1,620 | 668 |
| 71–82 | 0 | 22 | 49 | 109 | 2,214 | 1,002 | 835 | 437 |

The decisive decline starts after night 60: 112 crops were destroyed in raids
over nights 61–82, versus six over nights 31–60. Income and workforce then
contracted. The bot continued to repair, but by night 82 a proposed
11-module enclosure cost 110 coins and it was saving for a complete purchase
with only 22 coins left. This is an observed economic and military feedback
loop; the report does not isolate whether changing wall prices, pressure, or
the bot's allocation would prevent it. The compressed [full
report](current-main-repair-v1-topological-gran-canon712-100.json.gz)
contains every nightly state hash, decision, raid receipt and timing. Further
held-out seeds and biomes are required before any balance recommendation.

## Held-out Gran Cañón/123: narrow 100-night victory

The same V1 candidate, standard wall table and event-driven topological bot
were run with seed 123 for a requested 100 nights. The `inputHashes` match the
712 run; the later source commit changed only documentation. This campaign
reached `CampaignWon` after 100 real nights with six living crops, 55 coins,
one worker and one operational center. All 100 raid receipts are verified,
with zero issues and no coverage loss. The compressed [full
report](current-main-repair-v1-topological-gran-canon123-100.json.gz) retains
the daily state hashes, economy, actions, raid outcomes and timings.

| Nights | Crops at end | Cash at end | Raid crop losses | Animals | Income | Wages | Seeds | Repairs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6–30 | 102 | 1,017 | 18 | 274 | 26,860 | 14,209 | 11,531 | 326 |
| 31–60 | 97 | 530 | 219 | 435 | 33,407 | 16,956 | 15,027 | 1,811 |
| 61–80 | 18 | 100 | 170 | 207 | 6,450 | 3,196 | 2,760 | 874 |
| 81–100 | 6 | 55 | 68 | 199 | 4,412 | 1,713 | 1,700 | 1,044 |

The bot made 628 repair requests and spent 4,055 coins on repairs across the
campaign. Seed 123 grew a much larger farm than 712 early on and therefore
produced substantially different workloads and raid trajectories. Its
`Game.tick` accumulated 816.1 seconds, versus 322.6 seconds for the 82-night
712 run; the largest single day was night 61 at 28.3 seconds. These figures
are observed simulation costs, not an isolated engine-speed comparison. Both
seeds suffered severe late agricultural losses, and the victory retained only
a minimal farm. One victory and one defeat do not establish a win rate or
justify changing production pressure, wall prices or damage. They do show
that the event-driven repair integration survives a complete campaign and
that V1 balance still needs cross-biome and multi-seed evaluation.

## Cross-biome topological maintenance: Sabana/712

The same V1 candidate and standard walls were requested for 100 nights with
the event-driven topological bot in Sabana. The first 14 nightly serialized
state hashes and all `inputHashes` match the archived PR #104 maintenance
run. This campaign ended in an authentic economic defeat after night 76, with
zero crops, 32 coins and one operational center. All 76 raid receipts are
verified, with zero issues and no coverage loss. The bot made 824 repair
requests and paid 5,480 coins in repairs; wall purchases cost 990 coins.

| Nights | Crops at end | Cash at end | Raid crop losses | Animals | Income | Wages | Seeds | Repairs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6–30 | 112 | 958 | 379 | 304 | 34,501 | 15,360 | 17,036 | 1,550 |
| 31–60 | 76 | 542 | 535 | 423 | 36,528 | 16,424 | 17,676 | 2,714 |
| 61–67 | 101 | 582 | 24 | 97 | 7,095 | 3,084 | 3,110 | 781 |
| 68–76 | 0 | 32 | 177 | 101 | 3,570 | 1,655 | 1,780 | 435 |

The last collapse is concentrated in nights 68–72. Raids destroyed 32, 6,
49, 42 and 40 crops respectively. On nights 70–72 there were zero wall hits,
while the bot's enclosure adviser returned only `no-certified-proposal` for
the crop groups it evaluated. Most general-cut attempts reported
`movement-unproved` with two or three boundary faces not certified as physical
barriers. A 72-night diagnostic replay in [PR #105](https://github.com/dossijeo/wild-guardians-africa/pull/105)
matched every baseline daily state hash. All 74 rejected proposals with face
details contained faces whose continuous blockage was not certified (`0`),
with no unavailable (`-1`) face. Code `0` does not prove animal passage.
On nights 70–72, three adjacent uncertified faces recur between `x=104` and `105`
at `z=-1`, `0` and `1`. The artificial-hull alternatives omitted modules
because of physical placement conflicts. In the frozen day-70 state, two
zero-HP ruins occupied those stroke slots. Merged PR #105 demonstrated that
two legal 10-coin modules close this **local seam**: native face codes changed
from `[0,0,0]` to `[1,1,1]` after a paid build that retired the ruins and
their repair tasks. This does not alone certify the entire enclosure or prove
that the animals crossed those exact faces. The old cut lacked a continuous
closure certificate, so its defeat cannot be attributed to military pressure
alone. An `unknown` closure must not be treated as protected.

`Game.tick` accumulated 672.6 seconds and bot decisions 290.0 seconds. The
largest single `Game.tick` day was night 19 at 14.6 seconds; these figures
include the changing farm workload and are not an isolated speed comparison.
The compressed [full report](current-main-repair-v1-topological-sabana712-100.json.gz)
and combined [nightly ledger](current-main-repair-v1-topological-nightly.csv)
retain the three event-driven topological campaigns, including hashes, raid
losses, economy and measured times. With one narrow 100-night victory and two
authentic defeats across these three runs, neither V1 pressure nor the
current topological policy is validated for production balance.

## Post-PR #105 physical-enclosure correction

PR #105 is now merged into `main` and synchronized into this experimental
branch. Its combined Sabana/712 V1 replay completed 72 verified raids with
zero recorded physical or technical issues: 24 living crops and 307 coins,
versus 4 and 308 in the old control at that horizon. Raid crop losses from
night 6 were 1,032 versus 1,107; nights 70–72 lost 43 rather than 131 crops.
The first state-hash divergence was day 14, so this is a changed farm and
attack trajectory, not an isolated performance benchmark or proof of a
100-night win. [Full reports and caveats](../enclosure-face-diagnostics/README.md)
retain the unsuccessful first Gran Cañón 30-night variant as well as the
repair-first correction: the latter ended with 54 crops and 1,015 coins,
compared with 55 and 950 for the established control, with zero issues in
both.

The [repair-first Sabana/712 request](current-main-repair-first-v1-topological-sabana712-100.json.gz)
then ran for all 100 real nights using the V1 pressure candidate, unchanged
WASM/raids/runner and the PR #105 game and policy files. Its report records
the exact input hashes; it was launched from the isolated replay checkout
before the later PR #106 worker-exit proof and QA-manifest changes were merged.
The first nightly state-hash divergence from the old 76-night control is day
14. This is a different farm and raid workload, not a same-trajectory speed
benchmark.

| Nights | Crops at end | Cash at end | Raid crop losses | Animals | Wall hits | Income | Wages | Seeds | Repairs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6–30 | 84 | 977 | 420 | 323 | 704 | 37,113 | 15,887 | 18,849 | 1,803 |
| 31–60 | 81 | 497 | 618 | 400 | 786 | 31,538 | 14,141 | 15,805 | 2,042 |
| 61–76 | 49 | 579 | 186 | 212 | 530 | 13,337 | 5,717 | 6,075 | 1,443 |
| 77–90 | 27 | 342 | 176 | 183 | 468 | 8,608 | 3,573 | 3,945 | 1,327 |
| 91–100 | 0 | 30 | 71 | 114 | 289 | 3,364 | 1,398 | 1,455 | 823 |

The campaign bought 58 wall modules for 580 coins and requested 1,217 paid
repairs, spending 7,438 coins. Its 100 raid receipts are verified, with zero
issues and no coverage loss. It passed the old control's defeat horizon: at
night 76 it still had 49 crops and 579 coins, whereas the control had none
and 32 coins. However, after night 100 the morning economic-loss check
produced `GameOver` on day 101 with zero crops, 30 coins and one operational
center. **This is an authentic defeat, not a 100-night victory or a technical
failure.** The bot spent 106 enclosure decisions waiting for repairable ruins
and purchased only three certified proposals (53 modules on day 7, three on
day 57, two on day 72). These counts motivate a policy/balance investigation;
they do not by themselves prove that deferral was wrong or that military
pressure alone caused the late collapse. `Game.tick` accumulated 1,089.15 s
and bot decisions 408.11 s over 100 nights, versus 672.65 and 289.97 s over
76 nights in the smaller, earlier-ending control. Do not interpret those
different-horizon totals as an algorithm slowdown or speedup.

## Repair-first Sabana/712: isolated thorn-price pilot

After the standard-wall 100-night loss above, the same isolated replay code,
seed, topological bot and V1 military pressure were run for 30 nights with
only the thorn module price changed from 10 to 8 coins. Thorn HP remains 100,
gate HP 60, and all other wall specifications are unchanged. Both arms have
identical WASM, game, raids and runner input hashes. The lower-price run has
30 verified raid receipts, zero issues and no coverage loss. It is archived
in the [full pilot report](current-main-repair-first-v1-cheap-thorn-sabana712-30.json.gz).

| Measure after night 30 | Standard thorn | 8-coin thorn |
| --- | ---: | ---: |
| Living crops | 84 | 101 |
| Coins | 977 | 1,252 |
| Raid crop losses from night 6 | 420 | 409 |
| Animals generated | 328 | 322 |
| Wall hits | 704 | 682 |
| Wall modules purchased | 53 | 53 |
| Wall purchase cost | 530 | 424 |
| Repair spend | 1,803 | 1,391 |

The single price change improved both crop survival and cash at this horizon.
It also changed the farm and raid trajectories; lower repair spending cannot
be interpreted as the price saving alone. The standard run overlapped other
CPU-heavy tests whereas the pilot did not, so its wall-clock times are not a
valid speed comparison.

The 60-night continuation reproduced the pilot's day-30 serialized-state
hash (`93c5577584274ff66ee2e01aab467c4855daac9058a8a8b323cc3832d7957ebd`)
but **stopped during night 34 with an unfinished raid**. It completed only
33 nights and cannot support any 60-night balance conclusion. The complete
[interrupted report](current-main-repair-first-v1-cheap-thorn-sabana712-60-interrupted.json.gz)
records the 4.8 MB partial-state path, exact input hashes, daily results and
the technical error. `animal-40506` had exhausted its hits and remained
stationary while repeated invalid retreat connectors restarted its recovery
deadline. The physical partial state and directed fix are documented in
[PR #107](https://github.com/dossijeo/wild-guardians-africa/pull/107). That
fix uses a valid native route from the animal's current position and preserves
the recovery deadline; it does not change pressure or wall prices. A full
rerun after the fix is required before considering a production price change.

## Matched 60-night rerun after PR #107

PR #107 is merged into `main` and this branch. With that correction, both
Sabana/712 arms completed **60 real nights**, with 60 verified raid receipts
each, zero evidence issues and no coverage loss. The runs were sequential on
the same host and used the same source revision `6568059c`, WASM, game,
raids and runner input hashes. The only candidate difference was thorn cost
10 versus 8 coins; HP, gates, V1 pressure and the virtual-player policy were
unchanged. The [standard-price report](current-main-pr107-v1-standard-thorn-sabana712-60.json.gz)
and [8-coin report](current-main-pr107-v1-cheap-thorn-sabana712-60.json.gz)
contain all nightly hashes, finances, raid evidence and timing.

| Measure | Standard thorn | 8-coin thorn |
| --- | ---: | ---: |
| Crops / coins after night 30 | 84 / 977 | 101 / 1,252 |
| Crops / coins after night 60 | 107 / 755 | 107 / 745 |
| Raid crop losses, nights 6–60 | 915 | 987 |
| Animals, nights 6–60 | 731 | 753 |
| Wall hits, nights 6–60 | 1,693 | 1,738 |
| Wall modules / purchase cost | 55 / 550 | 57 / 456 |
| Paid repair cost, nights 1–60 | 4,376 | 3,713 |
| Income, nights 1–60 | 76,562 | 78,977 |
| `Game.tick` / bot decisions | 535.93 / 184.84 s | 569.31 / 205.58 s |

The cheaper candidate's early advantage did not persist: nights 31–60 lost
578 crops versus 495, while drawing 436 versus 408 animals. At night 60 the
two arms had the same living crop count and the cheaper one had 10 fewer
coins. Their different farms and incursions mean the timing totals are not
a same-workload engine benchmark. This one seed does **not** justify reducing
the production thorn price or launching a cheap-thorn 100-night run. The
standard-price arm's night-30 hash matches the older standard report, but its
later trajectory differs; the old 100-night defeat cannot stand in for a
100-night result on the corrected engine. That standard-price replay is the
next staged balance test.

## Corrected-engine standard-price 100-night request

The standard-price Sabana/712 V1 run on the same PR #107 code reproduced
**all 60** nightly hashes of the matched standard-price run above, then
continued without a recorded technical or physical issue. Its
[full report](current-main-pr107-v1-standard-thorn-sabana712-100.json.gz)
contains 99 verified real raid receipts, zero issues and no coverage loss.
The campaign ended in an authentic **economic defeat after night 99**:
at dawn of day 100 it had zero crops, one operational center, one worker and
7 coins. There was `GameOver`, not `CampaignWon`; night 100 was not played.

| Nights | Crops at end | Cash at end | Raid crop losses | Animals | Wall hits | Income | Wages | Seeds | Repairs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 6–30 | 84 | 977 | 420 | 323 | 704 | 37,113 | 15,887 | 18,849 | 1,803 |
| 31–60 | 107 | 755 | 495 | 408 | 989 | 34,788 | 15,662 | 16,755 | 2,573 |
| 61–76 | 55 | 372 | 256 | 220 | 508 | 13,593 | 6,059 | 6,495 | 1,402 |
| 77–90 | 47 | 582 | 98 | 188 | 488 | 10,502 | 4,401 | 4,570 | 1,281 |
| 91–99 | 0 | 7 | 102 | 102 | 209 | 2,461 | 1,184 | 1,210 | 642 |

The last interval's income of 2,461 coins did not cover its 3,036 coins of
wages, seeds and repairs; the 575-coin shortfall exactly matches the decline
from 582 coins after night 90 to 7 after night 99. Its raids destroyed 102
crops in that interval, but the report does not isolate a single attack as
the sole cause: falling deliveries, staffing and defensive spending feed back
into one another. It bought 61 wall modules for 610 coins overall and made
1,281 paid repair requests, spending 7,701 coins. Total measured `Game.tick`
was 842.69 s and bot decisions 306.29 s over 99 nights; neither is an
equivalent-state speed comparison with the old 100-night defeat, whose source
and farm trajectory differ. The new engine improved this seed's mid-campaign
stock (107 versus 81 crops at night 60) but still did not meet the design
goal of a reasonably survivable 100-night game. Production balance remains
unchanged. A staged durability-only thorn candidate is justified next; a
single-seed improvement will still require independent validation.

## Thorn-durability pilot: 30 nights

The next candidate keeps the thorn module at 10 coins but raises its wall HP
from 100 to 120 and gate HP from 60 to 90. No other material, V1 pressure,
bot policy or game rule changed. Both Sabana/712 arms use identical hashes
for WASM, `game.js`, `raids.js` and the runner. The top-level source commits
differ only because documentation was added between sequential runs. The
[complete 30-night durability report](current-main-pr107-v1-tough-thorn-sabana712-30.json.gz)
and the standard-price [control](current-main-pr107-v1-standard-thorn-sabana712-60.json.gz)
each have verified raid evidence, zero issues and no coverage loss.

| Measure after night 30 | Current 100/60 HP | Candidate 120/90 HP |
| --- | ---: | ---: |
| Living crops | 84 | 138 |
| Coins | 977 | 866 |
| Raid crop losses from night 6 | 420 | 191 |
| Animals | 323 | 324 |
| Wall hits | 704 | 833 |
| Wall modules purchased | 53 | 79 |
| Wall purchase cost | 530 | 790 |
| Paid repairs | 1,803 | 1,731 |

The candidate redirected more of a similar-size attack toward the defense
and lost 229 fewer crops. It also bought 26 more wall modules, spending 260
additional coins, and closed with 111 fewer coins. This is a changed farm
trajectory, not a pure strength or speed microbenchmark. The gate and wall
HP changed together, so this pilot cannot identify their separate effects.
The 60-night continuation is needed to see whether protection and solvency
persist; no production change follows from this single 30-night result.

The [60-night durability continuation](current-main-pr107-v1-tough-thorn-sabana712-60.json.gz)
reproduced all 30 pilot hashes, completed 60 verified raids with zero issues
and no coverage loss, and used the same WASM/game/raids/runner hashes as the
60-night standard control. The two arms were run sequentially. Its stronger
early protection led to a larger subsequent farm and different military
pressure:

| Measure | Standard 100/60 HP | Candidate 120/90 HP |
| --- | ---: | ---: |
| Crops / coins after night 60 | 107 / 755 | 96 / 798 |
| Raid crop losses, nights 6–60 | 915 | 1,074 |
| Animals, nights 6–60 | 731 | 850 |
| Wall hits | 1,693 | 2,006 |
| Wall modules / purchase cost | 55 / 550 | 119 / 1,190 |
| Repair spending | 4,376 | 4,829 |
| Income | 76,562 | 93,571 |
| `Game.tick` / bot decisions | 535.93 / 184.84 s | 744.25 / 255.95 s |

The reversal is concentrated in nights 31–60: the candidate suffered 883
crop losses versus 495, faced 526 animals versus 408, and bought another
400 coins of walls versus 20. It still earned 43 more terminal coins, but
had 11 fewer living crops and materially more agricultural destruction.
Its higher CPU time reflects a larger and differently attacked farm, not a
demonstrated navigation regression. The 30-night benefit did not remain a
clear sustained advantage. Do not infer from this single seed that tougher
walls are intrinsically bad; the farm's attraction and attack feedback need
more careful military-pressure tuning. We do not recommend this durability
candidate for production or promote it to a 100-night run on this evidence.

## Attraction-sensitive recovery count: 30-night pilot

The next isolated candidate changes only the V1 animal-count factor from
`0.35 + 0.60 A/(A+1500)` to `0.25 + 0.70 A/(A+1500)`, where `A` is the
currently observed crop attraction. Hit budgets, structural damage, wall
prices/HP, virtual-player policy and the five introductory nights remain
unchanged. At attraction 500 the factor is 0.425 instead of 0.500; at 10,000
it is 0.859 instead of 0.872. This tests whether pressure falls enough to
support recovery after agricultural losses without much easing a large farm.
The [candidate recipe](../../../tools/experiments/balance-candidates/v1-pressure-recovery-count.json)
and [full 30-night report](current-main-pr107-v1-recovery-count-sabana712-30.json.gz)
make the run reproducible.

The current-engine Sabana/712 standard-price 60-night report above supplies
the first 30 control nights. Both runs used the same WASM, game, raids and
runner hashes and the same topological virtual-player policy. The first five
nights had identical living-crop and cash counts; serialized hashes differ
because the saved pressure recipe identifies its candidate. Night 6 was the
first gameplay divergence (four candidate animals versus five control).
Both arms have 30 verified real raids, zero evidence issues and no coverage
loss.

| Measure through night 30 | Original V1 count | Recovery-count candidate |
| --- | ---: | ---: |
| Living crops / coins | 84 / 977 | 99 / 1,152 |
| Animals, nights 6–30 | 323 | 293 |
| Crops destroyed by raids, nights 6–30 | 420 | 278 |
| Wall hits, nights 6–30 | 704 | 689 |
| Wall purchases / repairs, coins | 530 / 1,803 | 800 / 1,613 |
| Income / wages / seeds, coins | 41,774 / 17,780 / 21,384 | 41,107 / 18,127 / 20,115 |
| `Game.tick` / bot decisions, seconds | 273.60 / 83.39 | 299.94 / 79.14 |

The candidate retained 15 more crops and 175 more coins, but bought 270
coins more in walls. This is a different farm trajectory, so the tick times
cannot establish a navigation speed change. The earlier cheaper and stronger
wall candidates also looked favorable at night 30 before reversing later.
The recovery-count candidate therefore needs a sustained 60-night replay
before any balance recommendation, followed by independent seeds and biomes.
No production parameter was changed.

The [60-night continuation](current-main-pr107-v1-recovery-count-sabana712-60.json.gz)
reproduced every hash of the 30-night pilot. It completed 60 verified real
raids without an evidence issue or loss of coverage. The comparison below is
against the same current-engine Sabana/712, V1, standard-wall control used for
the pilot:

| Measure | Original V1 count | Recovery-count candidate |
| --- | ---: | ---: |
| Crops / coins after night 30 | 84 / 977 | 99 / 1,152 |
| Crops / coins after night 60 | 107 / 755 | 123 / 746 |
| Animals, nights 6–60 | 731 | 704 |
| Crop losses, nights 6–60 | 915 | 709 |
| Wall hits, nights 6–60 | 1,693 | 1,759 |
| Wall purchase / repair cost, coins | 550 / 4,376 | 870 / 4,725 |
| `Game.tick` / bot decisions, seconds | 535.93 / 184.84 | 706.48 / 191.61 |

This is the first tested candidate in this series whose crop-count advantage
survived to night 60 without a material loss of cash: 16 extra crops and nine
fewer coins at the horizon, with 206 fewer agricultural raid losses. The
feedback is visible in nights 31–60: the candidate faced 411 animals versus
408 in the control despite its lower count factor, because the larger farm
raised its attraction; it nevertheless lost 431 crops versus 495. It spent
589 more coins on walls and repairs in that interval. The higher tick time
reflects a different and often larger farm workload and cannot be attributed
to navigation speed. These results justify a 100-night Sabana/712 extension,
but one seed cannot establish a general balance recommendation. Independent
seeds and biomes remain necessary, and production balance remains unchanged.

The [100-night request](current-main-pr107-v1-recovery-count-sabana712-100.json.gz)
reproduced **all 60** hashes of the continuation, then ended in an authentic
economic defeat after night **97**. It has 97 verified raid receipts, zero
evidence issues and no coverage loss. At day-98 dawn it had zero crops, one
operational center, one worker and 27 coins; night 100 was never played.
The standard V1 control likewise lost economically, but after night 99.

| Measure | Original V1 count | Recovery-count candidate |
| --- | ---: | ---: |
| Crops / coins after night 60 | 107 / 755 | 123 / 746 |
| Crops / coins after night 70 | 54 / 423 | 84 / 541 |
| Crops / coins after night 80 | 62 / 421 | 60 / 392 |
| Crops / coins after night 90 | 47 / 582 | 53 / 448 |
| Last verified night | 99 | 97 |
| Raid crop losses, nights 91–97 | 96 | 121 |
| Animals, nights 91–97 | 84 | 70 |

The candidate's advantage at night 70 had vanished by night 80. Its 11
animals on night 95 destroyed 44 crops, leaving only three alive; they hit
walls six times. The control had the same 11-animal species composition on
that night, but hit walls 36 times and destroyed no crops. This is evidence
of different physical exposure and defense state, not a direct proportional
effect of the count multiplier. Between days 85 and 95 the candidate bot
recorded 24 `unknown/no-certified-proposal` enclosure attempts and no new
wall purchase; those unknowns were not treated as protected. The fixed
topological bot then bought a **paid 22-module enclosure for 220 coins on day
96**, which ended with only two crops and 33 coins. The control did not
make that late purchase. This is a legal strategic interaction with the same
bot policy, not an engine fault or proof that the count factor alone caused
the final shortfall. The final seven nights brought 121 candidate crop losses
despite 70 animals, versus 96 losses from 84 animals in the control: attack
geometry, defense state and farm trajectory matter more than nominal horde
size alone. Neither arm survived night 100, and this candidate is **not
recommended for production**. Its 30- and 60-night improvements remain useful
evidence, but must not be reported as a full-campaign success.

## Recovery-count cross-biome check: Gran Cañón / 712

The same count-only candidate was replayed for 30 nights in Gran Cañón
against the original V1 pressure, with the event-driven topological defender.
Both reports identify source `d266cf5c`, the same WASM, game, raid and runner
hashes, and their separate candidate hashes. All 30 real raids in each arm
have verified receipts, zero evidence issues and no coverage loss. The first
five nights have equal crop and cash counts; their serialized hashes differ
because the candidate recipe is part of the saved state. Complete reports are
[control](v1-control-gran-canon712-30.json.gz) and
[recovery count](v1-recovery-count-gran-canon712-30.json.gz); the
[nightly comparison](v1-count-gran-canon712-30-nightly.csv) retains cash,
crops, costs, attacks and timings for every night. Reproduce either arm with
`node tools/experiments/run-balance-candidate.mjs <recipe> 30 gran-canon 712
<output.json> topological`.

| Measure through night 30 | Original V1 count | Recovery-count candidate |
| --- | ---: | ---: |
| Living crops / coins | 54 / 1,015 | 46 / 981 |
| Animals, nights 6–30 | 218 | 235 |
| Crops destroyed by raids, nights 6–30 | 26 | 20 |
| Wall hits / HP lost | 490 / 9,595 | 616 / 13,218 |
| Wall purchases / repairs, coins | 200 / 991 | 250 / 1,354 |
| Income / wages / seeds, coins | 17,566 / 7,980 / 8,080 | 19,735 / 8,104 / 9,746 |
| `Game.tick` / bot decisions, seconds | 109.65 / 21.19 | 116.36 / 22.24 |

The candidate suppressed six agricultural raid losses but finished with eight
fewer crops and 34 fewer coins. It bought and repaired more walls. Its larger
farm trajectory produced **more** animals despite a lower count factor: 235
versus 218 from night 6. In nights 21–30, the candidate suffered 14 crop
losses versus 26 in the control, yet its living-crop stock fell from 52 to 46
while the control recovered from 53 to 54. Harvesting, replanting, income and
defense spending all differ, so attack losses alone cannot explain the stock.
The runs were sequential, with different workloads; their wall times do not
establish a change in engine speed. This second biome does not rescue the
candidate's authentic night-97 defeat in Sabana, and provides no basis to
promote its pressure parameters to production. Further balance work should
evaluate independent seeds and the late-game defense/planting interaction.

## Recovery-count held-out seed: Sabana / 123

An independent Sabana seed was replayed through night 30 using the same
topological defender and the two pressure recipes. Both arms identify source
`8e4dd745`, the same WASM, game, raid and runner hashes, and separate recipe
hashes. Each completed 30 verified real raids, with zero evidence issues and
no coverage loss. The first five nights had equal crop and cash counts. The
full [control](v1-control-sabana123-30.json.gz) and
[recovery-count](v1-recovery-count-sabana123-30.json.gz) reports and
[nightly comparison](v1-count-sabana123-30-nightly.csv) are retained.
Reproduce with `node tools/experiments/run-balance-candidate.mjs <recipe>
30 sabana 123 <output.json> topological`.

| Measure through night 30 | Original V1 count | Recovery-count candidate |
| --- | ---: | ---: |
| Living crops / coins | 149 / 975 | 144 / 972 |
| Animals, nights 6–30 | 319 | 307 |
| Crops destroyed by raids, nights 6–30 | 431 | 432 |
| Wall hits / HP lost | 672 / 14,959 | 680 / 15,334 |
| Wall purchases / repairs, coins | 430 / 1,706 | 430 / 1,623 |
| Income / wages / seeds, coins | 40,029 / 16,975 / 20,643 | 40,932 / 17,335 / 21,272 |
| `Game.tick` / bot decisions, seconds | 282.89 / 75.19 | 286.48 / 88.93 |

The candidate saw 12 fewer animals but one more agricultural raid loss, and
ended with five fewer crops and three fewer coins. It had a severe early
interval on nights 15–20 (164 losses versus 114), then fewer losses on
nights 26–30 (111 versus 155); the trajectories are not proportional to the
animal-count multiplier. Both runs used real payments and unchanged bot
policy, but their decisions and workloads diverged. Sequential timing cannot
isolate algorithm speed. Together with the Gran Cañón result and the authentic
Sabana/712 defeat after night 97, this held-out seed argues against adopting
the isolated count-factor candidate. It does not establish a better pressure
recipe or a survival probability; further candidates should account for
defense geometry and crop-loss feedback across seeds and biomes.

## Enclosure planner sensitivity after PR #108: Sabana / 712

The recovery-count recipe was replayed for up to 100 nights after the
physically certified obstacle closure from PR #108 reached `main`. The
complete [new report](current-main-pr108-v1-recovery-count-sabana712-100.json.gz)
identifies source `4c4d8b41`; the previous
[report](current-main-pr107-v1-recovery-count-sabana712-100.json.gz)
identifies source `3b198130`. The WASM, `game.js`, `raids.js`, campaign
runner, seed, biome, recipe and virtual-player policy hashes match. This is
an architecture/policy sensitivity comparison, **not** a comparison of two
balance recipes on the same engine version.

The new run ended in an authentic economic defeat after night **57**, with
57 verified raid receipts, zero evidence issues, zero crops and one
operational center. The previous run lasted 97 nights, also ending in
economic defeat. At night 57 the previous run still had 86 living crops,
24 workers and 869 coins, versus zero crops, one worker and 33 coins in the
new run.

| Through night 57 | Before #108 | After #108 |
| --- | ---: | ---: |
| Animals | 666 | 547 |
| Raid crop losses | 665 | 1,299 |
| Income / wages, coins | 76,188 / 34,255 | 51,169 / 19,757 |
| Wall purchases / repairs, coins | 870 / 4,340 | 410 / 1,231 |
| `Game.tick` / bot decisions, seconds | 672.75 / 178.21 | 331.83 / 127.87 |

The first nightly state hash differs on day 2, before any wall purchase.
Both runs initially proposed a 460-coin cut, but the earlier planner
rejected the next proposal with an omitted physical module. The new planner
certified that static obstacle as part of the boundary, so the bot continued
saving and bought a smaller 410-coin enclosure on day 4. The earlier bot
bought a 530-coin enclosure on day 7, after more agricultural expansion.
The new run never selected the one-metre local detour that motivated #108;
its altered trajectory comes from accepting a physically certified mixed
barrier earlier. The new farm initially kept more crops through day 9, but
its later expansion repeatedly required roughly 400–600 coins for another
complete closure. It made no second wall purchase, accumulating 46
`saving-for-complete-enclosure` decisions, 78 decisions to repair ruined
modules first, and 12 uncertified proposals.

This is evidence that the fixed geometric planner exposes a strategic
weakness in the unchanged economic policy: buying the first affordable
certified enclosure can protect too small a farm and make later expansion
costly. It does not show that the new enclosure is physically invalid, nor
that the recovery-count pressure itself caused the 40-night gap. The lower
wall times reflect a smaller, dying farm and are not a speedup. Do not
promote the balance recipe or tune military parameters from this cross-version
comparison alone. The matched current-engine pressure comparison follows below.

## Matched current-engine pressure comparison: Sabana / 712

Using the same post-#108 engine and unchanged topological bot, three real
campaigns compared the [production pressure](current-main-pr108-control-sabana712-60.json.gz),
the [original V1 pressure](current-main-pr108-v1-original-sabana712-60.json.gz)
and [V1 with reduced low-attraction count](current-main-pr108-v1-recovery-count-sabana712-100.json.gz).
The first two were requested for 60 nights and the third for 100. The
original-V1 report has a different Git commit because the previous two
reports were archived between runs; the WASM, `game.js`, `raids.js`, runner,
balance adapter, pressure modules and defense-policy hashes are identical.
Only the named experimental pressure recipe differs. All completed raids
have verified receipts, zero evidence issues and no coverage loss.

| Result | Production | Original V1 | Reduced-count V1 |
| --- | ---: | ---: | ---: |
| Last verified night | 36 | 60, horizon reached | 57 |
| Result | Defeat | Not decided at 60 | Defeat |
| Living crops / coins at terminal dawn | 0 / 32 | 52 / 579 | 0 / 33 |
| Animals through each run | 526 | 763 | 547 |
| Raid crop losses through each run | 527 | 1,161 | 1,299 |
| First enclosure purchase | Day 4, 410 | Day 4, 410 | Day 4, 410 |

The original-V1 and reduced-count recipes differ only in the count factor:
`[0.35, 0.60]` versus `[0.25, 0.70]` at the same attraction half-saturation
of 1,500. They use identical hit and structural-damage factors. Comparing
the shared first 57 nights, the original V1 faced **722** animals, received
**1,107** agricultural raid losses and finished with **71 crops, 12 workers
and 611 coins**. Reduced-count V1 faced **547** animals, received **1,299**
agricultural losses and finished with no crops, one worker and 33 coins.
The original run registered 1,436 wall hits and 33,462 wall HP lost versus
459 hits and 11,098 HP in the reduced-count run. Original-V1 repairs cost
3,669 coins through night 57 versus 1,231. This reflects different wall
interception, damage and farm trajectories; the repair spend is not a
standalone measure of defensive efficiency.

The crops and cash first differ on day 7, after count selection differs on
night 6. Animal composition and RNG decisions then diverge, even on nights
with the same total count. The lower count factor therefore cannot be
interpreted as a fixed percentage reduction in crop losses. This one seed
strongly rejects the reduced-count candidate as a balance improvement, but
does not establish a survival probability for original V1. The complete
original-V1 replay follows below.

The production arm is a separate reference, not the control for the isolated
count coefficient. Its 36-night defeat should not be compared against the
60-night original-V1 totals as if the exposure duration were equal.

## Complete current-engine V1 replay: Sabana / 712

The original V1 recipe continued from the same deterministic Sabana/712
setup to an **actual victory after night 100**. The complete
[100-night report](current-main-pr108-v1-original-sabana712-100.json.gz)
records source `a2c91ea5`, the recipe and source hashes, all 100 nightly
state hashes, and 100 verified raid receipts with zero issues and no evidence
coverage loss. Its first 60 nightly hashes match the archived 60-night arm
exactly. The intervening commit changed only this QA documentation.

| Measure | Original V1 through night 100 |
| --- | ---: |
| Terminal result / dawn | Victory / day 101 |
| Living crops / coins / operational centers | 11 / 94 / 1 |
| Animals / raid crop losses, nights 6–100 | 1,276 / 1,702 |
| Wall hits / wall HP lost | 2,715 / 64,225 |
| Wall purchases / repairs, coins | 670 / 7,337 |
| Income / wages / seeds, coins | 105,295 / 43,630 / 54,264 |
| `Game.tick` / bot decisions, seconds | 736.87 / 355.75 |
| Full elapsed wall time, seconds | 1,221.58 |

The night-100 raid itself ended physically: ten animals exhausted their
allocated hits, struck walls 24 times, destroyed no crops, and exited. The
campaign then emitted `CampaignWon`. This is a narrow success: night 90 had
39 crops and 287 coins, night 96 had 18 crops and 90 coins, and the winning
dawn had only 11 crops and 94 coins. It proves that this one seed can reach
night 100 with legitimate raids and costs on the current engine. It does not
show a comfortable economic margin, a probability of survival across seeds
or biomes, or that V1 should replace production pressure. The production and
reduced-count arms above ended much earlier under the same engine and bot;
the historical original-V1 run before #108 lost after night 99 under a
different enclosure trajectory. Keep this balance recipe experimental while
testing held-out seeds and defense-policy sensitivity.

## Held-out current-engine V1 replay: Sabana / 123

The same V1 recipe, topological policy, WASM and game/raid/runner source
hashes were used with a reserved Sabana seed. The complete
[Sabana/123 report](current-main-pr108-v1-original-sabana123-100.json.gz)
records source `baf5af97`, all 100 nightly hashes and 100 verified raid
receipts with zero issues and no evidence coverage loss. The different
source commit from Sabana/712 contains only the preceding QA report and
documentation; the executable input hashes match.

| Measure | Sabana/712 | Sabana/123 |
| --- | ---: | ---: |
| Last verified night / result | 100 / victory | 100 / victory |
| Living crops / coins at day-101 dawn | 11 / 94 | 0 / 83 |
| Animals / raid crop losses | 1,276 / 1,702 | 1,242 / 1,668 |
| Wall purchases / repairs, coins | 670 / 7,337 | 590 / 7,045 |
| Income / wages / seeds, coins | 105,295 / 43,630 / 54,264 | 99,162 / 42,183 / 49,961 |
| `Game.tick` / bot decisions, seconds | 736.87 / 355.75 | 1,497.14 / 314.98 |

The Sabana/123 result is a valid game-rule victory, **not** evidence of a
sustainable farm at the winning dawn. It had four living crops after night
98, nine after night 99, then planted twelve on day 100. Workers delivered
nine harvests that day, but the night-100 raid destroyed all twelve exposed
crops; `CampaignWon` followed with zero living crops and 83 coins. The
current victory condition checks completion of night 100, so this report
must not be presented as a healthy agricultural margin. Neither of these
two seeds estimates a six-biome win rate or justifies promoting V1 to
production without further balancing and held-out validation.

The second replay also exposes a separate late-run performance problem.
`Game.tick` cost 72.32 seconds on day 83, 80.11 on day 87 and 119.23 on day
90, despite only 40, 59 and 32 living crops at those dawns. The measured
raid-target selector used about one second or less on each of those days;
the report does not identify which remaining tick phase caused the spikes.
The process advanced and finished normally. This is a profiling lead, not
evidence that the pressure recipe or any specific navigation routine is
the cause. Capture a late frozen state and profile `Game.tick` phases
before changing code for this latency.

The exact day-83 replay, frozen-state controls and live-profiler method are
recorded in [the late-tick investigation](late-tick-sabana123.md). The frozen
raid slice alone does not reproduce the continuous-campaign spike.
