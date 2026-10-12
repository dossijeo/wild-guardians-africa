# Unprofiled full protected fixture: 19.0737% mean reduction

Frozen source c42cfcbed4ff888de0dd7eb5ad7352d1c7eecd49, 444 hashes unchanged. PID21364/session71414 naturally returned exit0; PID absent. No restart, no profiler, defaults OFF. This is the same bounded day8 native proof fixture, not a seven-night campaign or current-main acceptance.

Command: `node tools/replay_native_flat_lattice_cache.mjs docs/qa/native-balance-parallel-short/native-original/state.json.gz .cache/flat-protected-unprofiled-abba-01`.

| Arm | Proof milliseconds | Tick milliseconds |
|---|---:|---:|
| A1 | 109734.9881 | 34.4237 |
| B1 flat | 92287.4857 | 32.1838 |
| B2 flat | 92498.4131 | 29.3077 |
| A2 | 118603.5960 | 29.7956 |

Means control114169.29205 / candidate92392.94940ms, reduction19.0737301%; paired reductions15.8996713% and22.0104481%. Candidate arms differ0.23%; controls differ8.08%. This confirms material descriptive CPU saving without profiler but still leaves about92seconds for one eleven-proof policy evaluation. It does not justify a100-night protected campaign or activating the flag by default.

All complete policy reports, actions and initial/prepared/final snapshots are byte identical; final SHA a80f0d783598c5058e5ffad58bb3b82788734f1e297351b60d436566c5cb9247. Each state roundtrips. Counters exactly reproduce the previous profiled fixture. Eleven byte-preserved gzip payloads include stdout and launch provenance. Verify:

`node tools/audit_flat_proof_replay.mjs docs/qa/native-proof-flat-lattice/unprofiled-replay-c42 .`

The reusable auditor prints a historical 'profiled improvement' scope label; this run has no profile (manifest.profiled=false). Treat its verified arithmetic and hashes separately from that stale label. Earlier negatives and profiled evidence remain unchanged. Inactivity is not an acceptance metric by explicit user decision.

Remaining diagnosis: wallCollisionFrame/Bounds already memoize native frames/radii. The residual cost is repeated lookup/guards and coarse traversal, not repeated polygon construction. Native obstacleBounds intentionally excludes walls/gates. Proposed next QA-only experiment precomputes conservative bounds for immutable non-gate walls at a declared maximum actor radius, allowing the existing native broadphase to reject clearly distant walls before their existing exact checks. Doors retain native dynamic handling; larger/unsupported radii and changed owner/geometry must fall back or reject the certificate. No collision rule, water/lava test or navigation algorithm is relaxed. Exact dynamic/door/fluid fixtures and unprofiled ABBA are required before any activation. This proposal is not implemented here.
