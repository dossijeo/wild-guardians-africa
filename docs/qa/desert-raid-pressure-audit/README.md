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
