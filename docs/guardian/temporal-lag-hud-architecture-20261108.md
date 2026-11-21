# Presentation lag: separate clock, throughput and UI timing

This change does not close the visual-latency issue. It fixes a reproducible
clock defect and removes repeated whole-view reconstruction from the main HUD
consumer. The graphics worker still cannot consume the real raid fast enough.

## Evidence and causes

The prior 66.7 ms figure is main-thread rAF p95, not GPU execution time or
physical presentation time. In the existing full-shared-actor trace, renderer
main-thread tasks reached 122, 103 and 102 ms while handling worker messages.
Sampled stacks attributed approximately 2,240 ms to HUD decode copies, 1,079 ms
to commit copies, 527 ms to preparation copies and 1,664 ms to actor projection
inside schema validation over the traced window. These samples are statistical,
not additive GPU times. The old transaction built a shadow decoder, replayed
and revalidated the complete prior baseline, decoded the delta, and repeatedly
cloned the resulting full view. A delta protocol thus still caused full-world
work on the UI thread.

The historical clock independently discarded frame overshoot when reaching an
endpoint and restarted wall time at each subsequent begin(). Preparation,
commit work and frame quantization therefore added delay to adjacent certified
intervals. A deterministic test reproduces this without a renderer: a 100 ms
interval completed at 165 ms followed by 20 ms preparation must leave the next
interval at 185 ms, not at its start. The corrected clock preserves the
endpoint's wall-time origin across certified intervals. Explicit suspension,
visibility gaps and uncertified fallback reset or suspend continuity. It never
advances beyond the currently certified endpoint and still processes events in
order. This defect is a contributor, not the complete explanation of lag.

## Architectural decisions

For time, skipping snapshots would weaken event ordering; predicting future
simulation would introduce a second authority. A continuous clock restricted
to certified history retains both existing guarantees and is selected.

For the HUD, moving the same decoder to another worker adds another transfer;
reducing a few clones retains full-view transaction reconstruction. The selected
contract is an immutable, structurally shared projection: changed fields and
entities are copied once into a candidate; unchanged subtrees retain identity;
the frozen candidate is validated once and atomically committed. Packet mutation,
retained validator references and consumers cannot mutate the candidate. The
old mutable decoder API remains for consumers requiring isolated mutable results.
The real HUD receiver uses the immutable contract, including unchanged messages.
No schema checks, command authority, journal ordering or events are removed.

## Integrated observations

Same saved eight-animal raid, NVIDIA Turing WebGPU, shared light/motion/phase
options and grass worker. Resource readiness and 10 s paused warm-up precede
resuming. Three asynchronous inspections are not latency distributions.

| Variant | Window | Main rAF p95 / p99 / max ms | Final sampled lag s |
| --- | ---: | --- | ---: |
| Original restarted clock, old HUD | 10 s | 66.675 / 66.720 / 100.045 | 3.35 |
| Continuous clock, old HUD | 10 s | 66.675 / 66.715 / 100.055 | 2.95 |
| Continuous clock, immutable HUD | 10 s | 33.380 / 33.395 / 33.495 | 5.20 |
| Continuous clock, immutable HUD repeat | 20 s | 33.375 / 33.390 / 33.410 | 8.45 |

A separate blank-page Edge headless control gave rAF p95 33.4 ms. Recovering
that cadence does not establish 60 FPS or eliminate graphics-worker stalls.
The longer test demonstrates the remaining failure: freeing the UI permits
faster publication while the graphics queue saturates at 32 queued states.
It is not valid to claim an overall latency improvement from this change.

New QA samples timestamp graphics-worker pump and render calls independently.
For the first three 10 s runs respectively, within the measured interval,
pump p95 was 60.8 / 74.4 / 69.8 ms and render-call p95 55.0 / 56.0 / 56.6 ms.
Those CPU/wall call measurements are not GPU timestamps and their percentiles
must not be added. The old trace also contains substantial synchronous node
construction inside asynchronous admission. Rendering, admission and timeline
materialization still compete on the same worker.

The unresolved architectural work is to eliminate per-publication reconstruction
and preparation in that graphics consumer while preserving all event boundaries,
physics history and recovery acknowledgements. Merely raising queue capacity,
discarding events or making the authority wait for presentation is not a fix.

## Validation and reproduction

76 targeted tests passed: immutable transaction ownership and stale commits,
baseline/delta equivalence including removals and raid changes, malformed
publication retry, HUD authority and journal order, mixed-rate clocks, event
sublimits, suspension, fallback and timeline pump contracts.

Use the server options in `webgpu-terrain-support-trace-20261108.md` and
`measure_webgpu_native_horde.mjs` with `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`,
`QA_QUEUE_DIAGNOSTICS=1`, `QA_WINDOW_MS=10000` (or 20000 for the repeat).
`QA_CLOCK_RESTART_BASELINE=1` reproduces the discarded boundary restart;
reproducing the old HUD also requires the pre-change HUD modules. Local raw
results are `.cache/clock-{restart,continuous,immutable,immutable-repeat}.jsonl`.
