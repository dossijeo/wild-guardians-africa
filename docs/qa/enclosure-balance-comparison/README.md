# Matched enclosure policies after PR #62

The comparison uses the same Wild Engine binary, biome, seed, opening,
economic rules, raid composition and native-intent settings. The only
requested difference is `defensePolicy: 'expanding'` versus `'topological'`.
The topological arm is the opt-in policy merged in PR #62, not the game's
default virtual player. Run:

```powershell
$env:WILD_ENGINE_SPATIAL_SERVICES_WASM=(Resolve-Path 'src/world/hierarchical-wasm/spatial-savanna.wasm').Path
node tools/experiments/compare-enclosure-defense-campaigns.mjs gran-canon 14 712 .cache/enclosure-defense-gran-canon-14-712.json
```

The original receipt, including source and WASM SHA-256, per-day cash,
living crops, destroyed crops, measured time, purchases, attack losses and
errors, is preserved in
[`gran-canon-712-14.json.gz`](gran-canon-712-14.json.gz).

| Policy | Observed horizon | Result | Wall modules purchased | Post-introduction crop losses |
| --- | ---: | --- | ---: | ---: |
| Expanding | Day 8 row | **Incomplete harness observation** during entry preparation for the next raid | Unavailable in the retained report | 41 on days 6–8 |
| Topological | Defeat after night 11; day 12 row | Genuine defeat | 40, bought in six complete quotes | 115 on days 6–12 |

The expanding arm hit `Entry preparation observation deadline; no restart
or fabricated simulated result`. It cannot be scored as a defeat or
compared at the intended 14-night horizon. Its first eight rows and the
topological arm's first eight rows are observations, but the policies already
produce different farms. The topological arm's raid evidence is `verified`
with no issues.

In the topological arm, the first 12-module enclosure was bought for 120
coins on day 3. Animals then struck its walls 21 times in night 6 and ruined
three modules. Later purchases added 6, 2, 1, 8 and 11 modules on days 8–12.
The bot did not repair ruined walls as a distinct priority; it only bought
new complete enclosure quotes when one certified. The damage escalated to
23, 11, 32, 14, 25 and 10 destroyed crops on nights 7–12. This is evidence
that the opt-in policy is **not yet competitive** as a balance reference,
despite the native planner's valid and affordable initial closure. These
losses must not be used to justify changing military pressure or wall costs
until the defense policy and the incomplete control arm are addressed.

The comparison is a functional campaign observation, not an isolated speed
benchmark. `Game.tick` varies with crop, wall and unit populations produced
by each policy. No production balance parameters were changed.
