# Recorded Saheliana night-28 retreat

Run [37870712064](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37870712064), frozen `7bcd0ad339931c249b849bbbd9e013d112022323`, failed with a buffalo at (86.930231, -7.473057), zero hits, and its original exit at (87.777140, 13.536241). The original complete snapshot, status, process output and job identity are preserved as gzip with raw SHA-256 receipts. The failed campaign remains failed; no strategy, seed, deadline or balance parameters were changed, and no 100-night rerun was performed here.

The integer grid and all 192 direct two-leg candidates failed. Testing those clear candidates against the native A* also failed. The snapshot has no historical approach trajectory, so reversing an invented path would not be faithful. A fractional lattice can describe the physically open winding passage around the settlement. A cold synchronous experiment needed 540 expansions (~91 ms); production distributes that work rather than running it in one tick.

## Change

After normal routing and the existing fast two-leg connector fail, a rare fallback searches an actor-anchored 0.5 m lattice. Each call pops at most eight frontier entries. Every edge and the final exit connector use the original `Navigation.walkable` / `segmentClear` with the unchanged radius and animal fluid rules. This does not change the grid, terrain, collision geometry, water/lava policy, movement speed, dynamic body avoidance or raid deadline. Grand Canyon therefore retains its existing water exception; other biomes retain their normal fluid restrictions.

A stable binary heap and costs/parents live in the optional connector state. They resume exactly after saving. This is only temporary state for a stalled retreat, not a permanent world navigation structure. Search restarts when its existing geometry/position/exit/radius key changes and is deleted on success. Limits: 4,096 pops, 4,096 distinct nodes, 4,096 simultaneous heap entries, 32,769 total heap insertions, and +/-64 m from the origin. A limit is a technical failure, never evidence that terrain is physically enclosed. An exhausted frontier does no further collision work until invalidation. No frontier-wide validation runs per simulation frame; snapshot validation occurs at the existing persistence boundary.

## Evidence

`regression-before.txt.gz` retains both dt=0.1 and dt=1 failures against the exact old connector source. `regression-after.txt.gz`: **55/55 pass**, including both recorded failures at both time steps, original-speed bounds, native swept route-leg checks, exact serialized save/reload continuation, bounded failed searches, malformed persistence rejection, opposing body traffic and other-biome retreat cases. At dt=1 a tick can traverse multiple corners, so the direct before/after chord is not its actual traveled path; every generated route leg is checked instead. Native motion validation remains active throughout.

An initial test launch without this worktree's dependency junction failed to resolve `three`; retained separately in `initial-missing-dependency.txt.gz`. Dependencies were connected and the complete directed group reran successfully.

Reproduce CPU diagnostics: `node tools/qa_fractional_exit.mjs`. Recorded `replay-after.json` on Node v20.11.0 / Windows:

- Fractional fallback: 68 calls; p50 0.654 ms, p95 2.299 ms, maximum **23.682 ms**.
- Actual temporary state: maximum **26,381 serialized bytes**, 499 nodes and 67 open entries; 41 route points.
- Native replay dt=0.1: raid ends after 16.3 simulated seconds, day29 mandatory hiring; p95 tick1.496 ms, max39.380 ms, max displacement0.38 m.
- Native replay dt=1: raid ends after17 simulated seconds, day29 mandatory hiring; max displacement3.8 m, maximum tick38.635 ms.

Cold maxima include lazy collision preparation / original routing and are intentionally retained. The eight-pop budget bounds work units, not a hard wall-clock deadline. This correctness fix is **not** proof of stable camera-travel frametimes, a GPU improvement, or full 100-night campaign acceptance. No renderer or GPU experiment ran. Build/full-suite/current-source campaign checks belong to integration QA after review.
