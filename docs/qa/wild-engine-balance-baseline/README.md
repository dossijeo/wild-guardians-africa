# Balance reference after Wild Engine PR #53

The tree used for this run was byte-identical to merged `main` at
`1371e9b6072cb7237e77e81f54107739dba58b96` (`git diff --exit-code
HEAD origin/main` returned no differences before the run). The campaign
runner recorded its source parent `64c399615aef32896397716a4ee0d6c97b5b33f6`.
The WASM SHA-256 was
`ed1291d12010ec95e101212427010274ff9eb8c9a244f695ab4f7ed11c9b0cb5`.
No balance, strategy, combat or economy parameter was changed for this run.

The reproducible request was 30 nights, Sabana, seed 712, `good` policy,
native intentions, spatial advice and event-driven expanding defense:

```powershell
$env:WILD_ENGINE_SPATIAL_ADVICE='1'
$env:WILD_ENGINE_DEFENSE_GATE='event'
$env:WILD_ENGINE_DEFENSE_POLICY='expanding'
$env:WILD_ENGINE_DECISION_PROFILE='1'
node tools/experiments/run-native-intent-campaign.mjs 30 sabana 712 good docs/qa/wild-engine-balance-baseline/sabana712-good-30.json intent
```

The [full report](sabana712-good-30.json.gz) contains the source hashes,
parameters, daily state hashes, finance, timing, native-intent counters and
raid observations. It completed **20 nights**, then recorded a real economic
defeat at day-21 dawn. The last center was still operational; zero crops and
22 coins remained. The raid observer verified all 20 raids with no issues or
lost coverage. Therefore the requested 30-night horizon was **not reached**,
and this is neither a 30-night success nor evidence of a Wild Engine fault.

| Night | Living crops | Coins | Wall spending | Crops destroyed that night |
| ---: | ---: | ---: | ---: | ---: |
| 6 | 95 | 856 | 0 | 0 |
| 10 | 65 | 1,051 | 0 | 31 |
| 11 | 56 | 545 | 490 | 29 |
| 15 | 15 | 419 | 0 | 36 |
| 18 | 0 | 95 | 0 | 6 |
| 20 | 0 | 22 | 0 | 0 |

The policy spent 370 coins on walls on day 4 and another 490 on day 11.
Spending does not establish that the crops were physically enclosed. This
single seed points to a balance or management-policy question: agricultural
losses exhausted the farm despite an intact center and some defensive
investment. It does not isolate which factor caused the collapse. Compare
other strategies and seeds on this exact integrated engine before changing
damage, pressure or economy. Total runner time was 256.76 s, of which
`Game.tick` accounted for 195.74 s and bot decisions 30.53 s; these are
one-run measurements, not a comparative speed claim.

A [matched wall-spending control](matched-wall-control.md) now compares this
`good` policy with the same hiring, center repairs, cash rules and expansion
but no wall purchases. In Sabana/712 it lost after night 16 instead of night
20; this is one-seed policy evidence, not a cross-biome balance conclusion.
