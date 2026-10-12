# Broadphase protected ABBA: exact parity, modest variable saving, OFF

Frozen66f2e556,447source hashes unchanged. PID52188/session16616 actualexit0 naturally; PID absent. No profiler, retries, gameplay/policy changes or campaign100. Flat memo ON both arms, wall broadphase OFF/ON in A/B. Twelve raw/gzip hashed payloads include launch/state/report/summary/stdout and fifteen-test preflight.

| Arm | Proof ms | Tick ms |
|---|---:|---:|
| A1 | 84370.8823 | 42.3336 |
| B1 | 82799.9002 | 31.0291 |
| B2 | 78238.3223 | 26.3728 |
| A2 | 90879.9367 | 25.7896 |

Means control87625.4095/candidate80519.11125ms:8.1098602% reduction, pairs1.8619956%/13.9102368%. Controls differ7.71%; candidate arms5.83%. The single instrumented CPU ABBA has modest variable saving, not a reliable net production/per-frame gain. Both flags remain OFF by default. About80seconds per policy act is still too costly to resume protected100-night campaigns. No compare across earlier runs with different warm/concurrent conditions.

Full decisions/actions and initial/prepared/final snapshots are byte-identical; final a80f0d783598c5058e5ffad58bb3b82788734f1e297351b60d436566c5cb9247 and full roundtrip. Each arm150011093surface/450033279lattice/1364074coarse; flat434210116hits/15823163native calls remain identical. B each has1358eligible walls summed across11leases,173091321bound queries/159333765conservative wall hits/0unsupported. These count adapter accesses, not skipped collisions or unique walls. Counting per lookup adds work; native collisions are unchanged. Fifteen preflight tests pass2745.753ms.

Verify: `node tools/audit_wall_broadphase_replay.mjs docs/qa/native-proof-wall-broadphase/protected-replay-66f2 .` (optional frozen-source root as final argument).

Read-only report diagnosis: eleven proofs are not identical repeats. Eight simple rectangle attempts fail after radius1.1 with no-complete-native-component-certificate. Three shore contours at different bounds each verify5664poses for five actor radii (84960poses together), then fail native-worker-route-blocked. Moving the worker check before the geometry proof would alter the retained full report and is not done. Parent requests next algorithmic investigation of conservative spatial candidates rather than another lookup micro-optimization; it must retain obstacle order, native geometry, gates, fluids, topology ownership and exact decisions/report/state. This is a proposal only, not evidence of eventual speedup. Inactivity remains outside acceptance.
