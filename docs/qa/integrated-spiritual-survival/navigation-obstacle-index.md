# Navigation obstacle broad phase — experimental branch

The native `Navigation.coarseSegmentClear` previously scanned every live
building and wall for each swept segment. A 16 m grid now selects nearby
obstacles first; it keeps their original order and still runs the original
exact wall, gate, building, terrain, prop and fluid checks. Gates remain global
candidates because their moving panels do not have fixed bounds. A proposed
building with a different obstacle array falls back to the full scan.

`tools/bench-navigation-obstacle-index.mjs` measures 2,000 deterministic
native segment checks, with AB/BA order and the same collision outcomes:

| Wall count | Full scan, two runs | Indexed, two runs | Blocked segments |
|---:|---:|---:|---:|
| 100 | 65.7 / 58.5 ms | 44.8 / 43.6 ms | 35 |
| 250 | 588.7 / 361.9 ms | 151.4 / 159.3 ms | 552 |
| 600 | 844.7 / 831.8 ms | 158.7 / 147.2 ms | 1,496 |
| 1,000 | 1,262.8 / 1,584.1 ms | 250.9 / 246.7 ms | 1,496 |

These are CPU-only synthetic segment checks, not frame-rate measurements.
The 240-segment indexed/full native comparison includes diagonal walls,
gates, actor radii, long segments and worker/animal clearance. The day-13
seed-123 checkpoint replay also produced the same serialized final state
with and without the index (`day13-v150-native-cache-baseline-t192.json.gz` and
`day13-v153-spatial-obstacles-t192.json.gz`). Its approximately 83 obstacles
did **not** show a clear timing gain: other navigation work dominates that
particular spike. A continuous native pilot is still required before treating
this as a generally accepted performance change.

The abandoned incremental task-routing pilots are retained separately as
negative evidence. In `pilot-v147-fair-incremental-routing`, deliveries fell
to zero on days 11–12; `pilot-v149-assigned-route-only` also lost productivity
and ended at a harness entry-preparation deadline. Neither is a game defeat
or a valid 100-night balance result. Both routing experiments were reverted.
