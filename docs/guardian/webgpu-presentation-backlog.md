# Confirmed presentation backlog: fixed settlement heights

The visual Worker reconciles every ordered confirmed publication and then synchronizes scene owners. Events and physical ownership are kept at their original publication boundaries. Fusing eventful snapshots is not proven equivalent: presentation observers run against the state reconciled for each event, and physical handoffs/invalidation are ordered boundaries.

`experimentalTiming:true` enables bounded Worker-only diagnostics (disabled by default). In the mangrove raid audit, the dominant measured callback was settlement synchronization. Each publication raycast the same fixed wall positions against the same immutable resident chunk mesh. Heights are now shared by exact position and chunk mesh identity; replacing a chunk automatically causes a new raycast. Missing terrain is not cached. Evicted chunks can be collected by the WeakMap, and each live chunk retains at most 1,024 sampled positions. This removes redundant visual height queries; authoritative state, collision, event and physics handling do not change.

Reproduce using Vite on 127.0.0.1:5175 and `PLAYWRIGHT_MODULE` pointing to Playwright: `node tools/experiments/audit_webgpu_presentation_timing.mjs`. Set `QA_DISABLE_HEIGHT_REUSE=1` to disable the cache via a QA route only; no production toggle is changed. Two alternating runs per version (samples 34–36, includes initialization) on this machine:

| Variant | Settlement sync mean / p95 ms | Full presentation receipt mean / p95 ms |
| --- | --- | --- |
| No reuse, run 1 | 53.04 / 65.7 | 144.34 / 268.6 |
| Reuse, run 1 | 0.37 / 0.7 | 38.28 / 48.1 |
| No reuse, run 2 | 53.33 / 65.3 | 176.14 / 244.4 |
| Reuse, run 2 | 0.36 / 0.7 | 38.09 / 48.7 |

The second no-reuse run follows two cached runs; the last run restores reuse. Measurements are wall-clock Worker callback times, not GPU or FPS; load/asset preparation and system contention remain included. They are not long-session or cross-hardware benchmarks. Regression test `node --test tests/webgpu-settlement-height.test.js tests/confirmed-presentation-stream.test.js` checks moved positions, chunk replacement, and publication event/pose order.

`node tools/experiments/audit_live_webgpu_first_wall_hit.mjs` passed after the change with confirmed wall impact and WebGPU: authority sequence 326, presentation sequence 298; authority elapsed 25.299745 s and presentation elapsed 24.999745 s (0.30 s lag at that sample). This is a single sample, not p95/p99 backlog or a controlled before/after timing. Frame interval values include loading and cannot establish a frame-rate improvement. Further measurements must include controlled repeated raids, event-to-display latency, memory, and physical handoffs.
