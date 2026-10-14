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
region budget, and cache invalidation. All 92 combined spatial, connectivity,
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
native defeat after 316 seconds. Thus three biomes have physical campaign
coverage (Sabana, Gran Cañón and Gran Río), but no campaign has reached 30
nights, much less 60 or 100. The other three biomes have native functional
test coverage rather than long campaign evidence.

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
