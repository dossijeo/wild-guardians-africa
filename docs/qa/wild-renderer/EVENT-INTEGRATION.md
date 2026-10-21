# Event integration: experimental status

Wild Engine already subscribes to confirmed events through observeGameEvents.
The renderer must not drain intentChanges independently of its current consumer.
Streaming onData supplies a separate lifecycle boundary for chunk data.

The initial persistent adapter removes matrix rebuilding but still scans metadata.
The event lifecycle variant retires source memory on chunk removal and mesh
 disposal (including partial resident-prop replacement). Its A/B/A/B has exact
images and draw counts, reducing registry CPU from 0.054-0.064 to 0.005-0.006 ms.
Total frame cadence does not consistently improve.

The engine variant captures 40-byte native prop records synchronously at the
chunk payload boundary. The Engine pointer is transient: selection and memory
growth can invalidate it. A bulk snapshot is retained per installed chunk and
copied once into independent renderer WASM memory. Native code filters by slot
and suppressed IDs and constructs Float32 matrices. It does not traverse JS
instance records for this operation. Population mismatch is a hard error.

Tests cover matrix parity with Three.js, suppression, stable ordering, memory
growth, disposal, and partial slot replacement without JS record access. Signed
zeros are numerically equivalent; all nonzero Float32 entries match exactly.
The native suppression lookup remains linear and needs realistic stress testing.

## Completed Engine-packed comparison

engine-abab/summary.json passes exact day/night pixels and per-frame camera,
draw-call and triangle equality: 1440 GPU samples, 2880 cadence frames.
Group CPU drops in all four paired blocks by approximately 8-15%. Total render
CPU also drops, but cadence changes sign between repetitions:

- Day: 17.877 to 18.120 ms; 18.384 to 18.094 ms.
- Night: 17.597 to 17.814 ms; 18.753 to 17.967 ms.

This does not establish a consistent full-frame gain. Candidate input preparation
remains 0.125-0.136 ms. LOD/fade metadata checks and grouping still execute in JS.
Direct packed registration alone has not removed this hot-path cost.
The earlier smoke run had six night pixels differing by one channel level;
this did not recur in the full comparison, but its cause remains unproven.

Reproduce with WR_ORDER=combined,engine,combined,engine and
WR_OUT=docs/qa/wild-renderer/engine-abab, then run measure-wild-renderer.mjs
and audit-wild-renderer.py with --engine.

## Outstanding work

This connects streaming lifecycle data, not every simulation event. Live world
changes, dense scenes, complete event invalidation, CPU memory accounting and
end-to-end benefit still need validation. Shadows, LOD and obstruction retain
existing JavaScript representations. No adoption recommendation or GLES emission
variant is justified yet. No production simulation/navigation code was changed.
