# Desert/123 defended raid-pressure audit

This audit holds the V1 military pressure, economy, damage, and topological
virtual-player policy fixed. It investigates whether the apparently easy
defended Desert/123 campaign is evidence of balance or of failed targeting.
The 40-night run completed in 240.9 seconds without a technical error. Its
runner SHA-256 is `745a77d05768a992ffe5c30853227a4415dbace813f393edf0ae4d02000b7b91`
and its WASM SHA-256 is
`09616da85bf59c50c0cde7b743a4bdccb2eac06ec4eb0b79f79c44ef71d9caa9`.

| Measure | Nights 1–40 | Nights 10–40 |
| --- | ---: | ---: |
| Animals spawned | 495 | 472 |
| Initial hit budget | 1,973 | 1,911 |
| Hit budget left on retirement | 1,834 | 1,834 |
| Logical contacts | 134 | 72 |
| `AnimalTargetUnavailable` events | 6,680 | 6,596 |

Of 495 animals, 454 retired with unused hits. The first nine nights contain
normal attacks against the farm and its walls. From night 10, most animals
wait and retire without attacking; nights 10, 11, 13–16, 18–24, 34–36, 38,
and 40 have zero contacts. The night-40 wave spawns 22 animals, has 106
available hits, and makes zero contacts. At the end of day 40 the farm has 76
living crops and 24,894 coins. These results **do not establish** that V1
military pressure is too weak: most of the generated attack budget never
interacts with the defense.

The frozen night-10 state isolates one reproducible selection failure:

- Seven animals at `(211.65, -22…2)` are waiting with all their hits.
- One crop group exists and 105 walls are intact. The first waiting animal's
  native crop plan is `unknown` with diagnostic cause `crop-sites`; it attempts
  no route. The native wall plan is also `unknown`, examining zero wall
  candidates and attempting zero routes. Removing dynamic blockers and leases
  in the probe leaves the wall result unchanged.
- The animal's sampled native weak region is `8`. The 22 native wall-portal
  arcs observed by the same profile join regions `1`, `5`, `16`, `17`, and
  `18`; none joins region `8`. Native connectivity from this spawn to their
  physical attack-side anchors is `blocked` or `unknown`, never `found`.
- The entry selector accepted this distant spawn using an exterior witness.
  That witness proves that the animal is outside the defense and has a route
  toward the resident-world edge; it does not prove that it can reach the
  farm's exterior attack sides. The wall planner then has no certified first
  wall crossing from the animal's region to the crop group. It correctly
  avoids inventing a route, but the resulting raid spends its time waiting.

This is an entry/targeting mismatch, not yet a proof that the entire world
component is permanently disconnected: some portal queries return `unknown`.
In particular, `unknown` must not be silently changed to `blocked` or used
to justify an attack through terrain. The next correction should make raid
entry require a positively reachable attack opportunity (a crop when open or
a valid wall attack side when enclosed), or request the specific missing
sectors and retain the raid until that question resolves. It should check
each mobility profile without running per-crop searches and preserve the
existing physical collision, attack, and pressure rules. A regression should
assert that this frozen wave either gains a valid attack route or remains
explicitly pending on a documented missing sector, rather than retiring all
its animals with full budgets.

Reproduce the campaign with:

```powershell
node tools/experiments/audit-defended-raid-pressure.mjs desierto 40 123 test-results/desierto123-raids40.json.gz
```

The compressed [campaign evidence](desierto123-raids40.json.gz) includes every
raid, retirement reason, daily time/cash/crop count, defense decision, and
final state hash. The [night-10 save](desierto123-d10-waiting-state.json.gz)
can be examined without advancing the simulation:

```powershell
node tools/experiments/probe-native-wall-occupied.mjs docs/qa/desert-raid-pressure-audit/desierto123-d10-waiting-state.json.gz animal-3341 211.65 -22
```

This audit does not change balance or gameplay and is not a corrected campaign
result. The earlier 100-night defended victory must be interpreted alongside
this targeting failure before adjusting military pressure or wall prices.

## Experimental wall-side entry prototype

The draft branch now probes routes from a complete candidate wave to native
wall-face attack sides once during raid preparation. If the existing exterior
entry has no such route, a bounded formation is tried beside those faces. No
economic, damage, pressure, or enemy-count rule changes. A frozen night-10
regression checks the complete seven-animal entry, exterior legality, and
selection of a real wall target.

On the identical campaign, nights 1–9 retained their previous raid contacts
and births. Night 10 changed from zero contacts, zero wall hits and seven
animals retiring with 19 total hits unused to **19 contacts, 11 wall hits and
all seven hit budgets exhausted**. The [40-night prototype
evidence](desierto123-routeproof-40.json.gz) completed without a technical
error, but it is **not ready for integration**:

| Measure | Previous | Wall-side prototype |
| --- | ---: | ---: |
| Animals spawned through night 40 | 495 | 370 |
| Logical contacts | 134 | 164 |
| Wall hits | 48 | 97 |
| Unused hit budget | 1,834 / 1,973 | 1,060 / 1,224 |
| Living crops after day 40 | 76 | 13 |
| Money after day 40 | 24,894 | 9,822 |
| Wall-clock campaign time | 240.9 s | 108.2 s |

The different farm sizes and military attraction make the elapsed times and
whole-campaign totals **different workloads**, not a pure speed comparison.
In the frozen 10-night reproduction, the extra entry check used 21 native
route-status queries through night 10 (about 35 ms of measured query time);
only four of those were needed through night 9. This is preparation-time work,
not a per-tick route poll.

Short cross-biome checks also completed without technical errors:

| Frozen run | Nights | Logical contacts | Unused hits | Entry-route queries | Entry-route time |
| --- | ---: | ---: | ---: | ---: | ---: |
| [Sabana/712](sabana712-routeproof-14.json.gz) | 14 | 248 | 0 | 64 | 113 ms |
| [Manglares/712](manglares712-routeproof-14.json.gz) | 14 | 200 | 0 | 85 | 129 ms |

These are smoke regressions for raid activity, not matched ABBA performance
comparisons. The Canyon uses its separate river-bank entry selector and is
unaffected by this non-Canyon prototype.
The new entry revives attacks on nights 10–13, but waves again make zero
contacts from night 17 onward. In the frozen [night-17
state](desierto123-d17-waiting-state.json.gz), there are 127 intact walls and
13 living crops. The animal at `(39, -67.65)` has a physically reachable wall
portal but both native crop and wall planners return `unknown`, examining zero
wall candidates. A probe from `(95, 20)` can instead select intact wall
`structure-5123`. That wall does not appear in the eight native wall-portal
arcs: it matters to the target selector but does not separate two weak graph
regions. Thus *any reachable wall portal* is too weak an entry criterion.

The next step is a read-only native query for a **relevant attack opportunity**
against the current crop groups, including useful partial-wall faces that do
not split weak regions. It must return `unknown` when the required sectors or
attack sites are unresolved. Raid entry can then choose a position with a
positive physical route to that opportunity. Until that contract and a
sustained multi-biome comparison pass, the prototype remains in the draft PR;
its 40-night outcome must not be used as a final balance recommendation.

## Partial walls without a region portal (follow-up)

The frozen night-17 probe distinguishes two facts that the old portal index
conflated. Wall `structure-5123` does not split weak regions, so it is absent
from `nav_intent_wall_portals`. The new read-only
`nav_intent_relevant_wall_sides` query nevertheless identifies its crop-facing
physical side and the associated agricultural group. From `(95, 20)`, a
warthog has a native `found` route to that side. From its actual birth at
`(39, -67.65)`, the query nominates ten sides of four other crop-facing walls,
but every native route to those sides is `blocked`. The query never treats that
birth as a viable wall attack or changes the confirmed topology or intent
sequence. This demonstrates why a partial wall must be considered separately
from a region portal, while a geometrically relevant wall is still not proof
of an exterior, reachable birth.

An isolated trial that immediately fed those partial-wall candidates into the
native wall attack planner found `structure-5123` in one route query from the
valid `(95, 20)` position. It also made ten failed route queries from the
distant birth. The first 20-night Desert/123 campaign then diverged from the
control on night 10 and stalled at the start of day 14 with no active raid.
That integration was **removed**; its [error report](desierto123-nativepartial-20.json.gz)
and [partial state](desierto123-nativepartial-20-state.json.gz) are preserved
for diagnosis. A changed
economic trajectory is not itself a regression, but an unfinished night is.

With only the read-only native query added, the same 20-night
[experiment](desierto123-readonly-20.json.gz) completed and reproduced the
[previous binary's](desierto123-previous-20.json.gz) final serialized-state SHA-256
`0912f9d9e6958fe89271a3d04a4e70197c5019a5dbebeeb51ee3563c10eced97`.
Every daily living-crop and money count matched. The prior and read-only runs
took 63.57 and 62.85 seconds respectively; this pair is a compatibility check,
not evidence of a speed gain. The new API is currently used only by frozen QA,
not by ordinary raids. The existing route-proven entry prototype still needs
an exterior birth that can reach a **relevant** wall for the entire wave.

## Winding exterior component, rejected entry trial

The night-17 save revealed why four projected boundary points are insufficient.
From `(95, 20)`, the warthog can reach 14 resident-boundary points in weak
region 6; its historical birth at `(39, -67.65)` reaches 15 points in weak
region 0. The first position has a native route to the crop-facing side of
wall `structure-5123`; the historical birth has no proven route to the ten
relevant wall sides returned for it. Neither the wall AABB nor the existence
of *some* boundary route identifies the right exterior component.

An isolated, read-only `spatial_exterior_reachable` query now tests resident
boundary candidates in the selected animal profile, prunes by the native weak
region, and requires a complete native route before returning a positive
certificate and boundary point. It returns `unknown` separately from a known
negative. The frozen night-17 test proves the `(95, 20)` certificate, its
route to the returned edge, and that a query leaves the serialized game state,
topology revision, and intent sequence unchanged. The ordinary raid policy
does not yet consume this certificate.

A trial that used the certificate for raid entry finished 20 nights but did
not solve the pressure defect. Compared with the read-only control, the
trial spent 124.31 instead of 62.85 seconds in total, 77.37 instead of 48.60
seconds in `Game.tick`, and 38.79 instead of 6.46 seconds in virtual-player
decisions. The two campaigns diverged on day 9, so those timings combine
algorithmic and workload differences; they do **not** isolate the cost of the
native query. Nights 10–20 had 32 wall hits and seven zero-contact raids in
the trial, versus 58 wall hits and five zero-contact raids in the control.
The trial ended day 20 with 21 living crops and 2,244 coins, versus 15 and
1,428 in the control. Better farm survival caused by fewer attacks is not a
valid balance improvement. The entry integration was removed, and its
[full evidence](desierto123-exterior-trial-20.json.gz) is retained.

With the query left disconnected from ordinary raids, the repeated
[20-night campaign](desierto123-exterior-readonly-20.json.gz) completed in
64.53 seconds. Every daily crop and money count and the final serialized
state SHA-256 `0912f9d9e6958fe89271a3d04a4e70197c5019a5dbebeeb51ee3563c10eced97`
matched the prior control. The 1.67-second wall-time difference between two
runs is not evidence of a speed change. Before adopting an exterior entry,
it must place the entire wave where individual animals can reach meaningful
targets and make contact during the actual raid, then pass sustained workload
and runtime comparisons.

## Pending-entry regression after resident bounds expand

The saved day-14 partial-wall trial had an unfinished night at time 600.
Replaying its pending five-animal wave with nine nearby resident chunks found
five entries in about 30 ms. Loading the full 25-chunk active area made the
ordinary exterior test reject every entry after about one second: its four
projected resident-boundary targets missed the winding route. All five
nearby entries actually have a positive Wild Engine route to the wider
resident boundary for their animal profile. The detailed
[frozen probe](desierto123-d14-inset-probe.json) records the positions and
certificates.

The entry selector now makes one bounded inset retry **only after all normal
candidates fail**. Each proposed birth and exit must pass the existing group
checks and the new native full-route exterior certificate against the original
resident bounds. This does not label `unknown` as blocked or invent a route.
In the frozen state, the ordinary `spawnRaid` creates all five animals;
three immediately select reachable wall targets, while two initially report
unknown. A 180-second replay of the actual `Game.tick` loop finishes the raid
after 45.6 simulated seconds, with 26 `AnimalLogicalHit` events and five
`StructureRuined` events. It also records 16 unavailable-target and 16
unavailable-route events, so the selector still has unresolved work; the
result does not prove that every animal spent its attack budget.

With this fallback available, the normal 20-night Desert/123 campaign
[completed](desierto123-inset-fallback-20.json.gz) in 63.92 seconds and
reproduced the exact prior final serialized hash and all daily crop/money
counts. The fallback did not activate in that normal campaign. The directed
raid suite passes 52 tests. The remaining validation is a sustained campaign
with the partial-wall attack policy active; it cannot be inferred from the
unchanged control or the single resumed raid.

## Experimental partial-wall selection in the native attack planner

The native wall planner previously proposed only walls that separated weak
navigation regions. This omitted a physically attackable, crop-facing partial
wall. When the certified-perimeter pass nominates no candidate, the planner
now consults the native crop-facing wall sides and still requires a complete
route and an attack-site lease before choosing one. In the frozen night-17
state, `(95, 20)` now selects `structure-5123`; before this change the same
native request returned `unknown` with zero candidates.

The [20-night Desert/123 trial](desierto123-partial-native-20.json.gz)
completed without a technical stall. Compared with the immediately preceding
[control](desierto123-inset-fallback-20.json.gz), nights 10–20 had 70 versus
58 wall hits and 88 versus 87 total logical contacts. Both had five
zero-contact raids. The trial ended with 15 living crops and 1,875 coins,
versus 15 crops and 1,428 coins in the control. Wall-clock time was 57.72
versus 63.92 seconds, but the states diverged on day 10, so this is **not**
an isolated algorithm-speed measurement or a balance recommendation.

The late-game defect remains: nights 16–20 in the trial made no contact.
The native crop planner's cumulative `unknown/crop-sites` count reached
1,026 and the wall planner performed 6,634 route queries by day 20; its
`found` count stopped at 90 after day 15 while `unknown` grew to 903.
This partial-wall fallback should not be enabled as the default policy until
the repeated inconclusive group/region work is eliminated and the late
incursions are investigated. The PR remains experimental.

The same build completed [Sabana/712](sabana712-partial-native-14.json.gz)
and [Manglares/712](manglares712-partial-native-14.json.gz) for 14 nights.
Both reproduced the exact serialized final-state SHA-256 from the earlier
route-proof runs, with no zero-contact raids: 230 contacts in Sabana and 182
in Manglares from night 6 onward. These unchanged workloads are smoke and
compatibility checks, not an ABBA benchmark of the new fallback.

### Cause of the remaining late zero-contact waves

A second deterministic run captured the [waiting night-17
state](desierto123-partial-d17-waiting-state.json.gz) at time 515. The wave
was born around `(-19.65, -22)` in native weak region 4. Its first warthog's
crop plan returned `unknown` with zero route queries, and the wall plan
returned `unknown` with zero candidates. From `(95, 20)` in region 5 of the
**same saved world**, the wall plan instead returned `structure-1353` with
one candidate and one successful route query. The compact
[comparison](desierto123-partial-d17-region-probe.json) records both results.

The late-game defect is therefore primarily an **entry-region selection**
problem. Being exterior to the defense does not establish access to the
crop-facing walls. The current entry selector can reject a birth with no
reachable wall, then return that same birth if its alternative formation
fails. More wall-query caching would only repeat the wrong strategic question
faster. A proper fix must select or retain a birth component with a positive
route to a relevant attack opportunity for the whole wave, without treating
unknown connectivity as a blocked path or creating animals inside a closed
defense. Until that behavior is demonstrated over complete raids, this
native partial-wall integration remains experimental.

### Shared physical wall opportunity: experimental follow-up

The [frozen night-17 probe](desierto123-d17-wall-entry-probe.json) starts from
the actual camera-side exterior component. Wild Engine nominates six
crop-facing attack faces on two partial walls. From every nominated face, a
native route reaches the exterior resident edge, and a bounded formation can
place all nine animals with **9/9 physical routes** back to that face.
Nevertheless, the prior per-animal straight-line classifier nominates the
same wall for only one or two of those nine births because the real route
turns. A weak-region ID alone is insufficient: one of the nine positions is
quantized to a different weak region despite having a positive physical route.

The experimental entry selector now uses such a face only if the entire wave
has positive exterior and wall routes. It carries a wall/group/face hint with
each spawned animal. On an actual attack request, Wild Engine rechecks the
current wall, live crop group, species-specific physical side, route, and
attack-site lease. The hint cannot authorize a path across a static barrier;
the frozen test verifies that the same hint from the original disconnected
birth does **not** produce an attack. The ordinary planner remains available
when a hint is stale, blocked, or occupied. This deliberately changes the
raid entry and target decisions; it does not change damage, attack budgets,
wall prices, or physical movement rules.

The 20-night [trial](desierto123-shared-wall-hint-20.json.gz) completed.
Against the immediately preceding partial-wall trial, nights 16–20 had
15 versus zero wall hits, and zero-contact raids across all 20 nights fell
from nine to four. Cumulative native wall-route queries fell from 6,634 to
475. The ending farm had 13 versus 15 living crops and 1,928 versus 1,875
coins. Total wall time rose from 57.72 to 74.15 seconds; accumulated
`Game.tick` time rose from 44.60 to 60.67 seconds. The trajectories first
diverge at night 16, when previously idle animals begin attacking. Thus the
wall-time comparison is a different physical workload, **not** evidence of
an algorithm-speed improvement. Nights 17–20 account for most of the tick
increase (4.80–6.33 seconds per day instead of 1.17–1.92). The remaining
animals often wait for an exclusive wall reservation and then retreat; this
is a real policy/contention limit, not permission to let multiple animals
claim the same wall or to accelerate their attack animation.

A second run with the same binary and seed took 74.43 seconds and reproduced
the final serialized SHA-256
`18958224e17c47b4a3737aac930444fce253ba1f124cd7a5554d17fa90c3127b`,
124 wall hits, four zero-contact raids, and 475 native wall-route queries.
Reproduce with:

```sh
node tools/experiments/audit-defended-raid-pressure.mjs desierto 20 123 test-results/desierto123-shared-wall-hint-20.json.gz
node --test tests/raid-desert-attack-entry.test.js tests/spatial-native-raid.test.js tests/raid-contention-turns.test.js tests/raid-entry-preparer.test.js
npm run verify:browser-syntax
```

The directed raid suite passes 56 tests and browser syntax validation passes.
The older `RaidEntryPreparer` worker still uses the JavaScript `Navigation`
copy, but the Wild Engine campaign driver does **not** instantiate it, and
the interactive app initializes Wild Engine navigation directly. The native
entry path is therefore the relevant implementation for both. Its selection
can be synchronous on the interactive thread; this trial has not yet measured
the resulting frame latency in the browser. The PR remains draft pending
that measurement and sustained evaluation on additional seeds/biomes.

### Day-17 tick cost: worker repairs, not the new raid entry

An optional [per-tick and per-task trace](desierto123-tasktrace-17.json.gz)
of the same Desert/123 campaign
identified the next sustained cost. Day 17 executed 110 native task-planning
batches with three workers. Thirteen wall-repair tasks remained pending and
were reconsidered on nearly every batch; they yielded 1,430 `unknown` task
rows, compared with 62 found task rows. The batches made 9,712 native route
queries and spent about 3.55 seconds inside the task planner, out of about
4.91 seconds of `Game.tick` for that day. Many batches test 13 walls × three
workers × four wall interaction points before assigning one ordinary crop
task. Native route causes were 1,275 inconclusive graph searches and 155
missing destination connectors. These are not certified blocked tasks.

The morning trace had no raid animals for the expensive first 300 ticks and
kept 25 chunks resident. Frozen raid movement was substantially cheaper once
those chunks were resident. The late tick increase must therefore not be
attributed to animal animation or the new wall-entry route without further
evidence. The task planner currently wakes after eligible task changes or an
eight-second recovery interval and repeats the unresolved repair probes. A
fix should retain those repairs as pending and wake them when the required
sector or topology becomes available, while preserving global FIFO task
priority and treating `unknown` differently from `blocked`. The trace does
not yet prove that loading a particular frontier would resolve each repair.

Reproduce the diagnostic trace with:

```sh
WILD_ENGINE_TRACE_TICK_DAY=17 WILD_ENGINE_TRACE_TASK_DAY=17 node tools/experiments/audit-defended-raid-pressure.mjs desierto 17 123 test-results/desierto123-tasktrace-17.json.gz
```

The [morning day-17 state](desierto123-d17-morning-state.json.gz) freezes
three workers and 13 outstanding wall repairs at time 2.0. Individual
native route probes found that the inconclusive graph searches reported
`lazy_connected_reason() == 8` (an open sector frontier); some interaction
sites also reported a missing end connector. Loading a specific frontier
has not been proven sufficient to finish those repairs. Consequently the
planner must retain `unknown`, rather than turn it into `blocked` or discard
the tasks.

A small rejected experiment stored `unknown` in the existing exact-coordinate
route cache under the selected profile and graph revision. In a 30-second
frozen replay, an ABBA sequence produced 332 cache misses in each control
run and 288 misses plus 44 hits in each experimental run. The four total
times were 193.07, 196.03, 183.49, and 200.09 ms, respectively, with an
identical active-state hash
`8f39410e588254c5cd6564063d367d7459ae6b09316897f749032a6d7c2b3c09`.
The times overlap and the planner still made 323 route requests in each
variant. This merely accelerates some redundant polling, so the production
cache was left unchanged. The next candidate is to hold unresolved repair
decisions against sector, topology, and worker-location dependencies and
wake them at a relevant event while preserving global FIFO task priority.

The frozen replay is reproducible with:

```sh
node tools/experiments/profile-frozen-native-tick.mjs docs/qa/desert-raid-pressure-audit/desierto123-d17-morning-state.json.gz 30 --dt 0.1 --campaign-residency --resident-radius 2
```

### Native pending repair decisions

The task planner now retains an inconclusive service decision inside its
existing native task record while the worker's exact position, target
geometry, movement profile, and graph revision remain unchanged. An unrelated
crop task can wake the global FIFO queue without repeating the four physical
wall approaches for that worker/repair pair. The decision remains `unknown`,
not `blocked`; movement, target edits, sector arrival, portal changes, route
rejection, or confirmed topology changes force a new evaluation. Pending
entries leave with their task or worker and each task retains at most 32.
No route or strategic target is inferred from an unknown answer.

The 300-second frozen replay produced the same active-state SHA-256 with
both binaries (`b79465408176a77bcc164df6e3986080278b6e2047d409d9a8375ae2fb58f160`).
ABBA totals were 3,430/3,464 ms for the control and 751/710 ms for the
pending-decision variant. Native task route requests fell from 9,809 to 1,541
in each pair; the 79 global planning boundaries were unchanged. This is a
frozen workload benchmark, not a complete campaign result.

Two 17-night Desert/123 campaign runs with the pending-decision variant
finished in 48.18 and 48.00 seconds, compared with 55.11 and 55.40 seconds
for the directly preceding control runs. All four finished with the same
serialized final-state SHA-256
`d04918f917640cfbf7ce237267e179fb87ff638081272525c050232e037e00c8`.
On day 17, the [traced run](desierto123-pending-repairs-17.json.gz) made
3,524 worker task route queries instead of 9,712, with the same 110 global
plans; `Game.tick` fell from about 5.0 to 2.55 seconds. The matching hash
proves no observed decision or economic divergence for this frozen seed, but
does not establish universal behavioral equivalence.

The [Sabana/712 14-night smoke](sabana712-pending-repairs-14.json.gz) retained
its earlier final-state hash
`711a0699538f15045d179a0b7fe1de77f4ffd0dc862c983d2fab728425191622`,
139 living crops and 987 coins. Its total time was 67.90 seconds versus 67.18
seconds previously; the difference is within single-run noise and offers no
evidence of a speedup in that biome. Directed native intention, route,
topology, and restoration tests pass (26/26), as does browser syntax
validation. The PR remains experimental pending interactive latency and wider
campaign checks.
