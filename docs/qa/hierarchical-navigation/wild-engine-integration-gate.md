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
late-game workload. `spatial-campaign-terminal.test.js` now passes 3/3 on a
real C++ Sabana world: explicitly constructed night-100 states resolve a
physical raid before victory or economic defeat, emit one terminal event,
and survive terminal save/load. A separate mid-campaign fixture saves during
a 100-crop, 16-animal raid, rebuilds the C++ spatial session from the saved
game, and completes the raid with real impacts; every post-reload movement
step is checked against native static collision. These are controlled
lifecycle fixtures, not a played 100-night campaign. The archived
five-culture postgame timing tests use
ordinary game-state fixtures and do not by themselves certify sustained C++
spatial-world postgame play.

The full repository suite on `90c1c2a9` ran 4,318 tests in 464.3 seconds:
4,271 passed and 47 failed. There are no newly failing test names compared
with `8b6693b9`. Three old navigation-scope cases disappeared because their
retired implementation and tests were removed; one corrected historical
capacity-evidence check now passes. The full TAP log is
`full-suite-90c1c2a9.log.gz`. The three lifecycle tests were added after this
frozen suite, so they are not included in that count.

A reproducible synthetic workload runner,
`tools/experiments/profile-wild-engine-stage-stress.mjs`, creates crops with
`Game.plant`, spawns animals through `spawnRaid`, and advances only with
`Game.tick` on the C++ world. It records source and WASM hashes, seed, stage,
ticks, event totals, retreat reasons, elapsed time and memory. The first runs
use day 6 / 40 crops / 6 animals, day 50 / 150 crops / 14 animals and day 100
/ 300 crops / 16 simultaneous animals. They are explicitly **constructed
loads**, not actual day-50 or day-100 farm states or a balance verdict.

| Biome / seed | Early ticks / loop wall time | Middle ticks / loop wall time | Late ticks / loop wall time |
| --- | ---: | ---: | ---: |
| Sabana / 712 | 822 / 0.40 s | 1,218 / 1.28 s | 1,132 / 1.88 s |
| Gran Río / 712 | 822 / 0.39 s | 1,218 / 1.29 s | 1,423 / 1.99 s |
| Manglares / 712 | 862 / 0.49 s | 1,172 / 1.22 s | 1,317 / 2.20 s |
| Volcanes / 712 | 1,029 / 0.47 s | 1,279 / 1.31 s | 1,877 / 1.82 s |
| Desierto / 712 | 1,949 / 0.71 s | 2,065 / 2.77 s | 1,633 / 3.38 s |
| Gran Cañón / 123 | 561 / 0.33 s | 765 / 2.24 s | 1,008 / 5.42 s |
| Gran Cañón / 712 | 524 / 0.36 s | 698 / 1.94 s | 702 / 2.32 s |

All 21 raids moved every spawned animal, made real crop or structure hits,
and reached exactly one `RaidEnded` within the 2,400-tick guard. This is
about 0.3–5.4 ms of elapsed tick-loop time per simulated tick, including QA
event collection; it is not isolated `Game.tick` CPU, a visual frame-rate
measurement or a sustained-campaign benchmark.
Gran Cañón seed 123 recorded eight and five
`waiting-expired-or-stage-blocked` retreats in middle and late loads, leaving
23 and 15 unused strikes. All 13 affected animals' original staging points
remained walkable, so this was bounded wait expiry rather than an invalid
staging cell. Seed 712 also showed the pattern: one, ten and six such retreats
across early/middle/late phases, leaving 2, 27 and 19 strikes. Other
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

Before merging, expand the integrated spatial-world phase-stress matrix with
late-stage wall/perimeter topology, more seeds across the other biomes,
save/load in a late dense raid and explicit physical collision audits. Investigate the
Gran Cañón retreat reasons, inspect relevant failures from the full suite and
complete the platform checks. Publish input states and results. A 100-night
winning bot campaign may inform later balance work but is **not** an engine
gate.

Once this engine gate is satisfied, calibrate economics, attacks and frozen
virtual-player policies on a separate branch or phase. Keep any resulting
balance changes out of the engine acceptance measurements.
