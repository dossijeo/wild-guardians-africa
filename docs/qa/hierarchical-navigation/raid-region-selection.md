# Raid target selection and native enclosure classification

Experimental branch `codex/hierarchical-navigation-openra`; no balance, damage,
wave composition or virtual-player policy was changed. This is navigation QA,
not production acceptance.

## Cause of `unknown`

Frozen input: `spatial-gran-canon-seed123-day6-capture-capture-state.json`,
day 6 at time 445, followed by 50 one-second `Game.tick` calls. The original
79,645-approach capture preceded a native stand-point rejection; the directly
comparable instrumented baseline contains 46,071 calls, 46,057 `unknown`.

The new `lazy_connected_reason` diagnostic classifies native calls without
converting uncertainty to blockage. In an instrumented 3×3-resident replay,
all 2,767 inconclusive graph-connectivity calls and all 6,050 inconclusive graph-route
calls reported **open frontier**. None reported missing endpoint sectors,
blocked endpoints, or a weakly connected source. Expanding the resident set
to 9×9 still produced open-frontier results. This means that the queried crop
region is not certified as closed in this checkpoint; loading a wider square
does not prove that the animal can or cannot reach it.

The JS↔WASM endpoint diagnostic now separates absent continuous-to-grid
connectors from an inconclusive native graph. In the final 50-tick replay,
all 253 `SpatialChunkUnavailable` approach failures reported `native-graph`;
none reported a missing start or end connector. The C++ calls behind them
likewise report open-frontier. This rules out fractional endpoint bridging as
the cause of this specific query flood.

The frozen state has 21 intact wall modules in an open L-shaped trace, not a
wall-only closed ring. Native `lazy_enclosure` classified 37 of the 41 living
crop-center samples as open-frontier for the warthog profile; four rounded
centers were non-walkable. This does **not** establish that every crop is
reachable. It disproves the narrower premise that this resident snapshot
already contains a certified closed wall enclosure. Animals must not be sent
to a wall merely because these route queries are inconclusive.

## Implementation

The C++ sector graph now labels its weakly connected regions once per topology
revision and marks whether each region touches an unloaded frontier. The same
labels make the existing `targetSealed` proof constant-time after graph
construction and expose `lazy_enclosure`/`lazy_weak_region` to the game. The
labels are discarded when sectors or portals change and rebuilt after load.
They are shared by all plants and animals of a movement profile.

The raid selector groups living crops, consults native connectivity once per
origin/native-region/profile/revision even when several crop groups share that
region, and classifies an unresolved region at most once per sector revision.
Only a crop region certified sealed and distinct from
the animal's region can nominate perimeter walls. A wall qualifies when
physical probes on its two sides map to distinct native regions. These wall
adjacencies form a small graph derived from the authoritative WASM labels;
for nested enclosures the selector chooses the first reachable barrier on a
chain toward the crop, rather than an inaccessible inner wall. Natural-only
isolation nominates no wall. The wall footprint supplies only local probe
points; no independent terrain map is introduced. If crops are
unresolved, a nearby wall can still be selected as an independent physical
structure target when a direct local approach is clear. This does not label
the crops blocked.

Unknown crop-region decisions remain pending until native sector or topology
revisions change; uncertain local structure approaches can be retried after a
short bounded interval. Region decisions are limited to 16 graph queries per
tick. Sparse chunk demand is capped at 16 pins per raid. Unresolved structure
approaches are shared by native origin region and wall/center, avoiding a new
query on each small animal movement. Planting or harvesting refreshes crop
membership without changing the native graph; wall, gate, breach and resident
sector changes invalidate the cached classification. The revision stamp is
currently profile-wide, so an unrelated sector change can invalidate an
otherwise reusable decision; this is conservative and cheaper than the former
per-crop query flood, but it is not a fully local invalidation scheme.

## Frozen comparison

| Measure, 50 ticks | Comparable baseline | Earlier group selector | Enclosure selector |
| --- | ---: | ---: | ---: |
| `approachPath` calls | 46,071 | 524 | 267 |
| Unknown detailed routes | 46,057 | 508 | 253 |
| Native region queries | 3,136 | 618 | 72 |
| `Game.tick` total | 15,527 ms | 478 ms | 342 ms |
| Enclosure classifications | — | — | 8 (0.33 ms measured) |

The shared selector cache contained 92 entries at the end of the replay.
Process heap deltas varied with garbage collection and are not a reliable
per-cache memory measurement; a sustained heap profile is still needed.
The selector uses the same native revision stamp for group, enclosure and
wall-side decisions. Two identical frozen replays produced the same
serialized-state SHA-256 and 267 approach calls after this sharing change.

The native graph still reports open-frontier for this snapshot. The final
bounded-demand variant produced 613 detailed calls, 601 unknown and 1,284 ms
over 50 ticks, including 368 sector updates. This is a negative result for
the hypothesis that the bounded resident expansion alone resolves the canyon
access. The cache prevents the unresolved topology from multiplying by every
crop and animal; it does not fabricate connectivity.

## Physical and sustained checks

The native closed-ring test creates an automatic worker gate, verifies the
animal crop region is sealed, selects a reachable perimeter wall, preserves
worker passage, saves/loads the enclosure, removes two wall modules, observes
the native classification reopen, and selects the crop through the breach.
Unit tests also cover natural-only isolation, an outer wall around a nested
crop enclosure, a separate accessible plantation, shared decisions across
crop groups and animals, open-frontier uncertainty, alternative crop access,
region budget, and cache invalidation. All 97 combined spatial, connectivity,
raid and movement tests pass, including fixtures across all six biomes. The
185 playable tests and web build
also pass; those suites do not replace sustained campaign QA.

The final 212-tick replay with sparse chunk demand completed its raid. It
recorded six physical structure hits, two ruined wall modules, thirteen crop
hits and destroyed crops after the breach, then all animals departed. The
first stricter enclosure-only variant let the same animals retreat without
attacking because this crop region remained open-frontier; its 120-tick
negative report is preserved. The correction permits a wall lying physically
between an animal and an unresolved crop group to remain an ordinary
structure target, but requires a graph-confirmed reachable attack side. It
does not label the crop group blocked or grant damage without an attack.

The final Gran Cañón seed 123 good-policy run reached day 14 but ended in an
actual defeat with no crops and 12 coins; this is not a 14-night survival
success. The earlier enclosure variant lost on day 13. A Sabana seed 712
run with the enclosure build completed 14 nights in 280 seconds, with 133
seconds of `Game.tick`; the earlier group-selector run used 327 and 179
seconds respectively. These are campaign outcomes, **not** an equivalent-load
speedup: the final farms had 15 versus 81 living plants. At comparable days
3 and 6 their `Game.tick` costs were similar (12.7 vs 12.4 seconds, and
8.5 vs 8.8 seconds). The 30-night-cap continuation of the enclosure build
ended in native defeat on day 18 after 288 seconds; it never reached night
30. The earlier group-selector 30-night-cap run ended in native defeat on
day 17 after 522 seconds, with a pronounced daytime `Game.tick` rise
unrelated to raid-target selection. Their economic and crop outcomes differ,
so these durations do not isolate navigation speed. Neither run validates
sustained 30/60/100-night performance; this branch must not be merged on
this evidence alone.

An additional fixed expansive-policy Sabana run with a 30-night cap ended in
native defeat on day 18 after 280 seconds. It also cannot establish
30-night sustained performance, but it showed no technical navigation stall
before the defeat. No policy or balance parameter was changed for this run.
Sabana seed 2026 with the same fixed good policy lasted longer, but also
ended in native defeat on day 21 after 380 seconds. The 30-night cap was not
reached; this result is retained as another negative campaign observation.
Gran Río seed 2026 with the same policy reached day 21 and then ended in
native defeat after 316 seconds. Thus three biomes initially had physical
campaign coverage (Sabana, Gran Cañón and Gran Río), but no campaign reached
30 nights, much less 60 or 100.

After the final cross-group region-decision sharing commit (`9a64fa4a`), a
fresh Sabana seed 712 good-policy campaign completed the 14-night cap in
279.4 seconds with no technical stall, 108 living crops and 755 coins. Its
accumulated `Game.tick` time was 154.4 seconds. The previous enclosure build
also took about 280 seconds wall time but 132.6 seconds of `Game.tick` and
ended with only 15 living crops. The selector's extra reusable decisions
changed gameplay outcomes and the work performed by the engine; these two
campaign timings cannot establish an isolated navigation speedup or
regression. The frozen 50-tick state remains the equivalent-load comparison.

An intermediate headless 30-night run was stopped at day 8 because its QA
driver retained raid-only resident chunks between nights, unlike the renderer.
The driver now releases those chunks when the raid ends. This was a harness
error, not an economic defeat; no game rule was changed for the correction.

## Sabana seed 123 retreat regression

A separate 30-night-cap good-policy campaign failed technically during night
11 after 206.7 seconds. This is **not** an economic defeat: fifteen animals
had departed, while one warthog with no hits remaining remained in retreat.
Its native path started at grid point `(96, 103)` from continuous position
`(95.379, 103)`, but the swept static check rejected that first connector.
During a 50-tick replay it moved only 0.0016 m, although a logical route
remained installed. The saved state and full negative report are retained.

The movement safety path now notices twelve seconds without meaningful
destination progress when the next static connector is invalid. It discards
that path and runs the existing bounded, physically checked exit connector
across subsequent ticks. It does not phase through static obstacles or change
speed or attack budget. On the saved state the connector found a 73-point
route after 170 budgeted calls (236 ms total); a native replay recorded one
`AnimalExitRouteRecovery` and the warthog reached its actual exit. A snapshot
regression exercises the recovery and its serialized pending state. The
full-campaign rerun below distinguishes the repair from a replay-only success.
An additional regression now actually disposes the WASM session during the
pending recovery, deserializes the saved state, rebuilds the native world and
resumes the raid. The warthog again reaches its physical exit; every measured
movement segment passes the native static collision check. This checks
continued behavior after load, not only that the recovery flag serializes.
If every bounded physical connector also fails, its final failure is recorded
separately from a pending search. Only a retreating animal with no attacks
left can then leave through a controlled `AnimalRetreatExitAbandoned` event;
the same event has a 1,500-second no-progress backstop if a connector never
resolves. Neither path adds damage, moves the animal through a barrier, nor
changes its speed. A closed-gap test verifies the exhausted-search case,
the timeout case and that an animal retaining attacks is not removed by this
safety valve. These are exceptional fallback events and must be counted in
campaign QA rather than treated as physically completed retreats.

The rerun used the identical Sabana seed 123, good policy and 30-night cap.
Its daily money and crop counts matched the failed run through day 10; it
passed night 11 normally and continued to a **native defeat on day 16** with
two crops and 522 coins. It completed 15 nights in 330.5 seconds, including
148.7 seconds of `Game.tick`. Raid evidence is verified and ledger
reconciliation is exact. This confirms the day-11 technical stall is fixed,
but it does not establish 30-night survivor performance or approve the
current military balance. Both the failed and recovered daily ledgers remain
available as compressed reports.

A fixed good-policy Volcanes seed 712 run adds a fourth biome with campaign
coverage. It completed 17 nights and ended in a native defeat on day 18,
after 300.7 seconds wall time and 184.4 seconds of `Game.tick`, with zero
crops and 65 coins. Raid evidence was verified and did not lose coverage.
No technical navigation stall occurred. Manglares and Desierto still have
native functional tests rather than prolonged campaign evidence; none of the
four campaign biomes has yet supplied a 30-night survivor.

Repeated raid target lookup also now uses the existing live-crop index, so
the lookup does not rescan thousands of historical plants. A regression with
20,000 dead records confirms zero historical-plant reads after index
initialization. The preceding lookup reference test had encoded the old
two-hit crop rule; it was updated to the current one-hit rule without changing
combat behavior.

## Repository-wide test status

At `e8007a9f`, the full `npm test` run completed in 467.6 seconds:
4,321 tests, 4,122 passed and **199 failed**. The focused 18-test
retreat/evidence/persistence set, 185 playable tests, web build and PR
`validate` check pass. The failing full-suite cases span legacy Growth and
Multiply expectations, navigation geometry and route expectations, animal
raid behavior, and several other systems. Some explicitly assert rules or
routes replaced by experimental work, but the full set has **not** been
triaged against the branch's base revision. Therefore this is not a clean
repository-wide QA result and is not grounds for merging the PR. The complete
TAP output is retained in `full-suite-e8007a9f.log.gz`; the aggregate
failure count is recorded here for quick review.

The 30-night-cap native campaigns reported above all ended in real defeat
before night 30. They demonstrate several biomes and seeds without a
navigation stall, but cannot validate sustained 30/60/100-night performance.

The first full-suite navigation failure exposed a genuine missing endpoint
guard: `Navigation.path` could enter the hierarchical connector check even
when the exact destination was physically blocked (including sub-cell
routes). It now rejects that destination through the normal `walkable`
clearance before graph work. The formerly failing blocked-endpoint test and
28 focused spatial/raid tests pass. A repeat of the frozen Canyon state kept
the same 267 approaches and 253 native-graph unknowns; the output is in
`selector-endpoint-check.json`. This is a narrow correction, not a claim
that all remaining full-suite failures have been resolved.

The same triage exposed stale hierarchical sectors during initial-village
placement. The village search temporarily changes the terrain pad, building
obstacles and suppressed props. It cleared old walk/segment caches but left
the sector graph alive. In Sabana/Mapungubwe seed 712, `(86, 0)` was
physically walkable after placement while its cached sector still marked it
blocked; clearing the graph made the worker route valid. The provisional
terrain/obstacle transitions now clear the hierarchical sectors as well.
All 61 initial-world route tests pass (33 failed in the prior full-suite
run), as do ten initial-loading/Canyon-defense tests, 28 focused spatial
tests, 185 playable tests and the web build. The frozen Canyon replay still
reports 267 detailed approaches and 253 open-frontier unknowns. This fix
was included in the subsequent full-suite run below.

One worker-clearance test had a 150-tick arrival limit tied to the old
detour. The hierarchical route follows a different collision-safe corridor
and arrives on tick 166 at unchanged speed; every sampled landing remains
terrain-valid. The limit is now 200 ticks, preserving its permanent-stall
check without requiring the old route. All six worker-clearance tests pass.
The reservation reconciliation now treats a missing `raid.reservations` map
as empty, then creates the current individual-reservation map. This removes
the exception in two synthetic raid-end/worker-displacement tests without
changing target ownership in normal raids. The 17 displacement and
individual-reservation tests pass.

At frozen commit `0f58b340`, the full suite completed in 447.2 seconds:
4,321 tests, 4,158 passed and **163 failed**, an improvement of 36 passing
tests relative to `e8007a9f`. Its exact TAP output is retained in
`full-suite-0f58b340.log.gz`. The run includes the endpoint, provisional
village, worker test and absent-reservation corrections. Remaining failures
still include expectations from previous magic and crop-durability rules,
old navigation APIs, and some raid/persistence cases that require individual
triage. This branch has **not** passed repository-wide QA and remains a draft.

One of those failures was a QA hook metric tied to the former call order.
After the blocked-endpoint fix, `Navigation.path` correctly returns before
requesting the hybrid WASM hook; the hook records zero requests rather than
one certified missing connector. The test now asserts the physical endpoint
is blocked and that no hook or fallback work runs. Both hook tests pass.
The 20 physical raid-return acceptance cases also asserted the former
two-hit, one-crop-per-strike model. They now count actual `CropHit` events
from the area impact and check that every reported destruction corresponds
to a destructive crop impact, while retaining the worker-return, task,
ledger and save/load assertions. All 20 pass without changing raid damage.
The 43 `player-raids` cases now use the approved one-hit crop resistance,
quarter-step peripheral damage and progressive horde ceiling (34), rather
than the earlier two-hit/one-or-two-animal assumptions. They still verify
all 100 night plans, introductory species and strike budgets, exactly-once
destruction across reload, and introductory crop-loss limits. All 43 pass;
only test expectations changed.

After the provisional-sector fix, a fresh native Sabana/Mapungubwe seed 712
good-policy campaign completed the 14-night cap in 276.8 seconds, with no
raid evidence issues. Against the archived identical-policy 14-night run
(`spatial-sabana-seed712-enclosure-latest-14nights.json.gz`), all 14 daily
rows match in every gameplay field; only measured wall times differ. The
complete `raidEvidence`, entry transport and plot-search reports also match.
The farm ends with 108 living crops and 755 coins in both runs. Accumulated
`Game.tick` was 151.7 seconds versus 154.4 seconds before, and the largest
daily `Game.tick` cost was 16.6 versus 16.9 seconds (day 10 in both).
These small timing differences are not an isolated speedup claim, but the
matching decisions and physical evidence show no new campaign regression
through night 14. The full new report is retained as
`selector-village-14-sabana-712.json.gz`; 30/60/100-night survival remains
unverified.

Gran Cañón seed 123 produced an earlier day-10 defeat on the current branch,
so it was compared against an isolated detached checkout at `f89815e4`
before the provisional-sector reset. Both runs used the same good policy and
14-night cap. They completed nine nights and ended in native defeat on day
10 with one crop and 81 coins. All common daily gameplay fields, the full
`raidEvidence`, entry transport and plot-search report match exactly. The
baseline took 64.51 seconds wall time and 38.82 seconds of `Game.tick`; the
current run took 64.02 and 38.69 seconds respectively. Both reports are
retained as `ab-before-canyon-123.json.gz` and
`selector-village-14-canyon-123.json.gz`. The earlier archived day-14 Canyon
run used a different selector revision and is not a same-source baseline for
this sector reset. This A/B shows the reset did not cause the day-10 defeat;
it does not validate the current military balance or a 30-night survivor.

At frozen commit `3e695f69`, the full suite completed in 437.6 seconds:
4,321 tests, 4,191 passed and **130 failed**, 33 fewer failures than the
`0f58b340` run. The exact TAP output is retained as
`full-suite-3e695f69.log.gz`. This includes the updated physical raid-return,
one-hit crop and blocked-endpoint hook assertions. Remaining failures are
still unresolved; the largest groups concern old village prices, old
connected-group reservation exclusivity, previous magic rules and historical
navigation APIs. No production acceptance is claimed from this improvement.

The eight defensive-reservation acceptance tests no longer enforce the
removed connected-group lock. They now verify simultaneous independent
centre approach slots, distinct wall modules within the same connected
perimeter, distinct plants in one contiguous crop group, physical approach
spacing, target destruction, and deterministic save/load continuation.
All eight pass without changing target-selection or combat code.

The seven recorded paid-defense retreat tests also pass with the hierarchical
navigator. The night-31 and night-39 replays finish after save/load while
checking every swept segment against static geometry and current mobile
bodies. They no longer require crossing a worker's *historical* position,
because a different physically valid route need not do so. In the bounded
night-39 progress case, the animal travelled 46.74 m in 12.5 seconds at its
unchanged 3.8 m/s speed; its distance to the original exit fell 38.85 m.
The progress threshold was adjusted from 40 m to 35 m to permit that valid
detour while still rejecting stalls. An obsolete sliced-A* API assertion was
replaced with a hierarchical-sector test: a route detours physically around
an obstacle, reuses built sectors on a repeat query, and becomes direct after
the obstacle is removed and geometry invalidated. This changes only QA
expectations, not movement or attack rules.

The full suite at `eeab77c8` completed in 445.6 seconds: 4,321 tests,
4,203 passed and **118 failed**. Relative to `3e695f69`, precisely 12
formerly failing cases now pass (eight defensive-reservation cases and four
paid-defense retreat/navigation cases); there are no newly failing test
names. The complete TAP output is retained in `full-suite-eeab77c8.log.gz`.
These remaining failures still prevent repository-wide acceptance and PR
integration. In particular, the campaign evidence above has not established
a 30/60/100-night survivor or a sustained large-farm performance bound.

Subsequent failure triage found one actual reservation defect: when a target
was destroyed after an animal had committed its attack animation, reservation
reconciliation erased `targetId` before the hit frame. It now relinquishes
the obsolete lease while retaining the committed target ID until the
animation resolves as a miss. A replacement structure receives no phantom
damage. A focused 54-test run of animal actions, individual reservations and
region selection passes. Two other old test assumptions were updated without
changing game rules: a synthetic terrain swap must invalidate the hierarchical
sectors (all eight watering-approach tests pass), and an exhausted animal may
find a different valid return route without requiring the old search's
initial failure (the physical exit/reload test passes). These changes postdate
the `eeab77c8` full-suite count; their fresh full-suite result follows.

That fresh full suite at `57585091` completed in 445.3 seconds: 4,321 tests,
4,206 passed and **115 failed**. Exactly the three cases described above
changed from fail to pass; no test name newly failed. The complete TAP log is
retained in `full-suite-57585091.log.gz`. The PR validation workflow also
passed, including playable tests and web build. Repository-wide QA remains
incomplete, and neither that workflow nor the focused tests establish
30/60/100-night survivor performance.

Further raid acceptance triage found eleven test cases still assuming the
former two-hit crop durability: five committed Shield-border cases, one
cross-species active-Shield case, and five destroyed-crop reservation cases
(the sixth Shield case already passed). They now assert the approved one-hit
rule while retaining physical distance, blocked-contact, post-expiry travel,
individual lease release, remaining hit budgets and reload checks. Both
complete focused files pass: 22/22 cases. No Shield, damage, navigation or
reservation production parameter changed. This focused result postdates the
`57585091` full-suite log.

The frozen full suite at `7fc37943` completed in 449.0 seconds: 4,321
tests, 4,217 passed and **104 failed**. Eleven previous failures were
resolved by the current one-hit Shield and reservation assertions; no test
name newly failed. The complete TAP output is retained as
`full-suite-7fc37943.log.gz`. The global suite is still not green.

The old QA-089 timing/composition test also assumed that the retired raid
planner consumed exactly three RNG draws per night. Its replacement uses
1,000 independent seeds at night 50 and verifies that the first draw fixes
the attack time, plans vary across seeds, two identical states produce the
same composition and final RNG, and repeated planning plus periodic
save/load never rerolls a committed plan. All eight tests in the raid-planning
file pass. This is a test-only update after the `7fc37943` full-suite run.

The QA-066/067/069/071 cargo-recovery fixture also assumed the retired
immediate x2 harvest value. Under the current shared agricultural-power
rules, its original crate carries 14.52 base coins and a separate exact
132/13-coin Multiply entitlement. Delivery liquidates 10 whole bonus coins;
the ledger rounds the combined 24.52-coin transaction to 25 coins once.
The fixture now verifies the base value and committed entitlement across
save/load, a different worker profile recovering the same box, exact payout,
and no duplicate delivery. It also marks its separately scripted raid as the
night's completed plan, preventing an unrelated second horde from delaying
the next dawn. All three tests in `acceptance-crate-recovery.test.js` pass.
This is test-only triage after the `7fc37943` full-suite run, so the recorded
global failure count has not been updated.

Six old agricultural acceptance assertions likewise assumed full-strength
Growth or an immediate doubled crate. The updated tests use the committed
Growth entitlement, check that fractional Growth does not water a crop for
free when it crosses a checkpoint, and verify that the original crate value
and Multiply entitlement survive pickup, expiry and reload before a single
physical delivery. The complete `acceptance-agriculture.test.js` file now
passes 17/17 cases. These changes affect QA expectations only; no crop,
water, magic or economic production rule was changed. The frozen full-suite
count above predates this test-only change.

The intensive-farm auditor also compared each `deliver:` ledger entry with
the crate's base value alone. The current delivery transaction includes the
separately settled Multiply income, so the auditor now adds that exact
entitlement before applying the transaction's whole-coin rounding. The
Desert/Suajili seed 712 native nine-night terrain-landing test was rerun in
full and passes 2/2; every observed animal landing met the native terrain
predicate. Its earlier failure (`17` paid versus `11` base coins) was an
auditor mismatch, not evidence of an illegal landing. No production terrain,
movement or economic rule changed.

The complete suite was rerun at `dc298b5a` in 447.6 seconds: 4,321 tests,
4,228 passed and **93 failed**. Compared with `7fc37943`, eleven former
failures are resolved and there are no newly failing test names. The exact
TAP output is retained in `full-suite-dc298b5a.log.gz`. This remains a red
suite, so neither core stabilization nor the deferred `wild-engine` rename
is accepted. One remaining navigation-test cluster assumes that precomputed
JS paths are consumed by `Navigation.path`; the hierarchical adapter now
plans paths directly. The worker still computes and transfers those unused
path arrays, so this warrants architectural cleanup and a before/after cost
measurement rather than reinstating the retired routing behavior to satisfy
the old assertions.

The raid-entry and hiring workers no longer copy successful paths into their
replies: `Navigation.path()` delegates to the hierarchical adapter and never
consumed those arrays. The workers still perform the native entry and hiring
preview work and return bounded static collision/prop data. A legacy `paths`
field in a reply cannot override a WASM route. Crops preserve static answers;
real prop removals invalidate them. All 41 focused raid-entry, hiring and
warmth tests pass, including complete movement trajectories in six biomes;
the web build passes. The identical Sabana populated-entry snapshot was run
twice per mode before and after in `prepared-raid-*-cleanup.json`. Median
preparation was about 1.48 s before and 1.50 s after, with prepared spawn
about 4.8 versus 5.3 ms; two samples per version are insufficient to claim a
speed improvement. This removes obsolete copies and worker-message payload,
not the remaining expensive preview calculations. The global 93-failure
count predates this cleanup.

A follow-up experiment tested removing `warmRaidApproaches` from the raid
worker on the same populated Sabana snapshot. With the preview, two prepared
runs spent 1,472/1,532 ms preparing and their first visible `Game.tick` took
about 17 ms (median). Without it, preparation fell to 641/674 ms, but the
first visible tick rose to about 300 ms (median); the 20-tick window rose
from about 21 to 302 ms. Alternating prepared/reference runs verified the
same serialized state after every tick in both variants. The negative
measurements and source hashes are preserved in
`first-routes-before-warm-preview.json`,
`first-routes-without-warm-preview.json`, and
`prepared-raid-without-warm-preview.json`. The experiment was reverted:
moving several hundred milliseconds onto the frame thread would harm
interactive smoothness even though the worker finishes sooner. This preview
remains useful; only its unused copied path arrays were removed.

Seven navigation assertions still targeted the retired JS search's
`searchNeighbors`, `failedPaths`, `closedRegions`, and narrow-margin failure
behavior. They now verify the equivalent physical and architectural
properties of the hierarchical navigator: cached sector reuse, independent
movement profiles, non-contaminating construction previews, route-array
isolation, wall/shield blocking, valid same-side routes, and a physical detour
around a long barrier. The complete segment/neighbor files pass 15/15, and
the separate JS/WASM hierarchy and lazy-sector files pass 16/16. This is a
test-only update; no collision, movement or path-planning production code
changed. The recorded global 93-failure count predates these assertions.

The fractional-walk capacity test also assumed fractional coordinates were
never cached. The current exact-coordinate fractional cache is separate from
the 50,000-entry integer cache and invalidates on a topology epoch change.
The acceptance test now checks one physical evaluation for two identical
fractional queries and a fresh evaluation after `setState`. The complete
navigation-query-capacity file passes 3/3. This is another test-only contract
update; the global suite has not yet been rerun after it.

`Game.tick` no longer creates a per-tick `withNavigationQueries` scope. The
hierarchical `Navigation.path()` does not call `navigationQueryResult` or
`rememberNavigationQuery`; those helpers are retained only in legacy QA and
benchmark sources. A frozen Gran Cañón day-6 replay after this removal has
the same serialized-state SHA-256 as the archived selector run, with exactly
267 approach calls and 253 native-graph unknown results in both. The new
report is `query-scope-removal-50-ticks.json`. Its total of 373 ms versus
the archived 342 ms is a single noisy comparison, not evidence of a speedup.
Thirty-seven focused simulation, raid and agricultural tests pass, and the
web build passes. The change removes a dormant execution layer without
altering navigation decisions or gameplay state.

A same-policy Gran Cañón seed 123 native campaign was repeated after the
committed-target fix. Against `selector-village-14-canyon-123.json.gz`, all
daily gameplay fields, complete raid evidence, entry transport and plot
search match; only timing fields differ. Both runs finish nine nights and
lose on day 10 with one crop and 81 coins. `Game.tick` totals were 38.11 s
versus 38.69 s, with overall wall time 63.66 s versus 64.02 s. Those small
timing differences do not establish a speedup. The new ledger is retained as
`selector-548316a1-canyon-123.json.gz`. This regression check does not
establish a 30-night survivor or military-balance acceptance.

The full suite at frozen commit `5daf925b` completed in 444.1 seconds:
4,321 tests, 4,239 passed and **82 failed**. Eleven failing test names from
`dc298b5a` are resolved, with no newly failing names. The full TAP record is
`full-suite-5daf925b.log.gz`. This is still a red suite and does not establish
core stabilization. One rendering test used a plain-object `WorldScene`
fixture that omitted the existing `removeInstalledChunk` method; the fixture
now supplies the real method. Its complete file passes 6/6 after that
test-only correction. The 82-failure count predates this correction; no new
global count is claimed.

The recorded Gran Cañón day-1 building route exposes a remaining distinction
between the integer-grid navigator and a physically valid local connector.
The hierarchical worker route traverses about 72.3 m around the center;
the existing work-point corner connector finds a swept-clear route under 7 m.
The direct segment is blocked. Inserting a wall on the lattice's first cell
makes that cell unwalkable, removes the corner shortcut and causes the
hierarchical planner to return no route from that recorded start. The updated
building-route file tests these actual contracts and the water/rotated-footprint
clearance rules, passing 19/19.
This is test-only triage: it neither changes the engine nor establishes that
all worker routes near buildings are short. The corner connector belongs to
work-point selection, while the general WASM path can still take a longer
valid route; broader route-quality measurement remains necessary.

## Deferred engine name

After the WASM spatial core is functionally and performance-stable, rename
`spatial-savanna` to `wild-engine` consistently across its C++ source,
compiled WASM, JS adapters, workers, runtime imports, build script and tests.
The current name occurs in all those live paths. Keep archived benchmark and
QA filenames intact as historical evidence, and verify the new artifact name
in the web package and Windows build before retiring the old one. This rename
is explicitly deferred until stabilization; it is not part of the current
selector correction.

## Reproduce

```powershell
node tools/experiments/profile-spatial-campaign-snapshot.mjs docs/qa/hierarchical-navigation/spatial-gran-canon-seed123-day6-capture-capture-state.json 50 docs/qa/hierarchical-navigation/selector-recheck.json
node --test tests/raid-region-selection.test.js tests/spatial-navigation-movement.test.js
```

Intermediate reports (`selector-prototype`, `selector-local-wall`, and other
`selector-*` files) retain unsuccessful approaches and their measurements.
Full daily campaign ledgers are preserved as `*nights.json.gz` (gzip-compressed
JSON) so the PR diff remains reviewable. They can be inspected with any gzip
reader without losing individual transactions or negative outcomes.
