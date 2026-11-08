# Visual backlog on the GTX 1660 — normal browser

The performance harness now launches a normal Edge window (`headless:false`)
and rejects its software-rendering override. `QA_REQUIRE_GPU='GTX 1660'`
checks the browser's hardware inventory. Queue diagnostics additionally capture
the adapter used to create the actual Three.js device, not merely a second
independent adapter request. The recorded device reports NVIDIA/Turing and
`isFallbackAdapter:false`; CDP identifies NVIDIA GeForce GTX 1660, driver
32.0.15.8129, and WebGPU/GPU compositing enabled. These measurements replace
headless results as the current performance baseline. Headless mode alone is
not evidence of software rendering; no such inference is used here.

## Confirmed defect and correction

The next publication used to be decoded into a private preview, including a
complete clone and JSON materialization, prepared/validated by the state
receiver, then discarded. Confirmation decoded and prepared it again.

The consumer now owns one pending transport transaction and one prepared state
token. Preview does not advance the transport, world, events or clock. The
same transaction is committed at the confirmed boundary. Historical event
playback replaces the state token with its intermediate-event token, retaining
the transport decoding. Disposal and failure release staged ownership;
generation checks reject stale transport commits. The public mutable preview
API remains isolated from this private transaction path.

Alternatives considered: (1) prepare each publication once, selected here;
(2) merge publication boundaries, which requires extending event, recovery and
physics-history contracts before it is safe; (3) move preparation to another
worker, adding transfers and a new owner without eliminating duplicated work.
No publication is skipped, queue capacity is unchanged, and authority is not
made dependent on rendering to conceal latency.

## Results and remaining failure

Same saved eight-animal raid, 20 s nominal windows, paused resource readiness
and 10 s warm-up. Shared lights/motion/phase and auxiliary grass worker enabled.
The chronological runs are baseline, transaction, transaction repeat; this is
not a randomized broad benchmark. [Recorded metrics](headed-publication-transactions-20261108.json).

| Run | Timeline pump p95 ms | Render call p95 ms | Main rAF p95 ms | Final sampled lag s |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 67.93 | 54.45 | 33.375 | 7.55 |
| Transaction | 48.17 | 52.54 | 33.375 | 7.20 |
| Transaction repeat | 47.42 | 54.35 | 33.375 | 7.75 |

The pump cost reduction repeats, but the visual delay is **not resolved**.
The queue still reaches 32 publications. Render-call measurements are CPU/wall
call duration, not GPU timestamps; the main rAF is not the graphics worker's
frame interval. Sparse asynchronous lag readings are not a latency distribution.
One repetition interrupted by a development reload is excluded.

A separate normal-browser trace, `.cache/headed-lag-trace.json`, attributes
substantial sampled drawing stacks to Three.js material/program key discovery:
about 528 ms in `getKeys -> getMaterialCacheKey` and 410 ms in
`getNodeChildren -> customProgramCacheKey -> getMaterialCacheKey`. This is CPU
structural inspection in the render worker, not proof of GPU saturation. It
must be addressed with an explicit material/graph structural invalidation
contract; blindly caching by material.version would be unsafe because Three
currently detects several public property and sampler changes without it.

121 tests pass, covering transport staging, stale commits, presentation
timelines, historical event playback, native actor admission and recovery.
To reproduce, use the server configuration in
`webgpu-terrain-support-trace-20261108.md` with `QA_ONLY_SKIP_LEGACY=1`,
`QA_REPEATS=1`, `QA_WINDOW_MS=20000`, `QA_QUEUE_DIAGNOSTICS=1`,
`QA_REQUIRE_GPU='GTX 1660'` and a distinct `QA_OUT_FILE`. Keep the browser
visible and do not edit imported sources during the measurement.
