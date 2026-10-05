# Reachable fallback beside the farm

The recorded desert case previously spawned the complete group at x=-19.2,
despite the paid centre being at x=95. Every animal spent its first update
searching for an unreachable target and then retreated. The unchanged reference
also incurred several seconds of failed searches; see `first-routes.md`.

When the original camera entry fails, entry selection now tries sixteen headings
around the operational centre before searching the distant map edges. Each
heading uses the original candidate placement logic, native body/terrain
clearance, disjoint complete-group positions and clear retreat segments.
Candidates must have a direct native approach to a real eligible structure.
This additional fallback performs no A* searches and consumes no extra RNG.
It keeps the original camera entry when that succeeds, and retains boundary
fallbacks when no near-farm group fits. The existing preparation worker handles
the complete selection, with the same stale-result checks.

Six regression cases load the exact recorded native snapshot: each of the five
species separately and the complete five-species group. They require a physical
StructureHit on the paid centre after real Game ticks, reduced HP, no defeat,
valid retreat segments, disjoint birth positions and a save round trip. The
worker preparation must leave the game unchanged before spawning. All 292
selected entry, saved-raid, navigation, planning, movement and encounter tests
pass. Build and relative web-package validation pass.

`near-farm-first-routes-same-context.json` replays the same archived input as the
failure, with four alternating repetitions. Prepared spawn median is 0.170 ms;
first native tick median is 0.698 ms, maximum across its twenty updates 1.636 ms.
Reference spawn plus updates is 188.901 ms and prepared total is 3.526 ms.
The full serialized states match at every update between the current reference
and its worker preparation. The entries intentionally differ from the failed
historical implementation.

`near-farm-browser-desert.json/png` verifies the actual module worker,
production WorldScene, original models and native movement at medium quality.
Prepared spawn takes 0.8 ms; preparation takes 354.5 ms separately while rendering
continues. The first centre hit occurs after 77 steps of 0.05 seconds (3.85
simulated seconds), reducing HP from 600 to 580. The maximum recorded Game-tick
CPU duration during the approach/attack is 3.9 ms, median 0.2 ms. No fixture or
console errors occur; no extra GLB downloads or animal shader programs appear.
The first animal reserves the scene's single defensive target, so the other
four retreat according to the unchanged reservation rules.

The fresh browser post-spawn state matches the independent Node reference in
`near-farm-native-entry-comparison.json` (eight alternating repetitions).
`near-farm-native-first-routes.json` independently checks all twenty subsequent
complete states in four repetitions, with prepared first-update median 0.842 ms
and maximum update 2.038 ms.

This is a controlled five-species scene with a paid centre and no crops/workers;
its plan is specified explicitly. It is not a naturally played night, a populated
farm GPU/mobile frame-time test, or full campaign balance acceptance. Other
disconnected boundary fallbacks and dense-farm target selection remain to be
checked. The isolated hundred-night matrix uses c86e64b and cannot prove balance
of the new entry selection, which may allow attacks that previously retreated.

Reproduce the browser case:
`tests/browser/animal-preload.html?biome=desierto&timing=1&profile=1&prepare=1&motion=1`.
