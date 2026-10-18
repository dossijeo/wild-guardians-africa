# Sabana/712 defended farm: current-main CPU baseline

This is a diagnosis of the JavaScript `Game.tick` implementation at
`4743dda8f553ac65184e3534a0ecb517143bbc22`, before the experimental
native intention planner. It is not a benchmark of that planner. The run used
Node 20.11.0, Sabana/Mapungubwe/712, strategy `good`, and completed 11 nights
with 140 living crops, 827 coins and an intact 600-HP center. Its first 11
daily game states match the separately retained 14-night control trace.

Reproduce the same workload with the checked-in campaign helper:

```sh
npm ci
mkdir -p .cache
node --cpu-prof --cpu-prof-dir=.cache --cpu-prof-name=active-farm-good11.cpuprofile tools/experiments/compare-active-farm-14-nights.mjs 11 good
```

The [captured CPU profile](main-4743dda8-good11.cpuprofile.gz) is gzip-compressed
from the 3,429,651-byte V8 `.cpuprofile`. Raw SHA-256:
`8b6f0ff6ddb3b0eab659cf55b5cfbedbe2ba952cc35063f940a0dbd657a82664`.
Compressed SHA-256:
`325e3359e180ea974ec45153cd185204c3e9ee15785c0cd995c54fb90819605d`.
Decompress it before opening in Chrome DevTools' Performance panel. The
snapshot contains 179,452 samples; 161,760 are under the primary
`Game.tick()` call tree. Inclusive samples below are nested, so rows must not
be added together.

| Call tree within `Game.tick()` | Inclusive samples | Share of tick samples |
| --- | ---: | ---: |
| `updateRaid()` | 85,812 | 53.1% |
| ↳ `targetFor()` | 68,924 | 42.6% |
| ↳ ↳ `regionConnected()` | 55,089 | 34.1% |
| ↳ ↳ `reachableApproach()` | 9,971 | 6.2% |
| `updateWorkers()` | 53,888 | 33.3% |
| ↳ `reserveAvailableTasks()` / `reserveTasks()` | 25,055 | 15.5% |
| ↳ ↳ `reachable()` | 24,688 | 15.3% |
| `consumeGrowthPower()` | 13,108 | 8.1% |

The dominant path is still repeated connectivity work during animal target
selection. Worker task assignment is the second large navigation consumer.
This is evidence to evaluate persistent intentions and event-triggered
replanning; it does not justify another per-target cache or a rule change.
The profile covers only one defended seed, 11 nights and the old selector.
The profiler increased the sum of `Game.tick` wall time from 134.84 s in the
unprofiled 11-night prefix to 175.35 s, so those times are not an A/B speed
comparison. No economic, damage or navigation rules were changed for this run.
