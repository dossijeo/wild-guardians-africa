# First-day Canyon transport diagnostic

Root ran the existing `tools/diagnose_canyon_opening.mjs` on main
`53a4a996b7523f7d2d91f450aa9de6c3f9f05227`, Node 20, seed 712. The command
completed with exit 0. No balances, terrain, routes, worker speeds, task order,
planting policy or crop parameters were overridden. These are three ordinary
one-day domain runs, not rendered gameplay or hundred-night campaigns.

| Case | First paid delivery (simulated seconds) | Planted during recorded day | Paid deliveries | Mean sampled route/direct ratio |
| --- | ---: | ---: | ---: | ---: |
| Canyon / Mapungubwe | 193 | 90 | 26 | 1.084 |
| Canyon / Sahelian | 234 | 73 | 17 | 1.286 |
| Savanna / Mapungubwe | 175 | 111 | 36 | 1.047 |

All three hire six older female workers under the same responsible policy.
The sampled Sahelian Canyon watering routes total 667.38 m against 405.88 m
of straight-line distance; the longest sampled ratio is 3.414. Straight lines
are a reference, not proven traversable alternatives. Terrain, buildings and
body clearance must still be respected. The mean weights each sampled route
equally; it is not total travel efficiency or a CPU/GPU benchmark.

This supports inspecting daytime transport before changing income. It does
not establish the cause of the archived hundred-night inactivity failure,
prove that any detour is erroneous, or justify cutting through obstacles.
Arrival, task and carrying phase measurements remain in the original reports.

The four JSON originals are losslessly gzip archived; `receipt.json` records
their uncompressed sizes and SHA-256. The source receipt was captured **after**
the run at the same HEAD with no tracked source changes; it is explicitly not
a pre-run provenance receipt. Each report independently records navigation.js
SHA-256. Reproduce with:

```text
node tools/diagnose_canyon_opening.mjs OUTPUT_DIRECTORY
```
