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

## Worker actor floor samples

Worker presentation used to raycast the same terrain on every confirmed publication, even when the actor and resident chunk had not changed. The new actor sampler retains only the last coordinate and chunk mesh identity per worker. Any x/z change, chunk replacement, loading or eviction invalidates it; the same raycast and zero-height fallback remain in use. Animal presentation is unchanged.

Run `node tools/experiments/audit_webgpu_presentation_timing.mjs` with Vite on port 5175 and `PLAYWRIGHT_MODULE` set. Set `QA_DISABLE_ACTOR_REUSE=1` to disable reuse through a QA-only route. Four sequential runs in A/B/B/A order on the same machine, 35–36 publications per run:

| Variant | Worker synchronization mean / p95 ms | Full receipt mean / p95 ms |
| --- | --- | --- |
| No reuse A1 | 12.92 / 23.1 | 47.80 / 65.5 |
| Reuse B1 | 2.02 / 13.9 | 29.01 / 44.0 |
| Reuse B2 | 1.36 / 12.6 | 28.21 / 40.7 |
| No reuse A2 | 17.56 / 29.4 | 51.36 / 74.4 |

All runs used the real confirmed mangrove scene on WebGPU, with 16 animals and a confirmed Shield. The figures are Worker wall-clock timings and include initial loading, not frame rates or a long-session performance test; the test does not establish complete visual parity. `node --test tests/webgpu-actor-terrain.test.js tests/webgpu-worker-roster.test.js` verifies reuse, movement, replacement, eviction and roster behavior. The QA audit also retains the separate settlement reuse control.

## Animals

The same actor-local sampler now avoids a terrain raycast for an animal only when its X/Z position and resident chunk mesh are unchanged. Moving, loading or replacing the chunk causes the original exact raycast. Confirmed physical poses continue on their existing path. In short A/B/B/A runs with 16 animals and confirmed Shield, animal sync mean/p95 was 8.48/15.4 and 7.36/10.3 ms without reuse, versus 0.66/1.2 and 0.74/2.8 ms with reuse. Full receipt timings were affected by loading and VFX and did not establish a global improvement. This is not an FPS or long-session measurement.
