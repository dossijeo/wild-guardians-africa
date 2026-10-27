# What the recovery timer calls a stalled route

The production recovery timer uses improvement in **straight-line distance to the final destination**. That is not the distance remaining on a bent native route. This observer-only experiment samples the current route and worker positions before recovery events in the same uninterrupted Sabana/Mapungubwe/712 native-intent campaign. It changes no movement or game state. The full state SHA-256 remained the baseline `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05`; deliveries, coins and living crops remained 1,317 / 899 / 145.

Set `WG_WORKER_ROUTE_PROGRESS_DETAIL=1` when running `probe-worker-overlaps.mjs`, then analyze the report:

```powershell
$env:WG_WORKER_ROUTE_PROGRESS_DETAIL='1'
$env:WG_WORKER_PROBE_OUTPUT='test-results/worker-route-progress-14.json'
node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe wild-engine
node tools/experiments/analyze-worker-route-progress.mjs test-results/worker-route-progress-14.json
```

| Recovery group | Count | Moved >0.75 m in sampled window | Remaining route fell >0.75 m |
| --- | ---: | ---: | ---: |
| All destination-stall recoveries | 141 | 121 | 119 |
| Destination-stall recoveries linked to late worker overlaps | 31 | 31 | 31 |

One returning worker (`worker-1756`) moved 6.58 m during a ten-second window while its remaining route shortened 7.27 m. Its direct distance to the village **increased** 1.92 m because the route bent around an obstacle. Nevertheless the destination-stall timer triggered mobile phasing at elapsed time 2142.1. This is a concrete counterexample to treating lack of direct-distance progress as lack of route progress.

The campaign callback samples roughly every five simulated seconds, not every internal movement step. A shorter recorded route can also reflect a route replacement or shortcut; these figures alone cannot certify every segment traversed, and they are not a benchmark. The mobile recovery itself remains physically unsafe for the 43 late overlap pair-ticks. The next production candidate should use progress along the *validated current route*, preserve a bounded escape for genuine stationary or circling actors, and compare the whole campaign rather than only suppressing the recovery event.
