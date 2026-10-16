# Sustained native-intent and event-driven defense check: Manglares/712

On source `a3392cd4a876bb820738dc98662a5a348019db61` and WASM SHA-256
`d757c2197f98fded1cb42b7759154f1bd95a532504da9539c2e8ade17a9f47b6`,
the continuous `good` virtual player completed 14 requested Manglares/712
nights. Native worker and animal intentions, spatial advice, the expanding
paid-wall policy, its event gate and decision profiling were enabled. All
14 raid observations were verified with zero reported issues. At the day-15
dawn, the farm had 131 live crops, 797 coins and one operational center;
the game had neither won nor lost.

| Measure | Observed |
| --- | ---: |
| Elapsed runner time | 523.79 s |
| Accumulated `Game.tick` | 303.61 s |
| Accumulated virtual-player decisions | 193.90 s |
| Wall spending | 96 pieces / 960 coins |
| Native spatial sync | 1,507 confirmed event batches / 33.19 s |
| Native worker `planIfNeeded` | 11,498 calls / 48.06 s |
| Native `flushWorldEvents` | 48,672 calls / 52.06 s |

The apparent decision spike is concentrated in day ten: its bot decisions
took 149.7 s, of which **two necessary `quoteWallChain` calls took 147.53 s**.
The duplicate `previewWallChain` call eliminated by the preceding change
was absent. The policy bought 56 new pieces for 560 coins that day. The
quote profile does not yet separate automatic-door checks, topology
mutation, recursive shortening or other inner work; attributing its cost
to one of those mechanisms without a narrower profile would be speculative.
Day twelve also spent 108 s in `Game.tick`, while bot decisions were about
four seconds, so the wall quote is not the only sustained-performance issue.

This is a technical stability and profiling result, not a comparison against
the legacy bot or an endorsement of balance. There is no matched 14-night
control on this exact source and configuration. The complete day-by-day
report is `manglares14-event-defense-latest.json.gz`; its uncompressed
SHA-256 is
`bb59ccf675b76d8b794665ede481012092858a67e94b5b087509391546c668c1`.

Reproduce with:

```powershell
$env:WILD_ENGINE_SPATIAL_ADVICE='1'
$env:WILD_ENGINE_DEFENSE_GATE='event'
$env:WILD_ENGINE_DEFENSE_POLICY='expanding'
$env:WILD_ENGINE_DECISION_PROFILE='1'
node tools/experiments/run-native-intent-campaign.mjs 14 manglares 712 good <report.json> intent
```

The next focused investigation should capture a pre-purchase day-ten state
and profile one full quote without changing its physical result. Day-twelve
`Game.tick` needs a separate sample. Neither this result nor the paired
Sabana quote result justifies enabling native intentions by default or
merging the stacked algorithm PR #54 independently of the planner.
