# Global Frame Scheduler — work in progress

Reference: `54075e228`, experimental branch only. Candidate opt-in: `?frameScheduler=1`. No performance benefit claimed yet. No scheduler migration is complete.

## Confirmed inventory and costs

- Quality prewarm report: active simulation produced roughly 985 ms presentation stalls, including 832 ms Mangroves ground and 117 ms far terrain synchronous driver work. These atomic calls cannot be preempted. Existing whole-scene retries are not a production solution.
- `loading-frame-slack`: 12-sample lane policy; `loading-yield-budget`: independent CPU budgets; `loading-sync-queue`: owner pump with fixed budget. Consolidation pending, not yet connected.
- Native pthread generates private data in shared memory. Publication stays authoritative. Current stream single busy request includes subsequent graphics preparation, limiting pipeline overlap.
- Terrain already has private incremental geometry/material/prop-slot construction. Final installation includes additional ground-detail work, not yet divided.
- Simulation, navigation, native synchronization and GPU fence/compile completion remain specialized; they must not be delayed as optional visual jobs.

## First implementation checkpoint

Presentation-owned JS scheduler, rolling two-second observations, median/P95/P99 and mandatory CPU P95, immediate spike cooldown and gradual capacity growth. No additional RAF. Actual callback lateness reduces measured headroom; missed refresh periods are never treated as extra time. Deadlines borrow only current measured headroom. GPU time is not inferred from RAF intervals.

Private terrain steps are the first consumer. Quality/current-request validity is checked before each unit; cancellation returns the generator and releases private resources. A chunk is returned only when complete. Query off preserves the previous path. Admission bounded to 128 jobs; replacement by key and abort supported.

## Pending / limitations

This is infrastructure plus one real producer, not acceptance. Need renderer A/B, long-session and streaming throughput validation, queue aging/tail-cost handling, resource-owner scopes, explicit dependencies/versions and coalescing, decoupled bounded native production, initial loading integration, shader transactions and program reuse. Current stats sort a small window at 100 ms intervals; measure overhead before adoption. Unknown atomic units can still overrun their estimate; report them, do not conceal them. Native publication and final installation remain outside this queue.

Run `node --test tests/global-frame-scheduler.test.js tests/prepare-terrain-chunk.test.js` for deterministic lifecycle/admission checks. Full six-biome real game acceptance remains pending.

## First real-renderer pilot — not adopted

Intel UHD / ANGLE D3D11, Mangroves 720p media, actual production streaming defaults, pthreads, active simulation, identical saved initial state frozen until readiness. Files: `scheduler-baseline-active-a1.json` and `scheduler-candidate-active-b1.json`. Only one A/B pair, not statistical acceptance; simulation evolves with wall time. The earlier `scheduler-first-active.json` had no initial freeze and is functional evidence only.

| Metric | Reference | First scheduler |
|---|---:|---:|
| Initial readiness | 28.04 s | 28.65 s |
| Completed travel chunks | 10 | 10 |
| Final install mean | 11.53 ms | 0.60 ms |
| Presentation P95 | 66.51 ms | 66.51 ms |
| Presentation max | 182.8 ms | 216.1 ms |
| Frames including queue drain | 180 | 296 |
| Candidate private preparation CPU / chunk | — | 9.48 ms |
| Candidate private preparation latency / chunk | — | 1005.78 ms |

Both runs settle without unexpected browser errors. Candidate runs 876 units including initial load, 332.53 ms accumulated work and 41.54 ms accumulated coordination (not per-frame overhead). Largest unit 7.86 ms; 12 deadline overruns. Runtime remains one authoritative shared pthread world.

**Regression confirmed in this pilot:** final install is shorter but overall streaming is delayed; presentation tails do not improve. Do not enable this candidate by default. Current 60 Hz admission under a 30-ish Hz GPU/presentation workload is overly restrictive, while the stream serializes generation behind graphics staging. Further work must address both measured capacity and pipeline overlap, without treating missed frames as free CPU time. Shader driver spikes remain independent and unresolved. No benefit claim and no six-biome acceptance yet.

## Bounded pipeline and admission experiments (second checkpoint)

NativeChunkStream now has an optional private preparation stage: one serial native request can overlap graphical staging, capped at two pending prepared payloads. No extra WASM world/thread is created. Core render payload and water/shore arrays are copies, verified in spatial-savanna-payload.js and spatial-world.js. Native publication remains serial. Invalidated graphical work rereads current resident data without regenerating a chunk. Readiness includes pending preparation; disposal/camera/revision invalidation prevents late publication.

The scheduler candidate alone enables this stage. Default rendering remains unchanged. Terrain units announce their phase before execution so estimates are learned separately per world/quality/phase. Four tiny prop slots share a unit (same twenty slots). Context epochs and program revisions invalidate old private work, including quality round trips. Synchronous geometry equivalence tests pass.

Pilot sequence on the same Intel UHD fixture (single exploratory runs, NOT ABAB acceptance):

| Report | Preparation mean latency | RAF P95 | RAF max | Frames incl. drain |
|---|---:|---:|---:|---:|
| pipeline-active-p1 | 1124 ms | 83.05 ms | 149.97 ms | 180 |
| pipeline-pressure-p2 | 1316 ms | 66.62 ms | 166.39 ms | 214 |
| phase-cost-p3 | 1746 ms | 66.58 ms | 215.96 ms | 319 |
| deadline-loan-p4 | 810 ms | 66.60 ms | 182.95 ms | 180 |
| batched-props-p5 | 1069 ms | 83.12 ms | 166.30 ms | 180 |

All filenames have `scheduler-` prefix. Each completes ten chunks and has no unexpected browser errors. P1 scheduler statistics are invalid zeros: bare dynamic import loaded another Vite module identity. Subsequent QA resolves the canonical runtime resource URL. P4 used an early elastic admission rule that failed the mandatory-overload unit test; it is diagnostic only. The committed rule refuses borrowing when mandatory CPU already exceeds 85% of target interval. Deadline borrowing is explicitly counted as a budget overrun, never reported as idle CPU capacity.

P5 startup 28.10 s, install mean 0.58 ms, private preparation CPU 10.10 ms/chunk, accumulated coordination 40.13 ms including loading, 447 units and 51 bounded deadline loans. These do not establish overall improvement. Saturated presentation still delays private work and synchronous render/program stalls remain. Do not adopt; prioritize material/program preparation and actual per-phase CPU attribution before more budget tuning. Final broad ABAB/six-biome validation remains pending.

Actual exit during pthread generation (`scheduler-pipeline-exit.json`) reaches native stopped state 5, zero workers, zero late installs, zero pending scheduler jobs; retained 81 program references released. Exit scenario also changes quality and takes 6.54 s: lifecycle correctness passed, responsiveness did NOT. It must not be cited as a latency success.

36 targeted tests pass (scheduler, staging, generic/native stream and geometry equivalence). They include same-world six-biome navigation checks, pipeline backpressure, stale/disposed results, rereading edits without regeneration, and private resource release. This does not substitute for full concurrent renderer/gameplay acceptance.

## Incremental live-scene program preparation

New QA-only `prepareLiveScenePrograms` replaces whole-scene restart with completed per-object recipes and isolated borrowed batches. It skips retired objects, discovers newly added objects on subsequent rounds and retries only invalidated batches. A global deadline/context epoch bounds the operation. Existing compile submission/readiness and resource guards are reused; native driver calls remain atomic.

Initial prototypes (`quality-live-batches-active-1.failure.json`, `-2.failure.json`) timed out. Instrumentation identified 147264 rounds with two objects remaining, not external disposal. Three r180 `WebGLRenderer.prepareMaterial` increments material.version while preparing both sides of transparent DoubleSide materials. Comparing raw pre-submit versions falsely invalidated our own work. The correction captures synchronous compiler-owned changes, normalizes shared material versions across batches, and still observes edits after submission. Every round and disposal retry yields a real frame; no immediate microtask retry loop remains.

Real active Mangroves runs `quality-live-batches-active-3.json` and `-4.json` pass four quality steps, 240 camera frames, 15 streamed chunks, no unexpected GL errors, no whole-scene restarts. In run 4 the first baja preparation completes in 5286.76 ms over four rounds, skips 252 retired objects, completes 196 batches / 1466 object recipes. Later media/baja preparations take 273.32 / 105.79 ms. Temporary program scopes acquire/release 81/118/108/108 references; none exhausted or leaked. Largest observed RAF intervals per step: 59.45/67.77/105.95/76.03 ms.

Historical bounded-retention prototype had 60 whole-scene restarts for first baja; this is evidence of removed redundant restart behavior, NOT interleaved A/B proof of overall frame-time improvement. First baja still takes about 5.3–5.6 s, and the existing QA wrapper holds the last rendered canvas during preparation. Neither responsive visual presentation nor complete scheduler adoption is established. Candidate remains opt-in (`WG_THREAD_LIVE_PREPARATION=1`, with quality prewarm and temporary pins). No production quality transition changed.

26 compiler/lifecycle tests pass, covering disposed/retired batches, new objects, material edits, shared transparent compiler mutations, timeout/cancellation and context epoch changes. Next: integrate useful compile submission units with global admission, and replace the held-frame QA transaction with a validated resource transition before adoption. Full image equivalence and ABAB acceptance remain required.

## Compiler submission integrated with global admission

`compileLoadingPrograms` accepts the same scheduler used by terrain. An admitted unit submits synchronously and snapshots readiness; the readiness promise stays with the specialized GPU executor. Context loss and abort cancel a queued submission before another presentation frame. Batched compilation disables its independent yield budget when global admission owns it. Production defaults remain unchanged; the live quality QA supplies the scheduler only with `frameScheduler=1`.

First real combined run (`quality-scheduled-batches-active-1.json`) exposed a coordination regression: one ready promise continuation per presentation frame stretched warm quality preparation to 4.45/2.82/2.80 seconds, with first baja at 9.80 seconds. Merely moving each tiny batch into a queue is unsuitable.

The scheduler now permits bounded ready microtask continuations within the SAME remaining presentation budget: never awaits GPU readiness/timers, at most 32 empty microtask turns, hard 1024-unit guard, all elapsed continuation time charged to the current deadline. It creates no extra RAF. Reports distinguish synchronous unit work, scheduling coordination and intervening continuation wall time.

Follow-up (`quality-scheduled-continuations-active-2.json`) passes active simulation/travel and 15 chunks with no unexpected GL errors or pending jobs. Preparation durations: media 516 ms, first baja 6181 ms, media 535 ms, baja 1208 ms; max RAF per step 106.8/78.6/52.9/42.2 ms. First media full transition remains 3064 ms because subsequent streaming readiness is also awaited. Total counters including startup: 701 completed jobs, 1175 units, 624.81 ms synchronous work, 56.57 ms coordination, 127.22 ms continuation wall time. These exploratory runs are not interleaved acceptance, not a GPU improvement claim, and still hold the previous canvas during QA prewarm.

37 scheduler/compiler tests pass, including ready-producer continuation reuse, cancellation before submission, latched loss/restoration before admission, and exclusion of pending GPU readiness from synchronous work accounting. A test initially read final counters before asynchronous endFrame settlement; it was corrected to await endFrame, without waiting for GPU readiness. No driver wait was moved into endFrame.

Next required work remains: eliminate held-canvas transitions with versioned resource preparation, reduce remaining streaming latency, integrate initial resource/actor preparation, then full equivalent-image and repeated ABAB validation. Candidate stays off by default.
