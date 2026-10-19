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
