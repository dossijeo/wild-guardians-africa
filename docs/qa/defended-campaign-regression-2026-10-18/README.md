# Defended campaign regression, 18 October 2026

This is a current-engine replacement for the historical assertion that a fixed
16-plot farm without walls wins 100 nights. The old farm is still exercised for
legal farming, spell, ledger, raid and save/load behavior, but its military loss
is not evidence that competent defensive management cannot win.

The two frozen runs below used the production V1 pressure table, Sabana seed
123, Mapungubwe, the `good` virtual-player strategy, native intentions, native
wall plans, continuous Wild Engine and the event-driven topological defense
policy. No balance parameter or rule was changed. The source checkout was
`origin/main` at `8c146699`, with native campaign-runner SHA-256
`745a77d05768a992ffe5c30853227a4415dbace813f393edf0ae4d02000b7b91`
and Wild Engine WASM SHA-256
`f0032bf7d6d5bb3336f2f9480fc2dc109906b9d2743315853320420863b07643`.

Reproduce from the repository root, changing the output path as desired:

```sh
node tools/experiments/compare-enclosure-defense-campaigns.mjs sabana 14 123 report-14.json topological
node tools/experiments/compare-enclosure-defense-campaigns.mjs sabana 30 123 report-30.json topological
```

| Horizon | Result at horizon | Raids verified | Crops alive | Cash | Paid walls | Paid wall cost | Wall hits | Crop raid losses | Elapsed wall time |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 14 | Active | 14/14 | 143 | 984 | 43 | 430 | 196 | 0 | 96.2 s |
| 30 | Active | 30/30 | 138 | 1,010 | 84 | 840 | 714 | 346 | 347.4 s |

All first 14 nightly serialized-state hashes match between the 14- and
30-night requests. The shorter horizon cannot establish a victory: substantial
agricultural losses begin after night 14, followed by real replanting and
recovery. The reports include each nightly hash, decision and `Game.tick` time,
raid losses and wall hits, plus all paid enclosure and repair decisions.

The unfenced active-farm test now ends after 19 completed nights when its sole
work center is ruined during night 20; it retains 127 coins. Its `diversifyDay`
20 variant follows the same path because it never meets the capital condition
for diversification. The previous duplicate 100-night victory assertions were
therefore testing an obsolete strategy outcome, not the current spell,
navigation or ledger behavior. A separate 100-night defended run is required
before asserting a current-version victory.

## Route rejection and the former night-45 stall

The earlier 100-night attempt stopped on night 45 because a buffalo repeatedly
received a route across a diagonal wall edge. The discrete graph accepted its
two grid endpoints, but the continuous movement check rejected a fractional
landing between the old 0.2 m samples. That was a technical navigation loop,
not an economic or military defeat. Wild Engine now checks oriented wall
segments continuously and lets the movement layer reject a directed grid edge
for its movement profile when a static step still fails.

The frozen night-45 state now routes the buffalo around the wall near x=115
instead of through the rejected edge near x=109. A fresh Sabana/123 campaign
with the same military pressure, player policy and native intentions completed
46/46 verified raids without an unfinished-incursion guard. It remained active
with 135 crops and 990 coins; night 45 itself took 8.86 s of `Game.tick`.
The full 46-night run took 575.9 s wall time, including 442.6 s of `Game.tick`
and 105.0 s of player decisions. Its engine binary SHA-256 is
`674bdf018817e1fa75e5181525faa3f516b90b9072af844fdc08e64fdcbf6b9c`.
The complete per-night evidence is in
[`sabana123-topological-46-route-rejection.json`](sabana123-topological-46-route-rejection.json).
It is a new physical trajectory and its hashes need not match the earlier
14/30-night reports. It does not establish a 100-night victory.

The regression suite passed 4,464 tests, with 60 skipped, and the production
web build completed. Directed tests cover wall intersections missed by grid
sampling, native alternative routes for a worker and a buffalo, and movement
reporting of a rejected static landing.
