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
