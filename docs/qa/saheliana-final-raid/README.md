# Sahelian final-raid subcell exit

## Original evidence and negative

The immutable original snapshot and CI receipts are in `../campaign-ci/current-3324d17d-terminals/desierto-saheliana-37876748172/`. Run 37876748172/job 113646986727 used source 3324d17dd2305ea8595aea311c518cc6db2404ad. Uncompressed snapshot SHA256: da68eb2a2c4904c0681537946500368964f451b5a3ca307c0fc7d5b96ac59d73.

Day100/completed99, warthog animal-509118, radius1.1, retreating/hits0, original exit (81.22902044431812,14.372321712700312). The PR15/current runtime replay remained stationary for300 simulated seconds despite every worker returning home. `original-current-negative.json` preserves this negative without resetting results, actors or the raid. Traffic is not established as the cause.

The ordinary and actor-anchored0.5m lattice miss a physically open passage west of the center. At z=-3 the native full-radius legal center range is approximately x75.725..75.925; lattice positions75.706 and76.206 miss it. Real offset polygon corners give seven swept-clear legs (`physical-corner-route.json`), preserving the1.1m radius. No corridor or collision threshold is relaxed.

## Bounded recovery

Only a retreating animal whose unchanged192 connector and4096-node fine lattice have exhausted may enter this fallback. It derives proposals from actual center/house footprint corners, offset by radius+0.025m. Native point and swept-segment checks, fluids, terrain, props and live solids remain authoritative. Actual motion still uses the existing body collision and strict landing pipeline.

Bounds: four selected footprints (3..128 vertices each),96 total graph nodes,16 obstacles scanned per call, eight native point/edge/verification queries per call, at most9120 directed graph proposals plus96 point checks and95 final verification legs. Corner displacement is capped at four offset radii and coordinates at64m from the origin. Search failures are memoized by actor origin/destination/radius, navigation identity/version, obstacle array/count, provider identities and selected footprint geometry. Moving bodies are not included in this static graph or its failure proof: ordinary body checks run during every actual motion. No body obstruction is cached as an impossible static route.

The private WeakMap frontier adds no persisted state or save version. Reload reconstructs a bounded attempt; existing serialized fine-frontier validation remains unchanged. Replacing/editing selected footprints or changing topology/provider epochs invalidates the attempt. Successful paths are rechecked over native swept segments before returning.

## Native results and tests

Candidate on parent663c2063: original snapshot closes the raid naturally after18.1 simulated seconds at dt0.1, reaches the original exit, day101/completed100/victory. `candidate-native.json` contains the actual trace. Ledger and zero remaining hits are untouched. This is recovery of the original terminal state, not a new100-night campaign completion claim.

14 new tests pass: synthetic full-radius subcell route, eight-query bound, ordinary-state exclusion, genuinely too-small gap, fluid/steep rejection, failure memo and in-place geometry invalidation and a new real wall ring; plus original snapshot dt0.05/0.1/1, with and without partial save/reload. Tests check normal speed, native footprint and swept legs, original exit, unchanged money and native victory.89 existing regressions pass (Saheliana25/28, corrupt snapshots, legacy slope recovery, Desert Musgum69/Etiope73/Suajili71, physical body avoidance, worker return and navigation). Total103 tests. Vite production build passed in7.91s (existing large-bundle warning).

Reproduce new coverage: `node --test tests/animal-footprint-connectors.test.js tests/raid-saheliana-final-exit.test.js`.

## CPU evidence and limitation

`helper-cold.json`: real snapshot, fresh navigation,102 helper calls,804 native queries, max8 per call, CPU p95=1.43ms, max=30.91ms, summed72.91ms. This is a cold single-run diagnostic, not ABBA or a GPU benchmark. Full first candidate tick396.48ms includes cold snapshot/game/navigation initializers; complete replay wall1.36s. No sustained frame-time improvement is claimed. The explicit work-unit bounds do not promise a strict millisecond deadline for a native query. No GPU benchmark or100-night campaign was rerun.
