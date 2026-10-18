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

## Remaining speculative mutation path

These corrections do **not** yet establish the contract for all previews:

| Service | Current speculative behavior | Required separation |
| --- | --- | --- |
| `withWallPreview()` | Adds/removes native barriers, restores removed props, and optionally rebuilds worker portals in the confirmed instance. Nested calls repeat that work. | A native query context/overlay for the wall, prop and portal hypothesis, including enclosure certification and any requested routes. |

A reproducible one-wall `withWallPreview()` probe in a Sabana/123 opening left
the JS wall stamp unchanged but advanced `lazy_sector_updates()` from 196 to
204 and `lazy_route_revision()` from 201 to 210. Run it with
`node tools/experiments/audit-wall-preview-isolation.mjs`. This
demonstrates that merely preserving the JS revision is insufficient: the native
graph is still modified and rebuilt. The current tests for general wall previews
assert eventual physical restoration, not full observational isolation.

The native overlay already supports local clearance and bounded worker
reachability. It does not yet expose the hypothetical enclosure certification
and complete route semantics used by all callers. Replacing those calls with a
positive-only connectivity result would silently weaken the construction
guarantees. A follow-up implementation must extend the existing native query
context, compare its answers against the current full preview across the six
biomes, and then remove the mutating path. A separate authoritative world or a
manual rollback of revision counters would leave cache and route-handle safety
unproven.

## Integration status

This branch is experimental. The day-83 source of the 116 confirmed wall
revisions and the building-preview mutation are addressed, but the general
wall-preview contract, longer interleaved
simulation, and full Sabana/123 V1 campaign have not yet passed. Do not merge
until those checks and physical access/protection regressions are complete.
