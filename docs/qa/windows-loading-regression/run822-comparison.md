# Windows #822: positive reference and uncontrolled differences

Root rechecked the GitHub API: run38024049488 is workflow number822, source
`28b681f36b7a49ce6f89f4f5fd2307f9d96ffa93`, terminal success. Original reports
and logs remain in [pair-28b-native-ci-root](pair-28b-native-ci-root/README.md).

| Execution | Source | New Game readiness | Continue readiness | Initial smoke options |
| --- | --- | ---: | ---: | --- |
| #822 /38024049488 | 28b681f | 56,412.7 ms, pass | 68,192.8 ms, pass | trace ON, crop-pair overlap ON |
| 38027670851 | 7eaeacc | 90,100.9 ms, fail | skipped | trace OFF, overlap OFF |
| 38028855374 | main9d41 | 90,046.9 ms, fail | skipped | default smoke |

The successful Continue in822 used the default serial recipe and preserved all
21 simulation fields through300316.2ms of genuine hiding. Overlap therefore does
not, by itself, explain both positive results. The retained local same-EXE A/B/B/A
comparison also found no mean loading improvement from overlap; it used a
different Intel GPU, not the CI software renderer, and cannot decide CI causality.

Root inspected `git diff --name-only28b681f..7eaeacc`: runtime changes are only
the opt-in visual collector/plant bridge and native visual QA guards/assertions.
Rendering, asset files, App load path, world generation, simulation and workflow
source have no changes between those two commits. The differing dispatch inputs
are demonstrated in the full job logs:822 adds trace/overlap flags;7e adds neither.
Those visual flags were OFF in the failed7e execution. Main9d is a separate
unpartitioned baseline, not the same source as28b or7e.

822's existing context reports ANGLE Microsoft Basic Render Driver, with an
actual1028×720 world canvas. The later failures did not record renderer identity;
their1028×720 presentation snapshots do not prove identical GPU/software paths.
This is a hypothesis to investigate, not evidence that GPU choice caused failure.

There is another concrete uncontrolled variable: the New Game smoke sends only
`{action:'start',biome:'gran-canon',culture:'mapungubwe'}`. App calls
`Game.newGame({biome:selectedBiome,culture:selectedCulture})`; its default seed is
`Date.now()`. These source statements are present on28b,7e andmain9d. Thus New Game
runs do not generate the same seeded map, even with matching biome/culture.
The positive world report does not retain the seed and the failed reports do not
prove their resulting world. Do not silently assign seed712 to these CI starts:
that is the legal saved fixture used by the separate Continue/local tests.

Next controlled comparison must pin executable hashes, initial state/seed,
viewport/quality and requested options; retain renderer identity and separate
fresh-profile from warm reuse; and use one host for the paired observations.
Keep the90-second readiness gate and original failures. The live production025
and QA383 builds are separate acceptance checks, not a paired causal experiment
against822. No CI rerun was dispatched solely to replace the failed outcomes.
