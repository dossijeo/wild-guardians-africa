# Prepare native raid entries before appearance

Production WorldScene now owns one module worker for the entry search of a
planned night raid. After the native night plan exists, it sends a copied
navigation snapshot, native biome profile, actual camera view, active bounds
and planned species. The worker runs the same camera and boundary search as
the synchronous implementation. It does not create actors, pause or advance
the game. Preparing the preferred boundary side advances only its private RNG
copy; the real spawn still consumes its original draw and hit-budget draws.

Replies are accepted and rechecked at spawn against the original world,
navigation epoch, operational structure states, RNG, camera, bounds and group.
Camera motion, building changes, a collapse, a different group or an intervening
random decision invalidates the reply. One request can be outstanding at a time.
Unavailable/failed workers or results that are not ready retain synchronous
correctness. Leaving the world terminates the worker and removes its hook.
Daytime raids retain their existing synchronous path because their group is
decided at their actual trigger.

Native differential tests compare the complete serialized post-spawn game
state, including RNG, original positions/exits and hit budgets, in all six
biomes. They also check late replies, stale inputs both on receipt and at
spawn, bounded outstanding requests, disposal, unavailable workers and the
original boundary fallback when the camera cannot define an entry. The 58
selected preparation, navigation, saved-raid and model-preload tests pass.

The first candidate prepared only the camera search. It retained about 50 ms
of boundary work in the Node comparison and 65.1 ms in the native desert
browser. `prepared-camera-only-comparison.json` and `prepared-browser-desert.*`
preserve that partial result. The final implementation prepares both searches.

| Alternating native replay, 8 repetitions | Reference median spawn CPU | Prepared median spawn CPU |
| --- | ---: | ---: |
| Original archived desert context | 331.013 ms | 0.183 ms |
| Fresh native-browser desert context | 217.141 ms | 0.152 ms |

The comparisons exclude the preparation cost, recorded separately in each
row. All sixteen complete post-states in each comparison have one identical
SHA-256. The fresh browser's captured post-state also matches its Node
reference exactly. Inputs, source hashes and measurements are archived in
`prepared-complete-comparison.json` and
`prepared-complete-native-comparison.json`.

`prepared-complete-browser-desert.json/png` records the actual module worker,
production WorldScene and five original rigs at medium quality. The prepared
result is used once; the spawn takes 0.9 ms with zero main-thread path,
segment, terrain or prop queries. Preparation took 508.2 ms of wall time
while rendering continued. GLB download counts stay at seven, no new animal
shader programs appear, all five rigs are present, and no fixture or console
errors occur. The timing's pre-spawn stats correctly show used=0; its separate
post-spawn `used` field is one.

This controlled appearance fixture defines the five-species plan explicitly;
it is not a naturally played night. RAF samples include browser scheduling
and background campaign load. The result proves removal of the entry search
from this appearance step, not total GPU frametime, physical-phone fluency,
unchanged CPU contention, or cost of the subsequent first target routes.
Those movement and mobile checks remain pending. If the player moves the
camera immediately before spawning, the synchronous fallback can still stall.

The subsequent native Game-tick check now confirms a seconds-long first target
search in both the preceding reference and prepared route, with all five animals
retreating without a reachable target in this desert context. See
[first-routes.md](first-routes.md). The appearance-only result does not resolve
that remaining navigation/entry problem.

Build and relative web-package checks pass. The module worker is emitted as a
separate 67 KiB asset with the normal relative Vite URL. The isolated hundred-
night matrix remains on c86e64b; these comparisons establish targeted entry
equivalence, not completion of that matrix or a fresh campaign on this change.

Reproduce the browser diagnostic with
`tests/browser/animal-preload.html?biome=desierto&timing=1&profile=1&prepare=1`,
then compare its archived report:

```
node tools/benchmark_prepared_raid_entry.mjs INPUT.json NEW_REPORT.json 8
```
