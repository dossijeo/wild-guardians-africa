# Global Frame Scheduler â€” work in progress

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

## First real-renderer pilot â€” not adopted

Intel UHD / ANGLE D3D11, Mangroves 720p media, actual production streaming defaults, pthreads, active simulation, identical saved initial state frozen until readiness. Files: `scheduler-baseline-active-a1.json` and `scheduler-candidate-active-b1.json`. Only one A/B pair, not statistical acceptance; simulation evolves with wall time. The earlier `scheduler-first-active.json` had no initial freeze and is functional evidence only.

| Metric | Reference | First scheduler |
|---|---:|---:|
| Initial readiness | 28.04 s | 28.65 s |
| Completed travel chunks | 10 | 10 |
| Final install mean | 11.53 ms | 0.60 ms |
| Presentation P95 | 66.51 ms | 66.51 ms |
| Presentation max | 182.8 ms | 216.1 ms |
| Frames including queue drain | 180 | 296 |
| Candidate private preparation CPU / chunk | â€” | 9.48 ms |
| Candidate private preparation latency / chunk | â€” | 1005.78 ms |

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

Historical bounded-retention prototype had 60 whole-scene restarts for first baja; this is evidence of removed redundant restart behavior, NOT interleaved A/B proof of overall frame-time improvement. First baja still takes about 5.3â€“5.6 s, and the existing QA wrapper holds the last rendered canvas during preparation. Neither responsive visual presentation nor complete scheduler adoption is established. Candidate remains opt-in (`WG_THREAD_LIVE_PREPARATION=1`, with quality prewarm and temporary pins). No production quality transition changed.

26 compiler/lifecycle tests pass, covering disposed/retired batches, new objects, material edits, shared transparent compiler mutations, timeout/cancellation and context epoch changes. Next: integrate useful compile submission units with global admission, and replace the held-frame QA transaction with a validated resource transition before adoption. Full image equivalence and ABAB acceptance remain required.

## Compiler submission integrated with global admission

`compileLoadingPrograms` accepts the same scheduler used by terrain. An admitted unit submits synchronously and snapshots readiness; the readiness promise stays with the specialized GPU executor. Context loss and abort cancel a queued submission before another presentation frame. Batched compilation disables its independent yield budget when global admission owns it. Production defaults remain unchanged; the live quality QA supplies the scheduler only with `frameScheduler=1`.

First real combined run (`quality-scheduled-batches-active-1.json`) exposed a coordination regression: one ready promise continuation per presentation frame stretched warm quality preparation to 4.45/2.82/2.80 seconds, with first baja at 9.80 seconds. Merely moving each tiny batch into a queue is unsuitable.

The scheduler now permits bounded ready microtask continuations within the SAME remaining presentation budget: never awaits GPU readiness/timers, at most 32 empty microtask turns, hard 1024-unit guard, all elapsed continuation time charged to the current deadline. It creates no extra RAF. Reports distinguish synchronous unit work, scheduling coordination and intervening continuation wall time.

Follow-up (`quality-scheduled-continuations-active-2.json`) passes active simulation/travel and 15 chunks with no unexpected GL errors or pending jobs. Preparation durations: media 516 ms, first baja 6181 ms, media 535 ms, baja 1208 ms; max RAF per step 106.8/78.6/52.9/42.2 ms. First media full transition remains 3064 ms because subsequent streaming readiness is also awaited. Total counters including startup: 701 completed jobs, 1175 units, 624.81 ms synchronous work, 56.57 ms coordination, 127.22 ms continuation wall time. These exploratory runs are not interleaved acceptance, not a GPU improvement claim, and still hold the previous canvas during QA prewarm.

37 scheduler/compiler tests pass, including ready-producer continuation reuse, cancellation before submission, latched loss/restoration before admission, and exclusion of pending GPU readiness from synchronous work accounting. A test initially read final counters before asynchronous endFrame settlement; it was corrected to await endFrame, without waiting for GPU readiness. No driver wait was moved into endFrame.

Next required work remains: eliminate held-canvas transitions with versioned resource preparation, reduce remaining streaming latency, integrate initial resource/actor preparation, then full equivalent-image and repeated ABAB validation. Candidate stays off by default.

## Queued compiler teardown and initial actor preparation

Actual game exit with a compile batch queued but not submitted is exercised by `WG_THREAD_EXIT_PREWARM=scheduled`. `scheduler-queued-compile-exit.json` records one queued job before exit, borrowed-resource cancellation, zero pending jobs afterwards, zero workers and zero late chunk installs. Exit takes 318.67 ms in this scenario; it does not include the separate quality-change/recovery scenario that previously took seconds.

LoadingSyncQueue now delegates synchronous actor adoptions to global admission when its world supplies the scheduler. It does not start its own pump or RAF in that mode. Existing owner abort, epoch checks, timeout checks and synchronous-only task contract are retained; the old path remains the A/B baseline. Authoritative simulation execution is not moved into the scheduler. Large individual adoptions remain atomic and must not be described as preemptible.

`scheduler-actors-active-1.json`: populated Mangroves Intel UHD 720p media, initial state frozen until readiness, active simulation/camera streaming afterwards. Two actor tasks complete, zero failures/pending, total actor CPU 13.08 ms, maximum 7.56 ms. Startup readiness 28.14 s; ten streamed chunks complete within 180 observed frames, frame P95 66.48 ms/max 166.36 ms. These are one-run functional/pilot results, not repeated performance acceptance. Overall tails still fail the objective of demonstrating improvement. 48 queue/scheduler/compiler tests pass, including no independent actor frame pump and immediate cancellation of queued tasks.

Integration status: terrain staging and native pipeline overlap are used by real gameplay with the opt-in; initial actor adoption now shares that budget. Shader submissions are wired in the explicit quality QA path only. Other initial loading/shader/texture producers still need consolidation. Capacity/backpressure under large actor waves, timeout while presentation is suspended, six-biome rendering, visual equivalence and packaging are pending. No default changed and no overall success claim.

## Fairness/error isolation and Sabana cross-check

Aging now uses time since last service, not job creation: an old nonterminating generator no longer permanently outranks newly queued equal-priority work merely because it was created earlier. Invalid or throwing cost estimates fail and close only their own job instead of aborting the presentation drain. 50 scheduler/queue/compiler tests pass, with explicit regressions for both cases.

Sabana real-renderer cross-check on Intel UHD 720p media, active simulation, same fixture/camera sequence/default streaming settings. Order was candidate then baseline, one run each: diagnostic BA, not repeated ABAB acceptance. Both finish ten chunks in 180 observed frames, no unexpected GL errors, no failed/pending jobs. Candidate screenshot inspected: terrain/grass/trees visible at the final camera, but not a pixel-equivalence validation.

| Metric | Baseline (`scheduler-savanna-baseline-1.json`) | Candidate (`scheduler-savanna-active-1.json`) |
|---|---:|---:|
| Initial readiness | 21.09 s | 21.43 s |
| RAF mean | 42.03 ms | 42.31 ms |
| RAF P95 | 83.13 ms | 83.48 ms |
| RAF max | 216.17 ms | 216.08 ms |
| Final chunk installation mean | 5.81 ms | 0.34 ms |
| Private preparation mean latency | synchronous | 1064.99 ms |

No frame-time improvement demonstrated; smaller installation cost does not compensate for deferred preparation. This corroborates the Mangroves limitation and is evidence against adopting the present admission policy. The current candidate remains disabled. Safety fixes do not imply performance acceptance. Next performance work must tackle the real synchronous render/material stalls and resource transitions, not claim success from shorter isolated installation.

## Resource preparation separated from final drawing

Audit found fixed512 Mangroves cache initialization/update inside `drawRenderFrame`. The QA quality-prewarm wrapper holds that function, so it also stopped cache progress during active streaming. This was a real coupling between preparation and presentation, and a confounder in held-frame quality experiments.

`WorldScene.prepareFrameResources` now owns the existing cache work as the last update phase, after world-origin uniforms and before final drawing. Ordinary gameplay retains the same operation order and one cache update per frame. Cooperative loading can yield after this resource phase. No shader, cache resolution, material appearance or cache capacity was changed. Direct production callers of final drawing all already run the update phases.

`quality-resource-phase-active-1.json` passes active simulation, 240 camera frames, 15 streamed chunks and all four quality changes without unexpected GL errors. Cached targets progress from 25 published to 40 while final presentation is held; all 25 resident chunks are ready at the measured boundaries. Reported resident/peak target bytes stay 35,209,000. First baja preparation takes 4413 ms; its largest RAF interval is 214.8 ms. This is not acceptance: the historical 5.3 s result is not an interleaved comparison, tails still exist, and held presentation remains unsatisfactory.

42 relevant tests pass, including cache lifecycle/budget, compiler ownership and a new full-update-phase test proving resource progress with final drawing held. This separates an existing responsibility; it does not make the GPU cache draw preemptible or claim a performance improvement.

Next architectural experiment: prepare target shader recipes while continuing to render the old quality, then activate. For media/baja the near ground material class is identical and the shadow recipe differs; a synchronous scoped compile adapter could select the target shadow setting and restore renderer/material state before any await. It must retain new programs, force correct old-program selection during intervening draws, handle scene churn/context/quality revisions, and measure activation stalls. This would only cover a subset: very-low material replacements, distant terrain, vegetation LOD, shadow resources and other visual systems still require explicit transaction coverage. Do not call a shadow-only prototype a completed quality transition.


## Target shadow recipes with uninterrupted presentation (diagnostic only)

Added a preparation-only renderer view that temporarily selects target shadow defines during synchronous compile, restores the renderer in finally, and marks borrowed materials for current-quality program reselection before returning. It forwards other methods with the original renderer as receiver. No state is held across readiness waits, no auxiliary draw is introduced. Unit tests cover success/failure restoration and shared-material invalidation. QA validates the old quality and shadow setting on every intervening actual draw, owns bounded program retention, and cancels preparation on quality revision/context/world invalidation.

Reproduction: existing game harness, port5190, default streaming, frozen initial fixture, quality cycle and active camera/simulation, `WG_THREAD_QUALITY_STAGED=1`; scheduler flag 1 or 0. Do not combine staged with held `QUALITY_PREWARM`. These two runs are diagnostic, not ABAB acceptance: disabling the scheduler also changes streaming/actors, and wall-time simulation/camera progress differs. GPU duration was not measured. Reported RAF values measure presentation intervals, not GPU work.

| Quality step | Global admission prep / draws / RAF max | Local admission prep / draws / RAF max |
|---|---|---|
| media | 14493 ms / 406 / 245.7 ms | 139.5 ms / 3 / 82.8 ms |
| baja | 8749 ms / 297 / 163.2 ms | 8118 ms / 177 / 236.9 ms |
| media | 3725 ms / 163 / 61.0 ms | 60.2 ms / 1 / 59.8 ms |
| baja | 3465 ms / 114 / 80.5 ms | 78.2 ms / 1 / 78.0 ms |

Evidence: `quality-staged-shadow-active-1.json` and `quality-staged-shadow-local-active-1.json`. All four changes complete, no unexpected GL errors, retained programs fully released. Global first baja activation plus recovery is 379 ms; local 611.5 ms. These are awaited wall times, not synchronous CPU. In these first reports `settingMs` accidentally includes preparation: do not interpret it as qualitySetting CPU. Harness now measures that synchronous call separately; original reports are preserved.

Conclusion: presentation can remain live during this preparation, but the approach is NOT accepted. Global admission adds seconds even for warm recipes, while the first baja remains ~8 seconds with local admission too. Therefore both admission latency and shader/resource recipe work need attention. The current fixed-per-submission initial estimate and repeated frame admission for warm batches deserve investigation; reducing preparation to one atomic large compile would simply recreate stalls. Scene recipes also churn during live rendering (4â€“6 global rounds); whole-scene stabilization is still too expensive. This is only shadow-define staging, not a complete transactional quality system, and no production quality path or default was changed.

Next: inspect costs/recipe reuse and scheduler admission for warm compilation, avoid preparing unchanged quality, and cover resource replacement before adopting a transition. Full visual equivalence, all-biome ABAB, deadlines/backpressure and distribution validation remain pending. No end-to-end performance success is claimed.


## Operation deadlines instead of renewed batch deadlines

Admission diagnostics now separate queued wall time, synchronous compile submission and awaited program readiness. This is opt-in witness instrumentation, not GPU timing. A real active-scene run (`quality-staged-admission-active-1.json`) shows warm media/baja transitions spending 2559.8/2759.0 ms in admission but only 31.3/28.6 ms submitting programs. The initial media step spends 14520.1 ms queued versus 45.1 ms submitting. There is substantial avoidable coordination latency; it is not a slow C++ kernel or proof of GPU saturation.

Confirmed policy error: every small batch created a fresh deadline 250 ms in the future. An already-overdue quality transaction repeatedly lost its urgency when advancing to the next batch. Live preparation now captures one absolute operation deadline and forwards it through all batches/retries. Existing mandatory CPU protection, measured headroom and bounded explicit deadline loans remain unchanged. This does not enlarge the universal frame budget or label overdue work free time.

Diagnostic sequential A/B (not repeated ABAB acceptance), same harness/settings/Intel UHD, global scheduler enabled in both:

| Step | Renewed deadline prep | Shared deadline prep | Renewed RAF P95 / max | Shared RAF P95 / max |
|---|---:|---:|---:|---:|
| media | 14819 ms | 11166 ms | 64.0 / 295.3 ms | 74.1 / 233.1 ms |
| baja | 10384 ms | 6536 ms | 47.4 / 142.0 ms | 48.4 / 173.5 ms |
| media | 2736 ms | 600 ms | 51.9 / 67.7 ms | 43.0 / 75.8 ms |
| baja | 2978 ms | 801 ms | 56.4 / 70.2 ms | 54.0 / 76.8 ms |

Candidate evidence: `quality-staged-operation-deadline-1.json`. Warm queue wait falls to 457.2/656.8 ms; first baja readiness wait remains 5035.5 ms. No unexpected GL errors or leaked temporary program references. Initial media still takes 11 seconds during streaming/churn; frame tails are not consistently improved. Not accepted as final scheduler performance. Full simulation timing differs with elapsed wall time, so these runs cannot establish image equivalence or isolate all thermal/scene variance.

41 scheduler/compiler/live-preparation tests pass, including immutable operation deadlines across batches and distinct admission versus submission timing. Next work remains reducing redundant scene recipes, understanding initial admission starvation under streaming, and transactional quality resource coverage. The opt-in remains off by default, main untouched, no artistic changes.


## Rejected: ordinary mesh preparation aliases

Inspected Three r180 WebGLRenderer.prepareMaterial and WebGLPrograms.getParameters. Tested sharing preparation for ordinary meshes with identical geometry/material identities, excluding instanced/batched/skinned objects and material arrays. Revision/lifetime checks kept aliases pending if their representative retired or changed. Ten tests passed, including identity isolation, instanced exclusion and representative retirement. Prototype archived in `shared-recipes-rejected.patch` and removed from active code.

`quality-staged-shared-recipes-1.json`: same active quality harness with shared operation deadlines. Only 24 object preparations shared per transition. Warm batches remain 162/165 versus 164/165 previously; warm preparation 790/1150 ms versus 600/801 ms. First baja 7191 ms versus 6536 ms. Frame P95/max show no consistent gain. Initial media varies 9952 versus 11166 ms with different churn rounds (9 versus 22); that isolated difference cannot establish benefit. No unexpected GL failures or temporary retention leaks.

Decision: discard the grouping layer. Its limited reuse does not justify maintenance or address the dominant cost. Reports/patch preserve reproducibility. These are diagnostic successive runs, not performance acceptance. Do not collapse distinct shader variants to improve counts.

PR159 verified OPEN/draft with the correct experimental head. Remaining focus is admission under streaming and first target shader/resource preparation. Scheduler remains opt-in; overall objective remains unfinished.


## Admission conditions and rejected bounded debt batching

Added optional `WG_FRAME_SCHEDULER_DIAGNOSTICS=1` (query frameSchedulerDiagnostics) counters for pending frames that run zero measured work. Records CPU, callback lateness, zero headroom, CPU pressure, low policy budget and the elapsed guard. These are overlapping conditions, not mutually exclusive attribution. Policy/elapsed proxies use the default 0.25 ms estimate. No per-frame journal or allocation; counters absent by default.

`quality-staged-admission-reasons-1.json`: between first and last admission of the initial media preparation, 56 pending zero-work frames all coincide with mandatory CPU pressure (at least 85% of target period); 27 also have late callbacks. Their mandatory CPU sums 1247.39 ms. Thus relaxing admission cannot safely solve this phase. Cumulative counters include loading and waits outside a phase, so subtract within-phase snapshots before attribution.

Tested allowing multiple tiny overdue continuations within a bounded debt envelope (12% of refresh, existing CPU/lateness guards retained). `quality-staged-bounded-debt-1.json`: prep media/baja/media/baja 10581/6674/748/979 ms versus 9207/8049/757/832 ms in preceding diagnostic reference. RAF P95 67.2/49.6/56.1/45.1 versus 76.3/47.4/45.0/45.8 ms; maxima 216.8/148.2/62.7/77.2 versus 202.2/195.3/88.6/56.6 ms. No consistent benefit, especially warm variants; successive pilots are not ABAB acceptance. No unexpected GL failures.

Rejected the debt-batching policy and restored previous admission behavior. `bounded-debt-rejected.patch` reproduces the candidate from 3639ff662 and includes the diagnostic additions that are retained. Only optional diagnostics and their test remain active. Next investigation should attribute and split mandatory graphical preparation during native streaming, rather than repeatedly relax safety limits. The expensive first cold shader preparation also remains unresolved. Overall scheduler success remains unproven.
