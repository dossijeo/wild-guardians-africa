# Wild Engine integration gate

## Integration decision (14 October 2026)

The user authorized integrating Wild Engine before every edge case and long
campaign has been exercised. The matrix below remains a regression and
follow-up checklist, not a claim that every row is complete. The available
native lifecycle, save/reload, topology, worker-entry, six-biome opening and
constructed-estate evidence supports this earlier integration. A genuine
economic or military defeat is not an engine failure. The remaining 46
repository-wide failures and untested long-campaign conditions are recorded
below and must not be presented as passing QA.

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
and survive terminal save/load. The victory fixture now also enters postgame
on the native spatial world, advances a complete peaceful day to day 102,
checks that no raid respawns, and round-trips the resulting save. A separate
mid-campaign fixture saves during
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

The full suite at `168cc63f` found one **new, relevant** failure: the exact
night-54 paid-defense reload case left a buffalo retreating inside its
pre-existing tree overlap. The fractional-landing guard had rejected every
intermediate position until the animal was completely clear of the tree. The
negative 4,325-test run (4,277 pass / 48 fail) is preserved as
`full-suite-168cc63f.log.gz`. Commit `eb0004b0` permits only the existing
physically swept, monotonically outward prop-escape step; it still rejects
new obstacles, walls and bad terrain. The frozen buffalo case and 12 other
focused route, Canyon and lifecycle tests pass. The full suite on `eb0004b0`
ran 4,325 tests in 472.6 s: **4,278 passed and 47 failed**, with exactly the
same failing test names as `90c1c2a9`. Its complete output is
`full-suite-eb0004b0.log.gz`. This comparison does not make the 47 historical
failures acceptable for unrelated integration; it shows no new failure in
the engine branch's latest tested state.

After the native village-entry and founding-order fix at `aae8ebd4`, the
repository suite ran 4,326 tests in 467.1 s: **4,279 passed and the same 47
failed**. The failure-name comparison with `eb0004b0` is empty; the new paid
C++ postgame village test is included in this run. The complete log is
`full-suite-aae8ebd4.log.gz`. The web production build and the focused
31-test village, footprint, retreat and lifecycle group also passed.

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
Gran Cañón seed 123 recorded eight and six
`waiting-expired-or-stage-blocked` retreats in middle and late loads, leaving
23 and 13 unused strikes. The refreshed middle and late seed-123 captures
(`engine-canyon-wait-final-123-{middle,late}.json.gz`) show the first retiring
animal at a walkable stage point. All 136 and 256 surviving crops respectively
return `unknown`, with native connectivity reason 8 (open sector frontier),
not a certified `blocked` result. The source and sampled crop both have valid
local grid components; the uncertainty lies between those components. An
offline diagnostic expanded the middle capture to 121 resident chunks and
still found 136 `unknown`, zero `possible` and zero `blocked`. Thus merely
enlarging residency does not resolve this particular Canyon separation, and
the bounded waiting rule prevents the incursion from hanging. These are
observed limits of the constructed Canyon layout, not proof that every crop
is physically unreachable. The full refreshed seed-123 stage report is
`engine-canyon-recheck-123.json`.
Seed 712 also showed the pattern: one, eight and five such retreats
across early/middle/late phases, leaving 2, 28 and 18 strikes. Other
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

Native-world postgame founding is now demonstrated in Desierto/712. An exploratory
Sabana/712 search streamed a 7×7 chunk area around the initial center and
tested 120 nearby positions (radii 45, 60, 75, 90 and 105 m; 24 directions)
for a seven-building Suajili village through the real `previewVillage` API.
None was accepted: 105 collided with large trees or rocks, nine with fluid,
three with invalid terrain and three with existing buildings. This is not an
exhaustive survey and cannot prove that expansion is impossible. A separate
60-position Mapungubwe search in Sabana also found no legal site.

In the 102-position Desierto/Suajili search, 18 positions reached the entry
check and threw a `TypeError`: legacy `findVillageEntry` tried to assign the
WASM adapter's getter-only `obstacles`. The native entry check now temporarily
installs the **proposed building polygons in the C++ world**, finds a worker
entry, and removes those polygons afterward. The first valid candidate is
`(94.64685702961343, 43.466662183008076)`. Founding also exposed a command
ordering error: the new settlement regenerated its chunks before the paid
prop suppressions were registered, so a previously visible prop could no
longer be removed. The session now registers those suppressions before
installing the settlement. `spatial-postgame-village.test.js` confirms an
actual second village for 50,000 coins, one founding event, no preview
barrier residue, permanent building collisions, save/reload, two native
settlements, a worker route back to the paid work center and 30 seconds of
peaceful native postgame after restoration. The relevant
village, footprint, retreat and lifecycle group passes 31/31. Native village
feasibility across the other biomes remains to be sampled; no collision or
economic rule was weakened to obtain this candidate.

Once this engine gate is satisfied, calibrate economics, attacks and frozen
virtual-player policies on a separate branch or phase. Keep any resulting
balance changes out of the engine acceptance measurements.

### Constructed daytime worker load

`tools/experiments/profile-wild-engine-worker-phases.mjs` complements the
night-raid matrix. For each biome it creates separate day-6/50/100 native
worlds, plants 40/150/300 mijo through `Game.plant`, hires three paid
workers through `Game.hire`, and advances 120 simulated daytime seconds with
480 ordinary `Game.tick` calls. The six reports are
`engine-worker-phases-*.json`. They include the exact C++/WASM and runner
hashes, tick distribution, worker motion, riego events, tasks, resident
chunks, memory and native sector metrics. The source commit in each report
is the parent checkout used while the runner itself was still uncommitted;
the runner hash identifies the executed source.

| Biome / seed | Total tick CPU ms, early / middle / late | 95th-percentile tick ms, early / middle / late | First tick ms, early / middle / late |
| --- | ---: | ---: | ---: |
| Sabana / 712 | 249 / 218 / 208 | .57 / .55 / .50 | 85 / 63 / 61 |
| Gran Río / 712 | 239 / 210 / 227 | .52 / .60 / .55 | 85 / 59 / 67 |
| Manglares / 712 | 275 / 267 / 244 | .53 / .70 / .50 | 109 / 78 / 72 |
| Volcanes / 712 | 255 / 249 / 221 | .59 / .69 / .58 | 90 / 62 / 66 |
| Desierto / 712 | 218 / 248 / 211 | .51 / .80 / .65 | 81 / 62 / 56 |
| Gran Cañón / 123 | 231 / 259 / 229 | .46 / .70 / .41 | 97 / 82 / 85 |

All 18 fixtures completed 480 ticks without a result or pause. All three
workers moved in every fixture; `WaterSatisfied` fired 22 times per fixture
except in Gran Cañón, where it fired 17 times. No mobile-collision recovery
was needed. Timings are isolated Node simulation measurements, not rendered
frame times. The expensive first tick builds cold native navigation data;
the real game's worker/raid preparation may warm part of that work, so this
fixture alone neither proves nor disproves a visible hitch. The three phases
share the same initial nearby jobs and only one work center, so they test
larger crop/task state under active work rather than many distinct worker
routes or the staffing pattern of a mature multi-center estate. Those
larger-layout and sustained-campaign cases remain open.

### Multi-center worker entry and navigation

The one-center fixture missed a real native preview defect. In Sabana/712,
`previewCenter` accepted a paid work center at `(59, 0)` while the village's
worker entry was `(60, 0)`. It checked a route against the old C++ graph,
without first installing the proposed center polygon. After three centers
were built, all three entry-to-center route queries failed; nine hired
workers remained `arriving` at the entry through 120 simulated seconds and
no watering occurred. The first exploratory run took about 4.95 s of
`Game.tick` CPU for 480 ticks because workers repeatedly failed to enter.
This was a negative QA result, not a valid late-estate performance sample.
The new regression `spatial-center-entry-preview.test.js` failed before the
fix because the obstructing preview was accepted.

The native center preview now temporarily applies both the proposed polygon
and any prop suppression to the C++ spatial world, verifies that the village
entry itself remains standable, and tests both directions of travel before
removing the preview. It uses the same center footprint as permanent native
collision. No center cost, worker speed or navigation rule changed. The red
entry regression passes after the fix; the combined center, fluid placement,
postgame village and route test group passes **65/65**.

`tools/experiments/profile-wild-engine-multicenter.mjs` constructs a
day-100-equivalent estate through three paid centers, 300 real planting
commands and nine paid hires. It then advances 480 native daytime ticks.
The complete reports are `engine-multicenter-*.json`; their source hash
identifies the C++/WASM binary and runner used before this fix was committed.

| Biome / seed | Center routes | Workers moved | Watering events | Total tick CPU / first tick / p95 tick |
| --- | ---: | ---: | ---: | ---: |
| Sabana / 712 | 3/3 | 9/9 | 75 | 580 / 127 / 2.94 ms |
| Gran Río / 712 | 3/3 | 9/9 | 75 | 627 / 138 / 3.37 ms |
| Manglares / 712 | 3/3 | 9/9 | 65 | 707 / 230 / 3.22 ms |
| Volcanes / 712 | 3/3 | 9/9 | 75 | 625 / 133 / 3.43 ms |
| Desierto / 712 | 3/3 | 9/9 | 75 | 593 / 128 / 2.59 ms |

These are sequential Node `Game.tick` measurements after the concurrent
full-suite run finished, not rendered frame times or a proof of 100-night
economic survival. All five fixtures completed without pauses, results or
mobile-collision recovery. The cold first tick remains noticeably more
expensive than steady work; measure the actual browser-visible transition
before treating it as a gameplay hitch. Each fixture then saves, creates a
fresh C++ spatial session, restores its resident chunks and advances another
30 daytime seconds. All 15 center routes remain available, all 45 workers
move, and 16–17 new `WaterSatisfied` events occur per biome after reload.
Serialized states round-trip exactly before this continuation. The save is
156–164 KiB for these constructed 300-crop estates; it does not include a
separate rendered-world cache.

Gran Cañón/123 did not produce a comparable multi-center estate within its
current resident bounds: 144 candidate sites yielded only the existing
work center, and two otherwise plausible route checks were `unknown` rather
than certified blocked. The negative result is retained as
`engine-multicenter-canyon-123-negative.json`. It does not prove that a
second center is impossible farther along the canyon; extending residency
and validating a physically reachable site remains separate work.

The complete repository suite after the center-preview fix and prior audio
fixture correction ran **4,327 tests in 479.6 s: 4,281 passed, 46 failed**.
Compared with `full-suite-aae8ebd4.log.gz`, the failure-name set has no new
members; the resolved test is the three-wall material-contact audio fixture.
The full TAP output is `full-suite-center-preview.log.gz`. The seven-file
center, fluid-placement, native postgame and route group passes 65/65; the
web production build passes. The 46 remaining historical suite failures are
not silently treated as a green repository-wide suite.
