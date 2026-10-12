# Full profiled flat proof: exact, mean 22.22% reduction

Frozen `65a9c23b25e29dfa874b73b9f4c1d88f9afc9e4e`, 444 source hashes unchanged. PID 25984/session 93856 naturally returned exit 0, PID absent afterward, no restart. Defaults remain OFF. No Game/src/content changes or strategy alteration; no current-main, rendering or 100-night acceptance.

```
node --cpu-prof --cpu-prof-dir=.cache/flat-lattice-profiles --cpu-prof-name=flat-protected-01.cpuprofile tools/replay_native_flat_lattice_cache.mjs docs/qa/native-balance-parallel-short/native-original/state.json.gz .cache/flat-protected-abba-01
```

Same bounded independent protected fixture: retained day-8 state, one native paid hire, same IDs/options/reserve35/fresh funded-defense policy, one ordinary tick. A diagnostic native lattice, B flat memo; closed-approach shortcut OFF. Complete policy reports, actions and all initial/prepared/final snapshots match exactly; all full states roundtrip. Final SHA remains `a80f0d783598c5058e5ffad58bb3b82788734f1e297351b60d436566c5cb9247`.

| Arm | Proof time | Tick |
|---|---:|---:|
| A1 | 163,760.18 ms | 58.86 ms |
| B1 flat | 136,440.89 ms | 47.34 ms |
| B2 flat | 133,662.59 ms | 37.94 ms |
| A2 | 183,508.86 ms | 40.99 ms |

Means A 173,634.52 ms/B 135,051.74 ms: **22.2207% reduction**, pairs 16.6825%/27.1629%. Candidate arms are close, controls differ. This is material improvement for this **profiled instrumented fixture**, not a claim of unprofiled seven-night speed or an acceptable 100-night duration. Profiling/scheduling/JIT overhead is retained; process CPU sums multiple threads and must not be labeled main-thread blocking. No source was changed during the run and earlier negatives remain intact.

All arms have 11 proofs, 150,011,093 surface, 450,033,279 lattice and 1,364,074 coarse collision calls. B: 434,210,116 exact memo hits, 15,823,163 native calls, including 15,786,647 deliberate zero-axis/out-of-domain coordinate bypasses; maximum 13,843 entries, zero capacity bypass/epoch invalidations. No terrain, radius or collision constraint was loosened.

Raw CPU profile has 592,447 samples over 619.776419 s. Recorded proof monotonic windows lie within its clock range and do not overlap. `tools/analyse_flat_proof_profile.mjs PROFILE SUMMARY NEW_OUTPUT` classifies samples by actual window endpoint, with disjoint ancestry buckets. A1 coarse pipeline 131.112 s versus B1 104.182 s; other work about 30.4/30.6 s. Exclusive A1 native lattice 48.894 s versus B1 flat proxy 16.170 s (native fallback is additional, not hidden). B1 coarseSegmentClear remains 20.728 s, fluidInside 12.996 s, wallCollisionBounds 12.567 s. These exclusive samples are not summed with inclusive buckets. Snapshot/hash/IO gaps and profiling setup are outside proof windows.

This identifies actual remaining costs rather than assuming cache hit rate is enough. In particular native wall bounds intentionally have no broadphase snapshot shortcut because gates can move; a safe QA geometry memo would need immutable per-query ownership or a scoped native API, not duplicated/weakened collision rules. No such change was made. Next safe validation is independent review and an unprofiled full fixture before enabling any QA flag or resuming a protected seven-night pilot; long campaigns remain stopped.

Seventeen preflight tests passed (2808.6536 ms). A separately added directed test passes 1/1 (1091.6962 ms), comparing full positive paid Canyon gate/service certificate and an explicitly opened navigation control with/without flat memo. Positive uses the existing isolated ContactCandidate, not a switch of the active campaign policy; the negative removes walls only in its test navigator and does not alter saved Game state. Both complete outputs/state match. The expensive replay itself exercised the unchanged active policy and preserves its action0 rejection report.

Fifteen original gzip payloads preserve reports/states/source/summary/stdout/profile/derived attribution/test logs with raw and stored hashes. `node tools/audit_flat_proof_replay.mjs` verifies them, full state/report equality, exact counters and arithmetic; optional third argument checks frozen 444 sources. Inactivity remains outside acceptance by human instruction.
