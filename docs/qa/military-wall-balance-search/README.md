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
