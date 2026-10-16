# One physical wall quote per paid defense stroke

The event-driven virtual-player defense policy used to call
`Game.quoteWallChain()` and then `Game.previewWallChain()` for the same
affordable stroke. `previewWallChain()` calls `quoteWallChain()` internally,
so worker access, automatic doors, collision and sector geometry were
computed twice. The policy now uses the read-only prepared plan returned by
the first quote. It checks the protected cash reserve against that plan and
passes the same prepared plan to `Game.buildWallChain()`, which still checks
its revisions, available cash and purchase permissions before committing.
This changes only the experimental bot's planning work, not wall prices,
placements, gameplay rules or the production default.

The frozen comparison used one continuous Sabana/712 `good` campaign for 14
nights with native intentions, spatial advice, the event-driven expanding
defense policy and decision profiling enabled. Both reports record the same
base source commit `542ea29e948d8ae02874b57d797b7e456555eef9` and WASM
SHA-256 `d757c2197f98fded1cb42b7759154f1bd95a532504da9539c2e8ade17a9f47b6`.
The only source change between the runs was the policy file: Git blob
`3ad1ede7055731692a76d7887d72dc95a6d51d2b` before and
`226ff596d485e0bbd270b9be7e8a552a85dd9253` after. Each report is
gzip-compressed losslessly and includes per-night hashes, timings, finance,
raid evidence, intentions and purchases.

| Measure | Two quotes | One quote |
| --- | ---: | ---: |
| Completed nights | 14 | 14 |
| Verified raids / issues | 14 / 0 | 14 / 0 |
| Elapsed runner time | 231.46 s | 216.63 s |
| Accumulated `Game.tick` | 151.10 s | 151.82 s |
| Accumulated bot decisions | 60.61 s | 44.55 s |
| Day-11 bot decisions | 25.99 s | 14.34 s |
| Day-11 duplicate preview | 11.59 s | 0 s |
| Final live crops / coins | 82 / 484 | 82 / 484 |

All 14 daily serialized-state hashes and the final hash matched exactly.
Both runs bought 37 pieces for 370 coins on day four and 49 pieces for 490
coins on day eleven. The 14.83-second elapsed difference is one paired
measurement, not a cross-biome speed claim. The `Game.tick` variation is
timing noise on an otherwise identical simulation, not a movement change.

Reproduce either run with:

```powershell
$env:WILD_ENGINE_SPATIAL_ADVICE='1'
$env:WILD_ENGINE_DEFENSE_GATE='event'
$env:WILD_ENGINE_DEFENSE_POLICY='expanding'
$env:WILD_ENGINE_DECISION_PROFILE='1'
node tools/experiments/run-native-intent-campaign.mjs 14 sabana 712 good <report.json> intent
```

The two raw reports are `sabana14-event-defense-latest.json.gz` (before) and
`sabana14-event-defense-single-quote.json.gz` (after). The uncompressed
SHA-256 values are respectively
`e57d1206933853c7b09cf705894fe6df069c0e4f39c505e5cc745abf4e798d54`
and `74ce9bbe7e347982751f4ea281989760ffb59271e6bc30bb281eeb61872b30fc`.
The focused defense-policy tests pass 5/5, `test:playable` passes 196/196,
and the web build passes. This does not close the larger native-intent
acceptance gaps or justify merging the stacked algorithm PR #54 now.
