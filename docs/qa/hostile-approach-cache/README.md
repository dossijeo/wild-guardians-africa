# Native hostile approach failure working set — experimental

Historical first candidate `1f80db65`. The full-tick follow-up in
`full-tick-followup.md` supersedes its acceptance scope and implementation.

Branch: `codex/hostile-approach-failure-cache`, based on `ffa18f2e`.
This is a technical optimization candidate. No production integration, military
recalibration, policy change, or campaign restart uses it yet.

## Evidence and diagnosis

The host-clean normal campaign remains in a synchronous target-selection tick
on night 9. Its progress callback reports the last completed tick, not the live
clock. A brief read-only Node inspector capture found time 539.6414615068585,
276 live crops, 11 animals and the entering buffalo `animal-8559`, radius .97,
five remaining attacks. The 30-second CPU profile attributes most exclusive time
to `walkable`, `findPathSteps`, `searchNeighbors` and `segmentClear`, under
`updateRaid → targetFor → reachableApproach`. No live state was assigned, no
native actions were injected, and each debugger pause was resumed in finally.
Sampling overhead is not a consumer-performance measurement.

`normal-mid-query.json.gz` is that retained **mid-tick diagnostic state**, not a
complete campaign/policy checkpoint. It must not be used to resume a campaign.
Capture metadata and CPU profile are retained alongside it.

An independently reconstructed service query exhausted the ordinary reverse
search with 13,108 explored nodes. A margin-48 search exhausted 19,171 nodes and
provided a wider bounded-region witness. Neither proves global isolation:
both touched their corridor boundary. The existing native searched-region
logic can nevertheless reject contained corridors whose origin connectors
belong to the explored region and whose destination cannot connect to it.
Pop-limited, cancelled and successful searches never produce that witness.

Increasing the neighbor cache from 4,096 to 16,384 entries gave only a small
improvement on the first eight actual service angles, and is **not implemented**.
Initial artificial-angle probes around (93,0) were diagnostic drafts, not native
service points or acceptance evidence. The accepted reproducible fixture uses
actual crop coordinates and all 32 original approach angles.

## Candidate

After the first margin-32 failed approach to a given actor position/radius,
perform one margin-48 native search solely to warm existing exhaustive-region
certificates. Discard its route even if it succeeds. Return the original
failure, preserving current query bounds, waypoint selection and attack rules.
Subsequent original queries retain their direct segment check and existing
native certificate checks. No synthetic closed-region assertion is introduced.

Warming attempts are held in a WeakMap per navigator, invalidated by geometry
epoch or replaced native search, and capped at 128 exact destination/radius
keys. Other search margins are unchanged. The native region/cache caps remain
unchanged. Original campaigns' frozen source files are untouched.

Files: `src/world/approach-failure-warmth.js`, one hook in
`src/world/navigation.js`, tests and the isolated reproduction tool.

## Comparison

Node 20.11.0, shared host with both original campaigns still running. Four fresh
processes in chronological **B/A/A/B**, candidate B, baseline A:

| Run | 256 queries, seconds |
|---|---:|
| B1 | 2.296 |
| A1 | 15.112 |
| A2 | 14.448 |
| B2 | 2.297 |

Every result hash, crop ID and angle matches; all 256 queries were negative in
this fixture. State JSON stayed byte-identical in all four runs. The wider search
is included in candidate timings. These results support a substantial reduction
in this repeated negative-query workload, not a measured FPS gain or a complete
campaign speedup. End-of-run heap samples are retained but are **not peak RAM**.
Prototype B/A/A/B results from before implementation are also retained.

Reproduce from this worktree:

```sh
node tools/check-hostile-approach-witness.mjs baseline fresh-baseline.json
node tools/check-hostile-approach-witness.mjs candidate fresh-candidate.json
```

The baseline overrides only the approach wrapper with the original algorithm;
collision, terrain, A*, traversal, budgets and all other modules remain shared.
Output includes source and fixture hashes, every query and immutable-state check.

## Tests and remaining acceptance

72 tests pass, log `tests.txt`: helper bounds/epoch/radius/search identity,
successful-route preservation, discarded wider successes, native positive and
negative detours, cancellation without certification, neighbors, swept segments,
failure capacity, raid body radii/entry/approaches and gate animation invariance
across all 30 biome/culture combinations.

Still required before campaign adoption: full native target-selection comparison
on retained negative and reachable scenes; source-frozen campaign family review;
matching daily prefixes and raid/event outcomes; calibration runs using the
qualified source; worst synchronous call and memory assessment. The extra search
adds work to the first failed query and must not be declared mobile-safe solely
from aggregate speedup. Do not merge into main from this evidence alone.

Economy, wages, crop HP, magic, military quantities/damage/radii, reservations,
RNG and virtual-player policies are unchanged.
