# Wild Engine speculative-preview isolation (experimental)

## Contract

A quote or preview must leave the confirmed wall mirror, topology revisions,
active routes and intentions, game entities, reservations, events, and later
confirmed queries unchanged. An inconclusive read-only overlay returns
`unknown`; it cannot certify access or blockage. Paid construction and repair
continue to use the ordinary confirmed update path.

## Observed defect and first correction

The frozen Sabana/123 day-83 state contains a ruined gate near a worker. Before
this change, `withWallStatePreview()` called `walls.sync(hypothesis)` followed by
`walls.sync(original)`. Each pair advanced the confirmed wall journal twice.
The PR #109 trace recorded 58 hypotheses, 116 spurious wall revisions (536 to
652), and divergent worker movement without a purchased wall.

Repair hypotheses now pass changed barrier footprints and proposed gate portals
to the existing native, read-only reachability overlay. The confirmed wall
mirror is never synchronized to the hypothesis. The overlay only certifies a
positive route. Unsupported changes, absent sectors, or an inconclusive search
remain `unknown`. A nearby worker at an existing gate with an inconclusive
connector now defers that repair instead of evaluating unrelated gate swaps.
The normal confirmed repair still applies the actual wall and gate changes.

The directed frozen-state test performs 100 hypothetical repair probes, then
the real repair-access quotation. It observes unchanged JS topology stamps,
native sector-update count, confirmed worker route, serialized game state, and
the same route after save/load. The quotation makes zero provisional wall-state
swaps and returns `unknown` for the unresolved near-gate case. The directed
test also interleaves more hypotheses with ten ticks of two restored copies;
their serialized states remain equal at every tick. The repair, gate-overlay,
and deferred-wall suites pass (24 tests).

## Read-only building previews

The native overlay now accepts temporary building polygons and uses the same
point-in-polygon and clearance calculation as confirmed polygons. Village
entry and center-placement quotes use it without inserting polygons or
temporarily suppressing props in the confirmed world. A directed differential
test compares provisional polygon occupancy with the same polygon actually
installed in a separate test step. One hundred building probes plus a center
quote leave the native route revision, sector-update count, and JS topology
stamp unchanged. Unknown reachability does not approve a center.

Center quotes previously ranked eligible villages by the length of the route
found during the speculative mutation. The overlay currently proves
bidirectional access but does not return route length; the quote uses direct
distance only to rank villages whose access is certified. This can select a
different village when several are eligible. It never supplies that distance
as an actor route. Before integration, compare center purchases and economics
on multi-village fixtures or add a native route-cost result if this ranking
change is material.

## Enclosure and general wall hypotheses

The topological enclosure cut (including the day-80 local rock detour) now
evaluates the proposed wall footprints with a read-only native solid-face
overlay. A separate overlay mask feeds the existing native cut algorithm;
natural faces retain their original physical terrain proof. The final boundary
is checked again under the same hypothesis, while worker access uses the
positive-only native reachability overlay. The day-80 test confirms that all
six navigation-profile revisions, the sector-update count and the JS wall
stamp remain unchanged. The rectangular crop-group planner now uses the
already available physical wall-loop proof plus bidirectional worker access
under an overlay; its directed quote test likewise leaves the native worker
revision unchanged. These changes remove the remaining production enclosure
calls to `withWallPreview()` and keep uncertified cases as `unknown`.

The generic `withWallPreview()` API still needs exact path semantics for older
QA probes and rare compatibility paths. Its mutating implementation now runs
inside a disposable *hypothesis instance* of the same C++/WASM engine,
reconstructed from the confirmed native snapshot and resident chunks. It is
reused until a confirmed topology or residency revision changes. Barriers,
suppressed props, portals, sectors, route caches and their revisions in that
instance are never authoritative. The callback's session navigation points
to the hypothesis only for its synchronous scope; finally restores the
confirmed engine, even if the callback throws. A failed restoration discards
the hypothesis instance. This retains the old physical route checks without
rolling back revision counters or risking confirmed route handles. It does
cost extra memory while a legacy preview is needed; the read-only overlays
remain the ordinary path.

Before isolation, a one-wall Sabana/123 probe increased confirmed
`lazy_sector_updates()` 196→204 and `lazy_route_revision()` 201→210. The
same reproducible probe now reports 196→196 and 201→201 across 100 previews.
On this host, the first hypothesis cost 261 ms and the remaining 99 together
cost 402 ms (single run; not a distributional benchmark). The dedicated test
also compares the complete native spatial snapshot, all profile revisions,
intention counters, game serialization, and a confirmed route after 100
previews plus a thrown callback. The frozen day-83 test performs another 100
generic wall hypotheses and 100 repair hypotheses, then interleaves both
with ten ticks; the two serialized trajectories remain equal. The six-biome
gate and enclosure regression suite passes with the hypothesis instance.

## Integration status

This branch remains experimental. The known speculative revision leaks and
directed physical regressions are addressed. The full Sabana/123 V1 campaign,
multi-village center-ranking comparison, and broader performance comparison
are pending. A committed-code Sabana/123 V1 run (`f7ad3969`, topological
defense, native intents) reached day 11 and stopped with `status: error`:
15 animals had gone, but one buffalo with no hits remaining remained in
`retreating` at approximately (77, 6.18). Its partial state and per-day rows
are in `docs/qa/preview-isolation-sabana123-v1.json` and the associated
`-partial-state.json`. This is a technical incomplete-incursion result, not
a balance defeat or evidence about day 83. Its relationship to preview
isolation remains unproven. The saved actor repeatedly alternated between
two positions 0.027 m apart: its next static connector was rejected, then
the route was recreated without destination progress. Counting repeated
static rejections in that same local pocket now starts the existing bounded
retreat recovery. The frozen regression verifies that the buffalo reaches
its real exit on physically checked steps, without controlled disappearance,
extra hits or damage. A broader analytic wall-sweep prototype exposed a
separate discrepancy between sampled graph connectors and continuous wall
clearance, but changed older retreat fixtures; it was discarded pending a
dedicated movement/graph correction. The complete campaign still needs a
fresh committed-code run. Do not merge until sustained simulation and reproduction have
been reviewed. The source tree is now `src/world/wild-engine/`; the rename was
separate from the behavioral change and all 204 playable tests, 51 directed
wall/enclosure tests, and the WASM/Vite builds pass after it.
