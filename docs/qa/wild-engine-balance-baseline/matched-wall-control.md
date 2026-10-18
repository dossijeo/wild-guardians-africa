# Matched wall-spending control on integrated Wild Engine

The existing `no-walls` strategy changes cash policy, center repairs and
village expansion as well as wall construction. It cannot isolate the effect
of defensive spending relative to `good`. The campaign runner now accepts
`wallSpendingEnabled` (CLI: `WILD_ENGINE_WALL_SPENDING=0` or `1`). When false,
the selected strategy still controls hiring, seed purchases, center repairs,
cash reserves and village expansion; only its wall-building and wall-repair
policy is disabled. This is an experimental virtual-player choice. It does
not alter game prices, animal attacks, damage, economy or Wild Engine's
physical rules.

## Reproduction

These continuous Sabana/712 campaigns used `good`, native intentions, native
spatial advice and event-driven expanding defense. The source field in the
reports names base commit `3db3904430cad2d4e24c3647d931b94af2bcf8d0`;
the runner was modified in the worktree before measurement. The reports also
record the SHA-256 of that exact runner, game, raids and WASM input. Both
30-night requests used identical input hashes and differed only in
`wallSpendingEnabled`. They ran sequentially, with the short runs in
wall/no-wall order and the long runs in no-wall/wall order.

```powershell
$env:WILD_ENGINE_SPATIAL_ADVICE='1'
$env:WILD_ENGINE_DEFENSE_GATE='event'
$env:WILD_ENGINE_DEFENSE_POLICY='expanding'
$env:WILD_ENGINE_DECISION_PROFILE='1'
$env:WILD_ENGINE_WALL_SPENDING='1' # repeat with '0'
node tools/experiments/run-native-intent-campaign.mjs 30 sabana 712 good docs/qa/wild-engine-balance-baseline/sabana712-good-wall-matched-30.json intent
```

Full reports: [with wall spending](sabana712-good-wall-matched-30.json.gz),
[without wall spending](sabana712-good-no-wall-matched-30.json.gz).
The independent [14-night wall](sabana712-good-wall-matched-14.json.gz) and
[14-night no-wall](sabana712-good-no-wall-matched-14.json.gz) runs reproduce
all 14 daily state hashes of their respective 30-night runs. The wall run
also reproduces all 20 daily hashes of the earlier integrated-engine
baseline despite the later native retreat-lease fix.

| Completed night | Wall: living / coins / lost that night | No wall: living / coins / lost that night |
| ---: | ---: | ---: |
| 5 | 87 / 762 / 0 | 117 / 794 / 0 |
| 6 | 95 / 856 / 0 | 100 / 946 / 25 |
| 8 | 130 / 851 / 13 | 115 / 813 / 39 |
| 10 | 65 / 1,051 / 31 | 82 / 737 / 57 |
| 12 | 55 / 463 / 29 | 49 / 606 / 50 |
| 14 | 51 / 370 / 18 | 16 / 347 / 49 |
| 16 | 12 / 253 / 23 | 0 / 157 / 22 |

Through night 14, cumulative crop destruction was 162 with wall spending
and 400 without it. The defended policy bought 86 wall pieces for 860 coins;
the ablation bought none. Both survived night 14. The no-wall farm lost after
night 16 when its final center fell. The defended farm lost after night 20
with an operational center but no crops and insufficient cash to sustain the
next day. The requested 30-night horizon was not reached in either run. Raid
observers verified all 16 and 20 raids respectively, with zero issues and
no coverage loss.

These results support wall investment under this particular seed and policy:
the no-wall option initially grew more crops, then suffered greater losses
once the post-introduction pressure began on night 6. That larger farm also
changed attraction and the later workload, so this compares two complete
legal policy trajectories, not the isolated blocking power of one wall.
Neither farm won 100 nights, and one seed cannot establish balance across
biomes or the Pareto frontier. Total `Game.tick` time was 185.42 s with walls
and 89.58 s without, over different campaign lengths and entity populations;
these are descriptive measurements, not a navigation speed comparison.

The runner option defaults to enabled, so ordinary `good` campaigns keep
their previous behavior. Center repair remains enabled in the no-wall
control; the existing named `no-walls` policy remains unchanged for historical
comparisons.
