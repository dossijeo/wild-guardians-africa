# Native raid reservation saturation diagnostic

Read-only production investigation on the source pinned in source.json. Explicit QA cohorts are declared; the night calendar does not select them. Seven fixtures use the same seed712, native entry selection, RNG budgets, actor collisions, paths, animation durations, hits and retreat. Controlled flat terrain and no worker roster isolate reservations; real building/wall geometry remains active. Plants are created before spawn and never deleted by the diagnostic. Only actual native hits may kill them. This is neither a campaign result nor a benchmark.

## Observed native facts

| Fixture | Crop groups | Defensive groups | Animals | Initial hits | Spent hits | Animals spending hits | Retiring with remaining hits | Living crops after raid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 100 contiguous millet | 1 | 1 centre | 1 | 2 | 2 | 1 | 0 | 99 |
| 100 contiguous millet | 1 | 1 centre | 2 | 4 | 4 | 2 | 0 | 99 |
| 100 contiguous millet | 1 | 1 centre | 5 | 14 | 4 | 2 | 3 | 99 |
| 100 contiguous millet | 1 | 1 centre | 12 | 32 | 4 | 2 | 10 | 99 |
| 100 separated millet | 100 | 1 centre | 12 | 32 | 32 | 12 | 0 | 85 |
| No crops | 0 | 1 centre | 12 | 32 | 2 | 1 | 11 | 0 |
| 100 contiguous millet +12 connected wall pieces | 1 | 2 (centre + wall component) | 12 | 32 | 6 | 3 | 9 | 99 |

All seven raids end naturally before the120 simulated-second cap. Full native actor rows record budgets before/after, initial target/reservation assignment, retreat transitions and hits. No budget is removed by the probe. The crop control changes planting spacing1.5→3m, so it changes native geometry as well as connectivity; its32/32 budget consumption shows reachability remains available. The decisive immediate fact is that the connected fixture fills every group reservation, then ten remaining actors retreat at elapsed0 with their full budget while100 crops are still alive.

## Source cause

`targetFor` skips a connected crop component as soon as its `crop:<component>` reservation is held. `defensiveGroups` similarly allows only one actor per connected defensive wall group or centre. That deliberately preserves exclusivity. In `updateRaid`, `!selected` immediately switches the actor to `retreating`; the actor never waits for the active owner to release a group. Increasing animals can therefore increase unused departing budgets rather than delivered hits. With one large mono crop component and one centre, this fixture caps actual simultaneous attackers at two. Adding a connected wall of12 pieces supplies one additional claim, not12. This is not a universal claim that every geometry has the same cap: separated species/components or multiple centres add independent groups, and blocked approaches may reduce actual usage further.

## Proposed next step — review required

Preserve exclusive ownership and physical collisions. Distinguish temporary reservation contention from genuinely unavailable targets. If eligible native targets exist but their group leases are currently occupied, retain the unspent actor in a waiting/turn queue instead of beginning final retreat. A deterministic FIFO turn can claim the newly released group, then execute the normal reachable approach and all existing native movement/attacks. No concurrent approach overlap or shared reservation is needed.

Waiting must have a physical exterior staging position with its own actor footprint and body separation, rather than freezing all animals on top of the farm. Do not reserve a crop while queued or spend/reassign its hit budget. Re-evaluate on release/topology/target eligibility changes; avoid an A* search every frame. Genuine absence/unreachability needs a distinct bounded retry/failure policy so a destroyed/inaccessible farm cannot create an immortal raid. Save/reload must preserve order, budget and group ownership; collapse, shielding, generation of new crop components and removal of owner must invalidate queue eligibility safely. A horde may take substantially longer because turns serialize; budget/calendar calibration should be measured only after this behavior is approved and implemented.

No runtime change is included here. Reproduce with `node tools/probe-raid-reservation-saturation.mjs`; this overwrites only the diagnostic result folder, not production state or original campaign artifacts.
