# Enclosure policies after PR #62

The paired campaign uses Wild Engine, Gran Cañón/712, the same code and
binary, ordinary economic and combat rules, native intents and a fixed
virtual-player strategy. Only `defensePolicy` differs. The topological arm
is the opt-in policy merged in PR #62, not the game's default bot.

## Corrected native comparison

The first attempt exposed two headless-driver mistakes. It created the
legacy JavaScript terrain-entry worker for a Wild Engine world. That worker
received `profile: undefined`, threw during canyon terrain generation, and
the preparer hid the error until the 30-second observation deadline. With
the legacy worker removed, day 9 remained pending because the initial 3×3
region was still resident even though the camera required 5×5 chunks. The
runner had compared only the camera pose, which already matched, and never
expanded the region.

On the frozen day-9 state, the native selector found **zero** complete
entries with nine resident chunks and all **14** animals with the correct
25 chunks. Seed, group, structures and RNG were unchanged. The frozen state
and diagnostic are retained as
[`day9-partial-state.json.gz`](day9-partial-state.json.gz) and
[`day9-navdebug.json.gz`](day9-navdebug.json.gz). The probe is reproducible:

```powershell
$env:WILD_ENGINE_SPATIAL_SERVICES_WASM=(Resolve-Path 'src/world/hierarchical-wasm/spatial-savanna.wasm').Path
python -c "import gzip,pathlib; p=pathlib.Path('docs/qa/enclosure-balance-comparison/day9-navdebug.json.gz'); pathlib.Path('.cache/day9-navdebug.json').write_bytes(gzip.decompress(p.read_bytes()))"
node tools/experiments/probe-spatial-pending-entry.mjs docs/qa/enclosure-balance-comparison/day9-partial-state.json.gz .cache/day9-navdebug.json
```

The former JavaScript-worker failure is also reproducible from those saved
artifacts. This command intentionally exits with an error containing
`Cannot read properties of undefined (reading 'bounds')`:

```powershell
node tools/experiments/replay-frozen-raid-entry.mjs docs/qa/enclosure-balance-comparison/day9-partial-state.json.gz docs/qa/enclosure-balance-comparison/day9-navdebug.json.gz
```

The runner now enlarges the resident bounds when needed even if the camera
pose matches, while retaining bounds already widened for an active entry.
Wild Engine uses native synchronous selection rather than starting a legacy
worker. Legacy worker errors surface immediately. Directed entry,
preparation and native raid tests passed, including the frozen-state
bounds regression.

Both corrected runs have verified raid evidence with zero issues. Their
complete receipts are
[`expanding-fullbounds.json.gz`](expanding-fullbounds.json.gz) and
[`topological-fullbounds.json.gz`](topological-fullbounds.json.gz).

| Policy | Completed nights | Result | Wall spend | Crop losses, nights 6–11 | Final cash / living crops |
| --- | ---: | --- | ---: | ---: | ---: |
| Expanding | 10 | Defeat in night 11 | 340 coins, 34 modules; 17 repair requests | 71 | 73 / 0 |
| Topological | 10 | Defeat in night 11 | 270 coins, 27 modules; no repair priority | 121 | 247 / 7 |

Both final raids ruined the operational center. The topological arm spent
less and retained more cash, but lost substantially more crops. Neither
completed 14 nights. One seed and two different farm trajectories do not
establish a balance recommendation or isolated speedup. No military pressure,
wall prices, damage or physical rules were changed.

To repeat the pair, run:

```powershell
node tools/experiments/compare-enclosure-defense-campaigns.mjs gran-canon 14 712 .cache/enclosure-defense-current.json
```

## Preserved first attempt

The original attempt is preserved in
[`gran-canon-712-14.json.gz`](gran-canon-712-14.json.gz) with source/WASM
hashes and error details. Its expanding arm stopped at the day-9 entry
observation deadline after eight daily rows; **that is incomplete harness
evidence, not a defeat**. Its topological arm suffered a real defeat after
11 completed nights, having bought 40 modules and lost 115 crops on nights
6–12. Because the control was incomplete and resident terrain differed,
those arms cannot rank the policies. The corrected pair above supersedes
them for the current comparison. The opt-in topological policy still lacks
a distinct priority for repairing breached walls.
