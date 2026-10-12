# Exact lattice AB/BA: mixed timing, average regression

Source `cd5d5adc9f1362941c7adee8db2af1222994d138`, 443 source hashes unchanged throughout. PID 21668/session 90905 completed naturally, actual exit 0, PID absent afterward, no restart. The fixture and policy are unchanged from previous protected replays; no campaign/strategy/economic change or inactivity acceptance measurement.

```
node tools/replay_native_lattice_cache.mjs docs/qa/native-balance-parallel-short/native-original/state.json.gz .cache/lattice-cache-abba-cd5d-01
```

A is the diagnostic private wrapper without memoization; B is the same instrumentation with nested numeric x/z memoization. Both keep the closed-approach shortcut OFF. All four full decisions and initial/prepared/final snapshots match exactly; each snapshot roundtrips. Final SHA is the same `a80f0d783598c5058e5ffad58bb3b82788734f1e297351b60d436566c5cb9247` as both prior protected fixtures.

| Arm | Defense/proof time | Ordinary tick |
|---|---:|---:|
| A1 diagnose | 131,316.50 ms | 86.56 ms |
| B1 cache | 196,013.41 ms | 32.12 ms |
| B2 cache | 108,508.07 ms | 24.84 ms |
| A2 diagnose | 131,896.92 ms | 40.44 ms |

Controls are stable, but candidate times differ substantially. First pair regresses 49.2679%; second pair improves 17.7327%. Mean control 131,606.71 ms, mean candidate 152,260.74 ms: **15.6938% average regression**. This is mixed evidence, not a success selected from the final candidate alone. Warm/JIT/scheduling effects remain unisolated. No claim that the first pair proves a universal 49% penalty or that the second pair proves a net campaign optimization.

Every arm records 150,011,093 native surface calls, 450,033,279 lattice calls and 1,364,074 coarse collision calls across 11 proofs. B records 449,996,141 memo hits, 37,138 native lattice calls, no capacity bypass and maximum 14,085 cached entries per lease. The 99.9917% hit ratio is not proof of performance. Native lattice calls are misses of this secondary memo, **not** misses or height computations of the existing native FIFO height cache. Collision results are unchanged and never cached by this prototype.

This narrows a concrete next diagnostic: the cache replaces one native string-key lookup with nested `get/has/get`, numeric guards and lease/version bookkeeping, repeated 450 million times. That overhead is plausible but not separately timed in this replay. A bounded lookup microprobe and an exact bijective integer-key single-Map variant could test it without another large replay. Noninteger/out-of-range/negative-zero inputs must retain native behavior; no rounding, approximate height or geometry simplification is permitted. No subsequent variant or campaign is promoted by this report. Both QA optimizations remain OFF.

Verifier `node tools/audit_lattice_cache_replay.mjs` checks 11 byte-exact compressed/raw payloads, all full report/state comparisons, roundtrip, measured counters and arithmetic. Third argument optionally checks the 443 frozen sources. Original metrics remain unchanged; inactivity is outside acceptance criteria by explicit user instruction. No main, CI, GPU, 100-night or current-production acceptance work occurred here.
