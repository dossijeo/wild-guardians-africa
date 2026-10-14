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
that the other 198 or fewer full-suite failures have been resolved; the
entire suite has not been rerun after this change.

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
requires a new full-suite run before revising the 199-failure aggregate.

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
