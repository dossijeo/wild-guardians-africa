# First target routes remain expensive

`benchmark_raid_first_routes.mjs` replays the recorded native desert context
from `prepared-complete-browser-desert.json`. It compares the reference spawn
with the prepared spawn, then executes twenty actual Game ticks of 1/60 second.
Neither navigation, collision, RNG nor target selection is replaced. Every
complete serialized state at each step is identical across all eight runs.

`first-routes-desert.json` records four alternating repetitions:

| CPU measurement | Reference | Prepared entry |
| --- | ---: | ---: |
| Median spawn | 216.239 ms | 0.174 ms |
| Median first Game tick | 3629.748 ms | 3793.707 ms |
| Median spawn plus twenty ticks | 3850.102 ms | 3797.413 ms |

These measurements do not establish a meaningful total appearance/movement
improvement. The entry optimization removes its own work, but the first target
search already stalls the preceding reference for seconds. Background campaign
processes were active; absolute timings and differences are not GPU/mobile
benchmarks.

All five animals fail to find a reachable target and start retreating on their
first tick. They begin at the legal boundary entry x=-19.2, with z=-8,-4,0,4,8.
The paid work centre in the original snapshot is at x=95,z=0. This controlled
five-species context has no crops or workers and explicitly specifies its plan;
it is not a naturally played first night. Nevertheless, it exposes a native
boundary entry that does not produce an attack and costly failed approach
searches. The next work is to make the fallback entry reach the farm and reduce
those searches, retaining complete-group clearance and valid retreats.

The optimization is not considered a complete fix for first-incursion fluency.
The previous browser appearance evidence has no subsequent Game ticks, so its
0.9 ms spawn measurement must not be used to imply cheap target acquisition.

The subsequent near-farm entry correction resolves this recorded case and
verifies an actual centre hit. See [near-farm-entry.md](near-farm-entry.md).
This report remains the unchanged historical failure evidence.

Reproduce with a fresh output name:

```
node tools/benchmark_raid_first_routes.mjs docs/qa/raid-spawn-navigation/prepared-complete-browser-desert.json NEW_REPORT.json 4
```
