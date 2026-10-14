# Wild Engine integration gate

This gate concerns the spatial world and hierarchical navigation in the
experimental branch. It does **not** require a virtual player to win 100
nights. Economic viability, raid difficulty and virtual-player strategy are
separate balance work after the engine is integrated. A genuine defeat caused
by the current game rules is a valid engine outcome when it completes cleanly.

## Required evidence before merging

| Situation | Engine property to verify |
| --- | --- |
| Early, middle and late campaign-equivalent stress | Representative crop and structure density, animal count and species, resident chunks and topology; bounded tick, navigation and memory costs without worsening trends or a stalled raid. State how each fixture was obtained; a constructed late-game fixture is not a completed campaign. |
| Native defeat | The real loss event resolves once, the raid and units stop cleanly, and no pending navigation or worker task traps the session. An economic defeat must not be confused with a timeout or engine error. |
| Night-100 victory and postgame | The final physical raid resolves before victory, the victory event occurs once, and peaceful postgame can advance and expand without stale raid/navigation state. This is a transition test, not a requirement that a bot earn victory. |
| Save and load | Persist during ordinary work and an active raid; reconstruct the spatial index and gates, retain live objectives and reservations, and continue physical motion. A valid route may differ after reloading. |
| Structure destruction and repair | Actual attacks can damage and collapse walls or centers; the collision and region graph update when topology changes. HP-only changes must not rebuild topology. Workers retain a valid door or breach route. |
| Construction, gates, breaches and natural barriers | Both movement profiles respect their own transitability. An unknown resident frontier remains unknown, not blocked. Closed enclosures divert attackers to reachable walls; opened breaches permit entry. No unit crosses a static barrier. |

For each stress run, retain the input seed/snapshot, source hash, biome,
movement profiles, loaded-sector footprint, tick count, route and fallback
counts, wall/crop hits, elapsed time, peak memory, result and reason for
stopping. Compare sustained per-stage costs, not just one fast checkpoint.
Run the relevant automated suite and web/Windows builds. Treat a failing
relevant test, unresolved hang, invalid physical movement, lost persistence
or material sustained performance regression as a blocker. Do not weaken
the physical rules or alter combat/economy to obtain a passing run.

## Evidence already available and remaining work

Existing native tests cover first-day raids, a closed wall ring with an
automatic gate, real wall hits, breaches, profile-specific passage,
save/reload, retreat and six-biome opening. Frozen Gran Cañón day-6 and
Sabana day-12 benchmarks cover costly raid/navigation states. Sabana native
campaigns have advanced 16 and 20 completed nights and ended in audited
defeats; these demonstrate natural loss resolution but do not cover the
late-game workload. `spatial-campaign-terminal.test.js` now passes 4/4 on a
real C++ Sabana world: explicitly constructed night-100 states resolve a
physical raid before victory or economic defeat, emit one terminal event,
and survive terminal save/load. A separate mid-campaign fixture saves during
a 100-crop, 16-animal raid, rebuilds the C++ spatial session from the saved
game, and completes the raid with real impacts; every post-reload movement
step is checked against native static collision. A second variant saves only
after an actual wall collapse inside a paid 49-module enclosure, restores
the same C++ world, verifies that the worker gate still has a route, then
finishes the 16-animal raid without a static-barrier crossing. These are controlled
lifecycle fixtures, not a played 100-night campaign. The archived
five-culture postgame timing tests use
ordinary game-state fixtures and do not by themselves certify sustained C++
spatial-world postgame play.

The full repository suite on `90c1c2a9` ran 4,318 tests in 464.3 seconds:
4,271 passed and 47 failed. There are no newly failing test names compared
with `8b6693b9`. Three old navigation-scope cases disappeared because their
retired implementation and tests were removed; one corrected historical
capacity-evidence check now passes. The full TAP log is
`full-suite-90c1c2a9.log.gz`. The four lifecycle tests were added after this
frozen suite, so they are not included in that count.

A reproducible synthetic workload runner,
`tools/experiments/profile-wild-engine-stage-stress.mjs`, creates crops with
`Game.plant`, spawns animals through `spawnRaid`, and advances only with
`Game.tick` on the C++ world. It records source and WASM hashes, seed, stage,
ticks, event totals, retreat reasons, elapsed time and memory. The first runs
use day 6 / 40 crops / 6 animals, day 50 / 150 crops / 14 animals and day 100
/ 300 crops / 16 simultaneous animals. They are explicitly **constructed
loads**, not actual day-50 or day-100 farm states or a balance verdict.
The initial runner omitted the campaign's `serviceRaidConnectivityDemand`
step. Those seven results are archived as
`engine-stage-stress-unserviced-*.json.gz` and are not valid evidence that
the integrated raid completes under normal chunk servicing. The runner and
the dense-raid reload test now service those requests on each tick.

| Biome / seed | Early ticks / loop wall time | Middle ticks / loop wall time | Late ticks / loop wall time |
| --- | ---: | ---: | ---: |
| Sabana / 712 | 822 / 1.12 s | 1,218 / 2.45 s | 1,132 / 3.29 s |
| Gran Río / 712 | 822 / 1.15 s | 1,218 / 2.50 s | 1,423 / 3.37 s |
| Manglares / 712 | 862 / 1.65 s | 1,172 / 3.18 s | 1,317 / 4.48 s |
| Volcanes / 712 | 1,029 / 1.20 s | 1,279 / 2.40 s | 1,495 / 3.18 s |
| Desierto / 712 | 1,949 / 1.37 s | 2,065 / 3.85 s | 1,633 / 4.73 s |
| Gran Cañón / 123 | 561 / 1.09 s | 765 / 3.34 s | 839 / 3.83 s |
| Gran Cañón / 712 | 524 / 1.15 s | 770 / 2.98 s | 624 / 3.97 s |

The first serviced late Manglares raid remained active with ten animals
after 4,000 ticks, despite real crop and structure hits. Its 2,400- and
4,000-tick negative reports and a 2,400-tick state capture are retained.
The cause was an inconsistent Manglares water query: `wetlandMask` used the
settlement shortlist for the *selected rendering chunk*, even while movement
queried a different resident chunk. At one captured waypoint the graph
reported dry, passable ground, while continuous movement reported water;
selecting that waypoint's chunk changed the answer. The new selection-
invariance regression failed before the fix and passes afterward. With the
same workload and serviced chunks, the late raid now finishes at tick 1,317
with one `RaidEnded`. All 21 serviced stage raids therefore complete on the
same corrected WASM binary (`d9d16b813010` SHA-256 prefix). Each refreshed
report also records C++/WASM, raid, Canyon formation, landing guard and runner
hashes; its `source.commit`
field names the parent checkout at execution, before this fix was committed.
Loop wall time
includes QA event collection and chunk servicing; it is not isolated
`Game.tick` CPU, a visual frame-rate measurement or a sustained-campaign
benchmark.
Gran Cañón seed 123 recorded eight and five
`waiting-expired-or-stage-blocked` retreats in middle and late loads, leaving
23 and 15 unused strikes. All 13 affected animals' original staging points
remained walkable, so this was bounded wait expiry rather than an invalid
staging cell. Seed 712 also showed the pattern: one, eight and six such retreats
across early/middle/late phases, leaving 2, 28 and 19 strikes. Other
attackers exhausted their budgets. These repeated retreats may reflect
genuinely unreachable or saturated targets in this synthetic placement or a
navigation/selection flaw; inspect their positions and accessible alternatives
before counting these late-stage cases as clean combat behavior.

An initial Desierto run with a 2,000-tick guard stopped while one attacker
with zero strikes left was still physically retreating, 59 m from its exit.
The same deterministic workload finished on tick 2,065 under a 2,400-tick
guard, with no disappearance shortcut. The negative run is retained as
`engine-stage-stress-desierto-712-2000.log.gz`; it exposed an overstrict QA
bound, not a demonstrated engine hang. Individual positive JSON reports are
`engine-stage-stress-{sabana,gran-rio,manglares,volcanes,desierto}-712.json`
and `engine-stage-stress-canyon-{123,712}.json`. Each includes attack and retreat
counts. Timings are single-run QA observations, not portable thresholds.

A separate, opt-in wall-ring fixture plants crops inside a paid `zarzas`
perimeter with automatic gates, so the animals must strike the physical
defense. Each biome was exercised at early/middle/late phase strength
(6/14/16 animals). The fixed Sabana, Gran Río, Manglares, Volcanes and
Desierto fixtures held 40/100/100 crops. The narrow Gran Cañón fixture held
40 crops in each phase; this is a **test enclosure size**, not a gameplay cap.
Every raid ended once and damaged or ruined actual wall modules. The native
static-collision audit checked every animal displacement, including turns
through a waypoint, and found no crossings in the final runs.

| Biome / seed | Early ticks / ruined walls | Middle ticks / ruined walls | Late ticks / ruined walls |
| --- | ---: | ---: | ---: |
| Sabana / 712 | 218 / 2 | 753 / 8 | 829 / 13 |
| Gran Río / 712 | 218 / 2 | 814 / 9 | 872 / 13 |
| Manglares / 712 | 196 / 2 | 546 / 11 | 836 / 13 |
| Volcanes / 712 | 116 / 3 | 712 / 8 | 809 / 13 |
| Desierto / 712 | 191 / 2 | 650 / 10 | 677 / 11 |
| Gran Cañón / 123 | 501 / 4 | 605 / 4 | 905 / 7 |
| Gran Cañón / 712 | 264 / 4 | 615 / 5 | 1,181 / 6 |

The JSON reports are `engine-stage-stress-*-wall-ring.json`. Gran Cañón
712 initially could not stage the full late mixed-species wave beside the
river: the fixed row stride based on the largest animal wasted valid dry-bank
positions. A denser **candidate** stride, still enforcing each species'
physical body clearance, admits all 16 animals; a regression also checks a
16-warthog formation. Gran Cañón 123 then exposed a fractional rhino landing
inside a static pocket between a route's sampled waypoint checks. The
movement guard now validates each actual landing against the native spatial
world. A separate auditor warning in the middle raid was a harmless corner
chord: one tick traversed a valid waypoint bend, so the audit now validates
the two travelled segments. Its pre-fix capture is retained as
`engine-canyon-wall-before-middle-282.json.gz`.

After the stricter fractional-landing check, the existing good virtual-player
policy completed a continuous 14-night Sabana/712 campaign in 265.3 s wall
time, including 149.0 s accumulated `Game.tick`. The archived earlier
14-night run accumulated 148.5 s `Game.tick` and took 313.0 s wall time.
These are single runs with different physical trajectories and worker/crop
counts, so the close tick totals show no obvious sustained regression, not
an exact AB timing proof. The new daily tick totals range from 0.5 to 16.2 s;
the late days fluctuate rather than rising monotonically. The full daily
ledger and tick bands are in `wild-engine-14-night-sabana-after-landing.json`.

Before merging, verify sustained campaign-scale performance and any relevant
wall/river corner cases beyond this constructed matrix. Investigate the
Gran Cañón retreat reasons, inspect relevant failures from the full suite and
complete the platform checks. Publish input states and results. A 100-night
winning bot campaign may inform later balance work but is **not** an engine
gate.

Once this engine gate is satisfied, calibrate economics, attacks and frozen
virtual-player policies on a separate branch or phase. Keep any resulting
balance changes out of the engine acceptance measurements.
