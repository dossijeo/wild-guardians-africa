# Global Frame Scheduler â€” work in progress

Reference: `54075e228`, experimental branch only. Candidate opt-in: `?frameScheduler=1`. No performance benefit claimed yet. No scheduler migration is complete.

## Current status (2026-10-24; supersedes historical checkpoints below)

Candidate remains opt-in with `frameScheduler=1`; main unchanged, PR159 draft.
It now includes stable shadow recipes, dormant crop depth preparation and
first fixed512 recipe preparation before world compilation,
private terrain staging, bounded overlap with native generation, actor queue
admission and depth-preparation transactions. Default path remains the control.
Earlier sections below are chronological experiments, not current API status.

Structural shader reuse removed the measured multi-second quality recompilation
in controlled experiments. Do NOT generalize that result to overall scheduler
acceptance: full-frame streaming tails and throughput have not improved
consistently. Unit/lifecycle coverage and six-biome active quality checks pass;
fixed-view day/night comparisons preserve the approved image within measured
small pixel differences. Broader workload/hardware acceptance is outstanding.

Remaining important integration gaps: initial screen compilation, texture
uploads, far asset preparation and some loading yields still use specialized
budgets. Do not blindly nest scheduled compilation inside a borrowed depth
transaction: the borrowed material state must survive synchronous submission
and be restored before awaiting readiness. Native simulation/navigation remain
outside optional work scheduling by design. Dependency/coalescing and memory
backpressure are not universal; bounded producer admission alone is not a
memory limit. Continue attribution before adding more queue wrappers.

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


## Confirmed starvation of expensive estimated terrain units

Added QA-only world update phase attribution through the existing loadingSyncWitness path, plus a 120-second host watchdog and periodic status snapshots. One initial run was manually interrupted; repeated runs hit the watchdog. No phase timing result is accepted from these incomplete runs. The finite gameplay witness route passes its new unit test, but instrumentation/timing perturbation may affect which outlier is first observed.

`quality-staged-mandatory-phases-4.failure.json` captures the actual stall: two terrain jobs remain at estimated cost 14.005 ms for tens of seconds (observed ages above 79 seconds), completed=177/units=551 stop advancing, while presentation continues, mandatory CPU P95 is around 7.9 ms, budget around 2.2 ms, 30 chunks installed, eight queued and two preparing. No runtime-error pause; native pipeline backpressure follows the stalled graphical stage. Earlier snapshot had budget 3.58 ms and the same estimates.

Code cause: terrain stores a conservative per-phase maximum/decay updated ONLY after execution. Global admission requires that estimate fit headroom or an expired-deadline loan limited to half the target period (~8.33 ms). A 14 ms observation can therefore make subsequent units inadmissible indefinitely; without executing they cannot revise their estimate. This contradicts the throughput/no-starvation requirement. Do not blame pthread generation or assume measured 14 ms proves every later unit costs 14 ms.

Optional job labels now let QA identify the exact pending terrain phase without per-frame traversal or production logging. Next fix must address oversized/uncertain units and phase subdivision explicitly; merely lowering estimates or increasing all frame budgets could hide stalls. Scheduler remains off by default. The diagnosis is progress, not performance success, and the user objective remains open.


## Incremental mud edges and bounded oversized-estimate recovery

A subsequent phase-attribution run completed (`quality-staged-phase-labels-1.json`), so the earlier hang is not an inevitable property of the witness route. Largest mandatory phase stalls occur in final drawing: first media max 193.1 ms, first baja 104.4 ms. Mangrove cache phase max is below 0.8 ms in that run. Splitting arbitrary mandatory scene updates would not explain those draw stalls.

Terrain-specific observations (`quality-staged-terrain-costs-1.json`) identify mud-edge construction as the largest repeated preparation unit: 51.55 ms over 15 chunks, max 5.385 ms; mud geometry 40.02 ms/max 4.15 ms. Edge work is now a shared generator: terrain-grid lookup and vertex interpolation/distance computation yield every 256 vertices; attributes/material publish together only after preparation. Ordinary synchronous callers drain the same implementation. No geometry, material recipe, texture or lighting is altered. CPU buildMs excludes suspended wall time. Cancellation before publication leaves the original material/attributes owned by the private chunk.

`quality-staged-mud-slices-1.json`: grid max 0.090 ms, vertex blocks max 0.720 ms, publish max 0.335 ms. Total edge work remains ~52.29 ms versus 51.55 ms; this is distribution, not eliminated computation. Scheduler coordination totals 60.1 versus 61.0 ms despite more units. Initial preparation latency 11.27 versus 10.80 s, warm transitions mixed; no overall performance win established from this successive pilot pair. Draw peaks remain and repeated equivalent-image ABAB is pending.

For the confirmed estimate-poisoning failure, an overdue unit larger than the ordinary loan limit may now recover after one 2-second observation window. A recovery requires current mandatory CPU below 85% of target, estimated CPU+unit within two target periods, and elapsed callback+unit within three periods. Exactly one unit runs, then the drain ends; recoveries are globally separated by 2 seconds and counted separately as oversizeRecoveries. Estimates are not reduced and this is explicitly an overrun, not idle time. This escape route is NOT a performance optimization or a guarantee for arbitrarily large atomic tasks. Units exceeding the remaining safety limits still require subdivision/offloading; persistent mandatory overload also remains a limitation.

Real correctness fault injection (`scheduler-estimate-recovery-fault-1.json`, WG_THREAD_ESTIMATE_OUTLIER=1): first two terrain units deliberately estimate 14 ms until first execution. Both recover, plus one naturally expensive water-edge case; total recoveries=3. Active run installs 15 additional chunks, final queued/preparing/pending=0, failed=0, and all quality transitions complete without unexpected GL errors. Injection changes scheduling deliberately; none of its timings are performance acceptance evidence.

65 relevant tests pass, including byte-identical synchronous/incremental attributes, unchanged shader key, no partial publication, cancellation ownership, oversized-estimate recovery/cooldown/mandatory CPU guards, native pipeline lifetime and compiler cancellation. Scheduler stays opt-in, PR remains draft, main untouched. Next work is real draw-call/driver attribution and reducing cold quality compilation; full objective remains incomplete.


## Driver attribution: dormant crop depth variants

Real active quality/streaming attribution (`quality-staged-driver-attribution-1.json`) identifies getProgramInfoLog calls of 187.9 and 120.1 ms inside final rendering for `bioma-local-bridge-depth-v3`. Nested render/draw durations overlap these GL calls and must not be summed. This is synchronous driver-facing wall time, not measured GPU execution. Instrumentation is diagnostic; it adds overhead.

Three r180 sources explain the missing recipes. Crop bridge meshes start invisible with zero instances. Loading's visible-only depth preparation omits these future crop stages. World-depth capture compiles authored depth without a map, with scene fog and shadows disabled. WebGLShadowMap later copies source map/alphaMap into customDepthMaterial and uses an empty scene (no fog), while renderer shadowMap remains enabled. These differences change program keys despite representing the same crop geometry.

QA experiment (`WG_THREAD_CROP_DEPTH_WARM=1`) prepares 32 dormant bridge objects through the existing depth preparation API, then initializes program reflection. No new geometry or draw pass. `quality-staged-crop-depth-warm-1.json`: 229.4 ms extra preparation; the 187.9 ms no-map stall disappears, but mapped shadow recipe still incurs 139.7 ms. Merely copying maps was insufficient: `quality-staged-crop-depth-dual-1.json` adds 492.4 ms preparation but still incurs 158.6 ms because fog/shadow-enabled recipe bits differ.

Corrected shadow preparation (`WG_THREAD_CROP_DEPTH_SHADOW_WARM=1` together with the first flag) synchronously selects source maps, null fog and enabled shadows in the linear depth target; all borrowed material/renderer state is restored before waiting. Temporary program ownership remains bounded. `quality-staged-crop-depth-native-1.json` records both exact expected cache keys, 32 specialized objects, 539.99 ms extra preparation, and no crop-depth getProgramInfoLog stall above the 10 ms attribution threshold during active gameplay. Other programs still stall 81.2/73.3 ms. First media max RAF 115.2 ms versus baseline 235.4 ms, but first baja max 183.8 versus 173.0 ms; successive diagnostics are NOT ABAB acceptance or a global performance win.

This remains a QA experiment, not an automatic production warmup. The 540 ms is explicitly additional work, not hidden from load cost. It proves a specific recipe omission can be removed; it does not justify warming every possible material. Next: move this bounded, precisely selected preparation into the existing loading coordinator, retain cancellation/context ownership, test restoration/failure, and measure loading responsiveness and whole-frame effects with repeated comparisons. Remaining generic/obstruction program stalls and cold quality preparation still require work. Main unchanged; scheduler remains opt-in.


## Dormant crop preparation integrated into loading (opt-in)

`crop-depth-preparation.js` now implements the exact two audited recipes in the existing loading depth executor. `?cropDepthPreparation=1` invokes it from WorldScene.warmAnimalGpu, before bindings and real draw warmup; the default remains unchanged. It registers disposal/context cancellation, checks the resource epoch, bounds program retention, restores fog/maps/shadow settings synchronously before readiness, and uses a cancellable frame wait for reflection. No new RAF loop, geometry, draw pass or lighting change. This is initial stable-scene preparation only, not a concurrent live-scene mutation API. Depth batches still use the existing loading executor; global admission of complete state-owning batches remains pending (never schedule the inner compiler while borrowing renderer state).

Reproduction: existing active staged-quality command with `WG_THREAD_PORT=5190 WG_THREAD_DEFAULT_STREAMING=1 WG_THREAD_FROZEN=1 WG_THREAD_QUALITY_CYCLE=1 WG_THREAD_QUALITY_ACTIVE=1 WG_THREAD_QUALITY_STAGED=1 WG_FRAME_SCHEDULER=1 WG_THREAD_QUALITY_PHASES=1 WG_THREAD_QUALITY_ATTRIBUTION=1`, additionally `WG_THREAD_CROP_DEPTH_PREPARATION=1` for candidate, unique WG_THREAD_REPORT. The older QA pre-activation flags are NOT enabled. Raw evidence: quality-loading-crop-depth-1.json and quality-loading-crop-control-1.json.

Candidate then control, same Manglares fixture/hardware/720p, serial runs (BA diagnostic pair, not repeated ABAB acceptance):

| Metric | Control | Integrated preparation |
|---|---:|---:|
| Full initial ready latency | 29,017.90 ms | 28,825.40 ms |
| Explicit crop preparation within load | none | 403.04 ms |
| First media max presentation interval | 218.75 ms | 113.61 ms |
| First baja max presentation interval | 133.84 ms | 164.23 ms |
| Warm media / baja max interval | 78.04 / 63.47 ms | 81.78 / 82.99 ms |
| First media transition latency | 10,689.89 ms | 12,109.40 ms |
| Crop depth getProgramInfoLog >10 ms | 168.05, 123.10 ms | none |
| Newly installed chunks during movement | 15 | 15 |

Candidate prepared 32 objects, initialized 56 resident bindings, retained/released 56 program references with zero destruction/exhaustion. Both tests finish with zero queued/preparing/failed chunks and active simulation advances ~7.33 seconds. Console contains the same 29 known f_environment4 warning entries; harness reports no unexpected errors. Driver-facing CPU calls overlap parent rendering measurements and are not GPU time.

Conclusion: confirms elimination of this specific cold recipe omission inside actual loading, but no whole-pipeline performance acceptance. The ~193 ms difference in total loading is noise, not a demonstrated saving; the explicit 403 ms remains real preparation cost. Other cold shaders and quality latency remain substantial. No default activation, no art acceptance inferred, no main changes. 44 targeted tests pass, including synchronous state restoration on success/failure, aborted work and resource disposal between batches. Full scheduler objective remains open.


## Depth preparation now uses global admission

The existing BuildingDestructionPass.prepareDepth batch executor now optionally submits complete transactions to GlobalFrameScheduler. WorldScene passes its existing scheduler to ordinary loading depth and optional dormant crop preparation. No parallel queue or new RAF was added. With global admission, legacy slack lanes and fixed post-batch frame barriers are bypassed. A shared operation deadline (start + 250 ms) and measured conservative batch cost prevent a refreshed deadline on each batch. Each synchronous unit selects depth materials/target, submits compilation, restores everything and returns its readiness promise; driver waiting is outside scheduler CPU accounting. The inner compile must remain unscheduled while scoped state is borrowed.

Tests exposed and corrected two integration bugs before the real run: a disabled slack lane represented by false instead of null, and reading depth statistics before checking cancellation of an unstarted batch. Tests now assert queued state is unchanged, restoration precedes readiness, deadlines do not reset, no redundant frame barrier runs, and stale admission cannot compile. Crop preparation additionally aborts its owned signal on disposal/context loss, withdrawing queued work without requiring another frame; caller abort also propagates and listeners are removed.

Real report `quality-loading-depth-admission-1.json`, same active staged Manglares case as preceding integrated-loading pilot: initial ready 29,173.74 ms vs 28,825.40 ms; crop preparation 282.70 ms vs 403.04 ms; 32 crop objects/56 initialized bindings, all temporary program references released without destruction. First media/baja max presentation intervals 104.50/146.78 ms; warm media/baja 63.11/57.72 ms. Transition latency 11,914.78/7,512.06/1,473.88/1,512.72 ms. This successive pilot does not establish overall speedup; cold quality latency and other atomic stalls remain. Global scheduler now records depth submission work (793 completed jobs, 737.42 ms accumulated optional CPU, 71.17 ms accumulated coordination, max unit 8.98 ms); these lifetime totals include other producers and cannot be compared as isolated scheduler overhead. No scheduler failures. Still opt-in; no main/art changes. Repeated ABAB and broad acceptance remain pending.


## Rejected: blanket live program reflection before quality activation

Remaining attribution after depth admission showed physical obstruction and generic shader getProgramInfoLog stalls of 65.00/53.21 ms during presentation. Tested reflecting all resident programs after staged compilation, before quality activation, as scheduler units. This deliberately includes lazy diagnostics/uniform/attribute queries, not merely compileAsync readiness. Additional costs are counted in the transition, no hidden pause.

First attempt failed: sharing a conservative reflection cost across heterogeneous programs propagated an 83.73 ms atomic driver outlier to unrelated jobs. Admission then refused the next job forever because its estimate exceeded even bounded recovery. `quality-staged-bindings-1.failure.json` confirms 120 s watchdog failure, last pending age 91.18 s. This is an experimental producer estimate bug; it is not evidence the existing terrain oversize recovery solved all atomic work. Corrected experiment treats distinct one-shot programs independently and remembers successfully initialized programs in a WeakSet; actual driver overruns remain recorded, never relabeled as slack. 26 targeted tests passed, including preventing stale/disposed queries and proving one outlier cannot poison unrelated admission.

Corrected real run `quality-staged-bindings-2.json`: 15 new chunks, active simulation, no failed/pending chunks, no scheduler failures. Preparation reflection wall costs: 330.0/1132.9/232.5/0.1 ms for media/baja/media/baja. Whole transition latencies: 11688.6/8668.0/1329.3/1794.6 ms; presentation maxima 122.6/94.6/110.9/81.5 ms. Scheduler max atomic unit 102.165 ms; numerous new getProgramInfoLog calls of 18–84 ms plus 100.17 ms. Initial ready 29262.65 ms. This is a successive diagnostic comparison, not acceptance ABAB.

Decision: reject blanket live reflection. It moves some stalls but also forces initialization of currently unused variants, adding work and still exposing indivisible driver calls during interactive presentation. It does not demonstrate the requested whole-frame improvement. Restored all four experimental source/test/harness files to 808382ed8. Reproducible patch `live-bindings-rejected.patch` preserves the corrected experiment; apply on that base, use the existing staged active command plus WG_THREAD_QUALITY_BINDINGS=1 and crop preparation. Initial failed estimator is described above, not retained as production code. The approved targeted dormant-crop preparation and complete depth admission remain unchanged. Next direction: avoid unnecessary quality recipes and identify exact first-draw omissions; do not warm every resident program merely because it exists. Full global scheduler goal remains open, opt-in, main unchanged.


## Current direct path versus staged candidate: serial A/B/A/B

After rejecting blanket reflection, re-established the actual current direct quality path as the control instead of comparing only prewarming variants. A: no frame scheduler, no staged quality, no dormant crop prewarm. B: frame scheduler + staged quality + cropDepthPreparation, without rejected live bindings. Same current source e625f8e43, Manglares fixture, 720p, native pthread/default streaming, active simulation and moving camera; no builds/tests concurrently. Order A1/B1/A2/B2. Reports `quality-current-direct-{A1,B1,A2,B2}.json`, aggregate `quality-current-direct-ABAB-summary.json` (nearest-rank percentiles). This is a bundle comparison; it cannot attribute the benefit to scheduler alone.

| Metric | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Initial ready ms | 28211 | 29856 | 28324 | 28910 |
| First baja transition ms | 6881 | 7745 | 6809 | 8265 |
| First baja max presentation interval ms | 6277 | 162 | 6273 | 156 |
| First baja p95 / p99 ms | 6277 / 6277 | 55 / 84 | 6273 / 6273 | 56 / 67 |
| Warm media max interval ms | 89 | 83 | 92 | 50 |
| Warm baja max interval ms | 95 | 55 | 100 | 97 |

Direct cold activation is demonstrably unacceptable: repeated ~6.27-second presentation blocks, several getProgramInfoLog calls individually hundreds of milliseconds to 1.31 seconds. Staged preparation reduces that extreme substantially in both repetitions, at a latency cost of ~0.86–1.46 seconds for first baja. Contrary to the earlier narrow comparisons, this is evidence of a real benefit over the current direct path, though not complete acceptance. GL timings are synchronous driver-facing durations, not GPU execution; nested spans overlap. Control has very few presentation samples during its blocked interval, so its p95/p99 are unstable descriptors of ordinary steady gameplay. Means/percentiles must not be interpreted as equal-duration frame-rate benchmarks.

Important protocol issue found: the QA loop first prepares media even though media is already active. B pays 11.30/14.27 seconds for that redundant preparation, while the actual settings menu checks previous!==settings.quality and never requests it. A still repeats qualitySetting(media), costing ~0.49/0.54 seconds. This is documented, not silently removed from the evidence; it can warm future programs and changes the subsequent comparison. Next test must skip same-quality requests for BOTH cases and repeat against the actual menu protocol before production integration. No pixel-equivalence or GPU-memory claim is made. Active simulation/stream results are preserved in the aggregate. PR159 verified OPEN/draft on codex/global-visual-lab. No source changes in this turn; no main changes; objective remains open.


## Corrected menu protocol and bounded overlapping compilation

Added explicit `WG_THREAD_QUALITY_MENU_PROTOCOL=1` / qualityMenuProtocol, skipping requests for the already-active quality in BOTH arms, matching main.js settings input. Existing historical protocol remains replayable. No simulation pause, camera or density change. Serial A1/B1/A2/B2 with previous direct/staged flags, reports `quality-menu-protocol-*.json` and aggregate `quality-menu-protocol-ABAB-summary.json`:

| First actual change (media to baja) | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Transition latency ms | 6735 | 14655 | 6735 | 15392 |
| Maximum presentation interval ms | 6210 | 225 | 6327 | 133 |

This corrects the earlier interpretation: staged preparation removes the multi-second freeze but, without the redundant same-quality prewarm, more than doubles first-change latency. That fails the throughput goal and is NOT production acceptance. Fifteen chunks install in every run, with active simulation and empty/failure-free queues. Quantiles/raw samples remain in the aggregate; sparse control frames and differing transition lengths limit percentile interpretation. No GPU execution timing or visual equivalence claim.

Investigated readiness serialization: prepareLiveScenePrograms awaited each batch before submitting the next, even though submission restores borrowed state synchronously and driver readiness can overlap. Added bounded `concurrency` (1 default, integer 1..8), using waves of independent batches. Admission remains global, each batch retains its existing guards, and all wave promises settle before returning/throwing so temporary program ownership cannot end while another transaction is pending. Only disposed-resource batches retry. No new RAF/executor; no default behavior change. Tests cover actual overlapping pending promises, concurrency bound, draining on shader failure, shared transparent version mutations, cancellation, deadlines and compiler ownership (34 targeted tests pass).

Pilot `WG_THREAD_QUALITY_COMPILE_CONCURRENCY=4` with corrected protocol (`quality-menu-wave4-1.json`): first baja latency 12733.4 ms, max interval 164.4 ms; media 1571.1/71.4 ms, warm baja 1315.4/59.8 ms. First operation: 207 batches, 1544 accepted objects, 2 disposed-resource invalidations handled, no pending objects. Fifteen streamed chunks complete, no native/scheduler failures. Global lifetime optional CPU 675.04 ms, coordination 60.88 ms, max unit 8.79 ms; these are not isolated compile costs. Initial ready 29033.7 ms. One pilot suggests ~1.9–2.7 s less latency than sequential staged runs but still ~2x direct latency; no default activation or claim beyond that. Further interleaving and recipe-selection/driver attribution are needed. Art and main unchanged; full scheduler goal remains open.


## Deadline microbatch admission: inconclusive, archived rather than enabled

Detailed wave4 first-transition spans: 207 submissions total only 97.99 ms synchronous CPU; admission interval union 6989.56 ms, readiness interval union 6221.22 ms, overall preparation 11950.12 ms. Unions overlap; never sum them as mutually exclusive costs. 198/207 admission snapshots have ordinary budget zero, with CPU p95 10.895–23.410 ms. The requested 60 Hz deadline remains fixed; slow presentation alone is not spare capacity.

Tested optional multiple tiny overdue units instead of always breaking after the first deadline loan. Cumulative debt capped at 12% of target period, existing mandatory CPU (<85% target), CPU-total and elapsed-time guards retained. First pilot counted work only; final patch also counts coordination/continuation elapsed time in the cumulative cap and CPU guard. Large units/oversize recovery remain single-unit. Tests cover four cheap units within a 2 ms cumulative allowance at 60 Hz, rejection on mandatory overload and excessive lateness; 24 scheduler/live preparation tests passed before the pilot, 14 scheduler tests after the stricter accounting.

Sequence (all corrected menu protocol and wave4): previous control 12733.4 ms first baja /164.4 ms max presentation; first experimental pilot `quality-menu-deadline-batch-1.json` 11295.0/134.9 ms; repeated control `quality-menu-wave4-control2.json` 13393/154 ms; final stricter candidate `quality-menu-deadline-batch-2.json` 12740/191 ms. All install 15 chunks with active simulation and empty, failure-free queues. Candidate warm media/baja 1563/1462 ms, max59/78ms. This is NOT a clean identical-candidate ABAB because the accounting guard was tightened between pilots. The final result overlaps the earlier control and worsens the maximum in its paired run; no robust benefit established. Do not promote the optimistic first pilot.

Archived final experiment as `deadline-batching-unproven.patch`, restored all source/test/harness edits to 64a6bf506. No extra scheduling mode accumulated in production. Next investigate eliminating the structural cause: shadowMap.enabled changes the program key for the entire Three scene. Native shadows already have uNativeShadowOn, but standard shadow consumers and actual shadow-pass execution must also be accounted for before testing stable shader variants with dynamic shadow disabling. Must preserve low-quality output and measure GPU overhead; no conclusion yet. Default scheduler still opt-in, main and approved artwork untouched.


## Structural candidate: stable shadow programs, dynamic quality contribution

`?stableShadowPrograms=1` / `WG_THREAD_STABLE_SHADOW_PROGRAMS=1` keeps renderer.shadowMap.enabled true across media/baja quality switches, avoiding the global WebGLPrograms shadowMapEnabled key change and material-wide needsUpdate. This does NOT keep low-quality shadows visible or rendering: sun.userData.nativeShadowDisabled gates the native shadow pass and uNativeShadowOn; standard shadow consumers receive shadow.intensity=0 (the original intensity is restored on enable). Asset shadow proxy preparation bypasses an all-disabled light list. Native shadow wrapper filters only its disabled sun, preserving other lights. Destruction and VFX packed-shadow uniforms also honor the logical switch. Existing quality-dependent shadow target resizing/disposal remains. Ground materials, geometry, caches, vegetation and simulation are unchanged. Feature defaults OFF.

First active same-menu-protocol pilot `quality-stable-shadow-programs-1.json`, no scheduler, no staged compilation, no crop prewarm: first baja transition 512.6 ms, max presentation 56.8 ms; media 738.9/133.0 ms; baja 899.8/115.5 ms. Compare current direct controls from preceding menu ABAB: first baja 6735 ms with max6210/6327 ms. Native streaming installs15 chunks, simulation advances, no failures/pending jobs. Remaining first-use GL calls ~75/129ms are not solved. This is a strong structural lead, not full repeated acceptance.

Frozen visual/streaming pair: `stable-shadow-visual-control.json` and `stable-shadow-visual-candidate.json`. Same fixture, camera, hour, viewport1280x720, quality cycle baja/media/baja; screenshots wait120 settled frames. Inspected side-by-side images `stable-shadow-pair-{1-baja,2-media,3-baja}.jpg`. Settled draw calls match exactly72/80/72. Pixel MAD per channel (0..255) is0.00548/0.000303/0.00389; fraction of pixels with any channel difference>8 is0.000245/0/0.000180. Full captures and `stable-shadow-visual-difference.json` retained. Terrain, fern density, buildings, water and shadow re-enabling appear equivalent in these views; not a claim for every biome/time/effect.

After those captures, matched paused moving-camera streaming runs on ANGLE Intel UHD D3D11: 61 GPU samples each, control mean22.4709/p9531.3871/max37.6139 ms, candidate mean20.9583/p9529.2805/max34.0712 ms. CPU render mean7.956/6.781 ms; presentation mean27.253/25.036 ms, p95~49.9ms both. Successive pair, not repeated ABAB: do NOT claim a GPU speedup from this difference; it does not show a gross GPU penalty. Programs at settled quality steps are roughly107 control vs82 candidate (count, not measured allocation bytes). Known f_environment4 compiler warnings remain; no unexpected QA errors.

70 targeted tests pass: native shadow filtering/uniform safety, existing cache and target behavior, stable-program material preservation, asset shadows, quality, VFX and buildings/destruction. Existing quality fixture lacked refreshStreamingPrograms despite production calling it; added a no-op to the mock, without weakening assertions. Production Vite build passes (existing large-bundle warning). Pending: repeated active comparisons, night, initial-low/context restore/rapid changes, other five biomes, shadow-related VFX inspection and GPU/memory validation. Preserve this opt-in structural candidate; do not promote blanket prewarm or declare scheduler complete. Main untouched; PR remains draft.


## Stable shadows: six-biome sustained simulation, night, initial-low and context restoration

Initial cross-biome QA stopped in Sabana because the quality harness incorrectly required Manglares' retained-program policy everywhere (`stable-shadow-active-sabana.failure.json`). Fixed the harness to require retention iff streamingOptions.retainPrograms is configured, asserting its absence otherwise. No runtime policy was changed. Initial v2 runs also exposed tutorial pauses: Sabana/Gran Río/Volcanes advanced only ~0.116 seconds, and Gran Cañón failed its activity assertion. These v2 files are lifecycle observations, NOT sustained simulation acceptance; failures are preserved.

Strict v3 repeats use existing WG_THREAD_ACTIVE=1 fixture setup (tutorial explicitly skipped only in QA), and qualityRequireActive records advancing/paused camera frames and pause reasons. It rejects <90% advancing or >5% paused frames instead of accepting any positive elapsed delta. Every biome passes 240/240 advancing frames, zero paused, 15 newly installed chunks, empty queues and zero stream failures. `stable-shadow-active-six-biomes-summary.json` links all six v3 reports. Quality transition latencies / maximum RAF intervals, milliseconds:

| Biome | baja | media | baja |
|---|---|---|---|
| Sabana | 346 / 47 | 588 / 87 | 643 / 75 |
| Gran Río | 350 / 53 | 636 / 68 | 660 / 119 |
| Desierto | 354 / 31 | 413 / 45 | 287 / 25 |
| Volcanes | 452 / 76 | 445 / 55 | 708 / 98 |
| Gran Cañón | 503 / 133 | 292 / 25 | 191 / 18 |
| Manglares | 427 / 68 | 615 / 103 | 820 / 82 |

These are candidate functional runs, not per-biome A/B or visual equivalence. Presentation samples cover transition windows; the remaining camera travel is checked for activity/errors but not included in those window maxima. Manglares strict run also exercises rapid superseding quality changes with program-retention ownership assertions. Default stable shadows remains OFF.

`stable-shadow-low-context.json`: initial quality baja, subsequent quality cycle and forced WebGL context loss/restore. Authoritative snapshot unchanged; pthread backend and 16 MiB native memory preserved; old79 program references abandoned, new28 retained, no unknown GL resource deletions. Real draw resumes. Both raw before/after images retained and inspected. Full-image comparison includes the existing lost-context notification; below y=180 (outside that notification), RGB MAD0.13495/255 and fraction any channel delta>8=0.004897. Not pixel-identical; no visible terrain/material loss in the inspected restored frame. Context test asserts removal of context-lost/runtime-error pause reasons. It does not assert the notification disappears automatically.

Night pair uses the existing controlled Manglares seed712 fixture at time/elapsed450, paused simulation, identical camera and settled quality captures. `stable-shadow-night-control.json`, `stable-shadow-night-candidate.json`, raw PNGs, three side-by-sides and `stable-shadow-night-difference.json`. RGB MAD0.005195/0.001284/0.003701 for baja/media/baja; fractions any-channel delta>8=0.000235/0.0000228/0.0000879. Inspected media pair: same ground, vegetation, buildings, water and illumination. No night GPU performance claim (capture-only comparison). Other-biome image equivalence, repeated GPU A/B, very-low/high profiles and complete scheduler acceptance remain pending. Main and production flags untouched.


### Stable shadow programs: active low-quality ABAB (2026-10-24)

Serial A1/B1/A2/B2 on Intel UHD / ANGLE D3D11, Manglares 1280x720,
initial baja, 360 camera frames / 144m, same seed/fixture, active simulation,
121 GPU timer samples per run. A: stableShadowPrograms=0; B: =1.
No global scheduler or staged quality preparation enabled in this isolation.
All runs installed 15 chunks, had 360 actor-ready frames, zero paused frames,
and settled without stream failures. Simulation advances with wall time;
final entity states are not identical, so these are performance trials rather
than image equivalence captures.

| Run | RAF mean / P95 / max ms | GPU mean / P95 ms | render CPU mean ms |
| --- | --- | --- | --- |
| A1 | 28.22 / 49.95 / 149.65 | 21.37 / 34.19 | 8.40 |
| B1 | 27.85 / 49.96 / 166.32 | 21.52 / 32.11 | 8.37 |
| A2 | 28.64 / 50.35 / 183.01 | 22.11 / 41.52 | 8.30 |
| B2 | 28.55 / 50.04 / 149.53 | 22.26 / 38.21 | 8.53 |

B costs +0.156 ms GPU mean in each pair (~0.7%); insufficient evidence of a
material regression or speedup. Drift between repetitions exceeds that delta.
This supports retaining the candidate for its independently measured quality
transition benefit; it does NOT demonstrate improved steady streaming.
Residual 150–183 ms RAF spikes exist in both paths, with CPU draw maxima
140–169 ms. Attribution still required; do not equate these CPU wall spans
with GPU execution or assume the scheduler can interrupt the underlying call.
Candidate remains opt-in pending remaining visual/profile validation.

Raw data: stable-shadow-active-abab-{A1,B1,A2,B2}.json; compact summary includes
P99, CPU render/draw, GPU and activity checks. Reproduction environment:
WG_THREAD_PORT=5190 WG_THREAD_BIOME=manglares WG_THREAD_DEFAULT_STREAMING=1
WG_THREAD_FROZEN=1 WG_THREAD_ACTIVE=1 WG_THREAD_QUALITY=baja WG_THREAD_BENCH=1
WG_THREAD_GPU=1 WG_THREAD_FRAMES=360 WG_THREAD_DISTANCE=144;
run tools/experiments/check-spatial-thread-game.mjs serially with
WG_THREAD_STABLE_SHADOW_PROGRAMS=0,1,0,1 and distinct WG_THREAD_REPORT paths.


### Residual streaming attribution and integrated ABAB (2026-10-24)

`stable-shadow-stream-attribution-1.json` repeats active baja/360frames/144m
with GL attribution. The long draw is 172 ms, including 157.675 ms in
getProgramInfoLog for key `depth,...,bioma-local-bridge-depth-v3` (id81).
Native publication max1.115ms; native computation max63.68ms is already on
pthread. Terrain installation max22.99ms is separate. Therefore the largest
observed spike is a first-use dormant crop depth program, not native compute.
Do not wrap that atomic driver wait in a scheduler promise.

Reused the existing optional loading-only crop depth preparation, with stable
shadows ON. Serial ABAB isolates scheduler OFF/ON/OFF/ON; both A and B have
crop prewarm, same active low-quality fixture, 720p Intel UHD, GPU timers,
360 camera frames/144m, GL instrumentation. Raw `scheduler-stable-crop-abab-*`.
All four runs: 15 chunks, zero paused frames, no slow GL calls >20ms, no
stream failures. Draw CPU max12.89/12.93/13.76/13.29ms; the identified first-use
compile wait is absent. Crop preparation adds 270–399ms during loading.

| Run | ready ms | RAF mean / P95 / max ms | install mean/max ms | preparation latency mean/max ms |
| --- | --- | --- | --- | --- |
| A1 | 28257 | 27.71 / 49.92 / 83.17 | 12.70 / 26.96 | synchronous |
| B1 | 28274 | 28.68 / 49.93 / 99.79 | 0.53 / 2.57 | 681 / 1525 |
| A2 | 28031 | 27.58 / 49.92 / 99.83 | 10.95 / 19.03 | synchronous |
| B2 | 31084 | 28.18 / 49.92 / 83.17 | 0.58 / 2.14 | 769 / 2024 |

B has 601 preparation slices, maximum4.25/4.12ms, but no convincing overall
frametime improvement. GPU means21.61/21.86/21.63/22.28ms; no speedup claim.
B2 loading is ~3s slower: cannot claim unchanged load cost from B1 alone.
All queues finish, yet per-chunk latency is too high to count as acceptable
throughput. Keep scheduler opt-in. The admission policy currently allows one
small overdue unit per frame when no immediate headroom exists; terrain has
~40 units per chunk. This is a candidate explanation for preparation delay,
not a proved attribution of every wait. Revisit admission/batching using this
integrated workload rather than accepting lower final install cost alone.
Prior generic deadline batching experiment remained inconclusive and is not
silently reintroduced. Further work must preserve CPU/elapsed guards and
measure queue latency plus total presentation, not just units completed.

Reproduce previous active ABAB environment with stableShadowPrograms=1,
WG_THREAD_CROP_DEPTH_PREPARATION=1, WG_THREAD_GL_DETAIL=1 and
WG_FRAME_SCHEDULER=0,1,0,1. Summary includes raw-derived RAF P99 and separates
GPU timings, CPU spans and preparation latency. No default flags changed,
no artistic edits, main untouched. Full scheduler acceptance remains open.


### Admission diagnosis, rejected burst, required-chunk deadline (2026-10-24)

Tested a bounded overdue burst (max25% refresh period, additionally constrained
by mandatory CPU P95 and elapsed/instantaneous guards). Four actual runs in
`scheduler-elastic-debt-*`: preparation mean A1/B1/A2/B2=691/722/729/609ms;
RAF P95 ~49.94–49.97ms, maxima100/83/100/100ms. Direction inconsistent between
pairs; no convincing general benefit. Restored scheduler source and archived
`scheduler-elastic-debt-unproven.patch`, including temporary flag and tests.
Do not activate this policy based on its isolated better repetition.

`scheduler-admission-diagnosis-1.json`: lifetime109 idle-pending frames;
49 no-headroom,20 mandatory pressure,34 late callback,18 policy limited,
only2 elapsed guard (categories overlap). Thus do not relax elapsed guards
based on an unsupported claim that they dominate. Added phase-specific wait
versus CPU measurement to terrain preparation and QA aggregation.
`scheduler-phase-wait-diagnosis-1.json`: setup total3860.7ms wait/15chunks
(257.4ms mean), while setup CPU total0.375ms. The fresh250ms deadline assigned
after native completion needlessly delayed already-required chunks.

Kept a narrow scheduling correction: required terrain preparation deadline is
now immediate; the original bounded admission/CPU/elapsed protections remain.
No batching-policy change, no authoritative world change, no larger budget.
Preparation still owns a private group until complete and validates revisions.

| Run | preparation mean/max ms | initial setup wait mean ms | RAF P95/max ms | ready ms |
| --- | --- | --- | --- | --- |
| A1 delayed250 | 671/1252 | 263 | 49.955/83.175 | 28934 |
| B1 immediate | 419/1046 | 38 | 49.955/83.255 | 27799 |
| A2 delayed250 | 705/1806 | 245 | 49.985/83.155 | 28399 |
| B2 immediate | 607/1174 | 45 | 49.940/83.020 | 28067 |

15 chunks and zero paused frames in every run; no scheduler failures. Both
pairs improve preparation latency, with essentially unchanged P95/max RAF.
This is useful latency progress, NOT evidence that global presentation is now
faster or that scheduler acceptance is complete. Remaining ~1s chunk tails
need investigation. Per-phase waits include all intervening wall time, not
CPU nor native generation. GPU/raw P99 in compact summaries.

Reproduction: prior active low Manglares environment with frameScheduler=1,
stableShadowPrograms=1,cropDepthPreparation=1. During measurement the QA route
used WG_THREAD_TERRAIN_URGENT=1 on B to replace now+250 by now. After adopting
the change, equivalent baseline is WG_THREAD_TERRAIN_DEFERRED=1 on A; B is
unmodified source. QA route asserts exactly one anchor; report now records
terrainDeadline mode. No production flag added. Test confirms required work
starts under late presentation without 250ms grace and measures wait separately;
20 scheduler/terrain tests pass, including quality/context/teardown invalidation.
Global scheduler, stable shadows and crop warmup remain opt-in. Main untouched.


### Grid-only coarsening: not retained (2026-10-24)

Phase wait evidence suggested over-fragmentation of cheap terrain grid indexing.
Tested grid units2048 instead of256 (only grid; expensive edge vertices remain
256). QA source route asserted a unique anchor, no changes to output data.
Same active Manglares720p Intel UHD low fixture, immediate required terrain,
scheduler + stable shadow programs + dormant crop depth preparation,360frames
and144m, serial A/B/A/B/A/B. Raw `scheduler-grid-batch-{A1,B1,A2,B2,A3,B3}`.

| Run | preparation mean/max ms | RAF mean/P95/P99/max ms |
| --- | --- | --- |
| A1 | 598/1429 | 27.53/49.96/82.90/83.40 |
| B1 | 381/909 | 27.81/49.96/83.13/99.79 |
| A2 | 502/872 | 28.04/49.96/66.71/83.32 |
| B2 | 449/1044 | 27.67/49.92/66.66/99.86 |
| A3 | 512/1202 | 27.62/49.93/82.98/99.76 |
| B3 | 568/1060 | 28.36/49.97/83.16/99.77 |

Grid unit count150->30 across15chunks; B max CPU per grid unit0.225/0.450/
0.220ms, so grouping stayed individually cheap. Yet third pair reverses mean
preparation improvement, no convincing P95/P99 improvement, and first two
candidate maxima exceed control by one refresh. Cannot count this as successful
whole-frame optimization. Restored harness, archived QA patch as
`scheduler-grid-batch-unproven.patch`; no new production flag or unit size.
All runs completed15chunks, no paused simulation frames. CPU and GPU in summary
remain separate; wall-time simulation means final states differ.

Next: attribute mandatory main-loop phases and callback/presentation latency.
Remaining RAF83–100ms outliers are not explained by measured draw/installation
alone; do not repeatedly tune tiny optional units or weaken safeguards without
finding that cause. No conclusion that mandatory simulation itself is at fault.
Current required-chunk deadline improvement retained; scheduler still opt-in,
main and approved graphics unchanged.


### Main-loop and browser frame attribution (2026-10-24)

Added QA-only source transform `tools/experiments/main-frame-attribution.js`,
asserting unique anchors in main.js. WG_THREAD_MAIN_PHASES=1 separates tutorial/
pre-simulation, simulation, effects, render, audio, interface and tail; records
whole synchronous mandatory callback and callback lateness against RAF timestamp.
Also wraps existing renderer update iterator steps without changing results,
and observes browser long-animation-frame entries when supported. Observer and
wrappers are removed after measurement. No production instrumentation added.

Two diagnostic runs `scheduler-main-attribution-{1,2}.json`, active low
Manglares720p Intel UHD, current scheduler+immediate required terrain+stable
shadow recipes+crop preparation,360frames/144m. Both finish15chunks without
paused frames or errors. Run1 simulation mean0.240ms/max5.225ms; main callback
max38.33ms, render max37.50ms, audio max0.755ms, interface max7.27ms. RAF max83.17ms.
Thus do not blame simulation or redesign authoritative logic from RAF alone.

Run2 main callback max26.955ms; GPU query mean21.464/P95 30.229/max39.847ms.
Renderer update stage mean/max ms:
0 camera/chunks .462/12.175; 1 LOD+sync1.026/4.190; 2 obstruction .299/1.145;
3 far vegetation .658/5.465; 4 asset groups .852/3.920; 5 effects .206/1.475;
6 origin uniforms .001/.015; 7 material cache .020/.480.

Browser reports18 long-animation frames, ALL blockingDuration0. The two
largest are84.16/82.21ms; time before browser renderStart62.82/64.81ms, attributed
JS20.79/14.43ms. PresentationTime trails paintTime by73/132ms in those entries.
These are browser timing observations, NOT proof of GPU saturation or GPU busy
time; compositor/driver/OS scheduling remains unseparated. Observer entries
cover only >=50ms frames, not the full distribution. No subtraction is treated
as available CPU budget. Strong evidence that these intervals are not simply
83ms main-thread synchronous tasks. Further CPU slicing alone cannot be claimed
to remove them. Retain mandatory logic; do not lower safety guards to chase
unattributed presentation delay.

This changes the next action: evaluate remaining scheduler benefit against
actual CPU blockers/quality transitions and throughput, with presentation and
GPU constraints explicitly separated. Do not indefinitely tune sub-ms grid
units trying to fix these browser intervals. Main/callback phase metrics and
browser entries are archived for reproducibility; full scheduler goal remains
open and opt-in. No simulation, artwork, quality defaults or main changes.


### Integrated active six-biome quality and edit/exit validation (2026-10-24)

Current production source with opt-in frameScheduler=1, stableShadowPrograms=1,
cropDepthPreparation=1, immediate required-terrain deadline. Same populated
fixtures,1280x720 Intel UHD, initial media, menu quality protocol baja/media/baja,
active tutorial-skipped QA fixture, camera travel240frames/144m. One functional
run per biome, NOT six comparative performance claims. Reports
`scheduler-integrated-quality-1.json` (Manglares) and biome-named reports.

| Biome | baja completion/max frame ms | media completion/max | final baja completion/max |
| --- | --- | --- | --- |
| Manglares | 403/52 | 670/88 | 1439/70 |
| Sabana | 404/58 | 507/70 | 1763/117 |
| Gran Río | 475/72 | 488/60 | 1234/98 |
| Desierto | 354/40 | 402/35 | 319/30 |
| Volcanes | 380/39 | 480/58 | 1531/119 |
| Gran Cañón | 634/127 | 253/23 | 228/59 |

All six:240/240 advancing simulation frames, zero paused frames,15new chunks,
zero failed stream jobs, zero pending/preparing/busy at completion, zero
scheduler failures/pending. Final transition completion includes waiting for
chunks while camera is moving plus12presentation frames; a1.76s completion is
NOT a1.76s synchronous freeze. No reappearance of multi-second GL freeze in
these cases. Remaining longest frame127ms and completion latency are not full
acceptance. Functional all-biome integration does not replace paired visual
comparisons or prove improved throughput against the reference.

`scheduler-integrated-edit-exit-1.json`: legal wall build/remove and crop command
overlap confirmed running pthread generation. Old jobs25/31 return-2 and are
replaced; wall rendered, barrier count0->1->0, crop seen by renderer. This fixture
pauses between commands: not an active actor-route or combat stress test.
Then exit with one queued scheduled compilation: compilation rejects as disposed,
scheduler cancels1 and ends pending0/failed0, zero workers, zero late installs,
native state5, menu restored, retained programs83/83 released. Exit wall latency
335ms is asynchronous, not measured main-thread blocking. `recoveryFinished:false`
is recorded by the generic exit harness; this scheduled-exit branch does not
start/await a quality recovery and must not be presented as recovery success.
No resources remaining claimed beyond explicitly checked workers/jobs/program
references; comprehensive GPU leak testing remains pending.

Reproduction: WG_THREAD_PORT=5190, DEFAULT_STREAMING/FROZEN/ACTIVE=1,
QUALITY_CYCLE/QUALITY_ACTIVE/QUALITY_MENU_PROTOCOL=1, STABLE_SHADOW_PROGRAMS=1,
CROP_DEPTH_PREPARATION=1, WG_FRAME_SCHEDULER=1, BIOME each fixture and unique REPORT.
For edit/exit omit active/quality cycle; EDIT=1 EXIT=1 EXIT_PREWARM=scheduled.
Prefixes are WG_THREAD_ except WG_FRAME_SCHEDULER. PR159 verified OPEN/draft,
head codex/global-visual-lab, base main. No default enablement or main merge.


### Integrated Sabana visual equivalence (2026-10-24)

`scheduler-visual-sabana-{control,candidate}.json` and raw quality PNGs use the
same populated seed/camera/time/1280x720 fixture, paused after loading. Quality
menu protocol baja/media/baja;120 settled frames before every screenshot.
Control: scheduler/stable-shadow/crop-preparation off; candidate all three on.
This compares the existing approved art with the integrated architectural
candidate, not main versus laboratory art. No geometry/density edits.

RGB MAD on scale0–255: .002287/.000325/.005029. Fraction pixels with any-channel
absolute delta>8: .000114/.0000033/.000225. Side-by-sides
`scheduler-visual-sabana-pair-{1-baja,2-media,3-baja}.jpg` and difference JSON.
Inspected low and medium pairs: same grass, buildings, ground, background and
quality-appropriate shadows. Not mathematically identical; localized minor
pixel differences remain. This establishes this fixed daytime Sabana scene,
not all cameras/night/other biomes. Capture durations are not benchmarks.
Other-biome paired image validation still pending; flags remain opt-in.
Reproduce WG_THREAD_PORT=5190, BIOME=sabana, DEFAULT_STREAMING/FROZEN=1,
QUALITY=media, QUALITY_CYCLE/QUALITY_MENU_PROTOCOL/QUALITY_CAPTURE=1, all three
candidate flags0 then1, no ACTIVE. Main untouched; PR159 remains draft.


### Integrated four-biome daytime image pairs (2026-10-24)

Completed control/candidate pairs for Gran Río, Desierto, Volcanes, Gran Cañón
using the same paused populated fixtures, seed/camera/time/1280x720, quality
baja/media/baja with120settled frames per capture. Control all three flags off;
candidate scheduler/stableShadowPrograms/cropDepthPreparation on. No source
or artwork changes. Raw reports/screenshots named `scheduler-visual-<biome>-*`;
12 side-by-side JPEGs and `scheduler-visual-four-biomes-difference.json`.

RGB MAD over0–255, baja/media/baja:
Gran Río .003720/.003967/.002270;
Desierto .000108/.000366/.001102;
Volcanes .004714/.004225/.001928;
Gran Cañón .000240/.000041/.000407.
Largest fraction pixels with any-channel delta>8=.000217 (0.0217%).
Inspected first baja and media side-by-sides for all four: ground detail,
coverage, buildings, water/lava, quality-specific shadows and background remain
visually consistent. Third baja also measured, no claim of exact bit equality.
This validates fixed daytime scenes and low/medium profiles, not night/all
camera angles/context restoration or performance. Full integrated nighttime
Manglares still differs in scope from older stable-shadow-only night pairs;
do not conflate these checks. All source flags remain opt-in; PR draft/main
unchanged. Reproduction is the Sabana visual protocol with the four biome ids.


### Consolidated experimental activation and integrated Manglares night (2026-10-24)

`frameScheduler=1` now also selects stable shadow programs and loading-only
crop depth preparation when those options are unspecified. These address the
measured atomic GL stalls that scheduling alone cannot split. No new scheduler
or preparation layer: same previously tested components and lifecycle.
Explicit `stableShadowPrograms=0` / `cropDepthPreparation=0` retain isolated QA
controls; explicit1 still works without scheduler. With no scheduler and no
explicit options, old default behavior remains. Harness now forwards explicit
zero overrides (previously only1). Unit coverage checks scheduler default,
standalone opt-in, explicit opt-out and material identity/shadow intensity.

Night control/candidate `scheduler-bundle-night-*` uses existing controlled
Manglares seed712 night fixture (time450), paused,720p, same camera, low/medium/
low settled captures. Candidate URL has frameScheduler=1 ONLY, no two extra
preparation switches; crop result confirms32objects/56bindings,274.67ms, all
56temporary references released. Control has no crop preparation. The actual
renderer validates the consolidated path, not just its options parsing.

RGB MAD0.003400/.000973/.001615 out of255; fraction delta>8 per pixel
.000174/.0000141/.0000543. Inspected low/medium side-by-sides: matching soil,
fern coverage, water, structures and night illumination. Raw PNGs, pair JPEGs
and difference JSON included. This is visual equivalence, not a performance
claim or broad night/combat validation. Source changes pass renderer-quality,
crop-depth and scheduler unit suites; Vite production build passes (existing
large-bundle warning). Full scheduler remains opt-in pending remaining acceptance;
no claim that its queue API, all producers or all workload profiles are complete.
Main untouched, PR159 draft. Use a single frameScheduler=1 for future integrated
validation; specify explicit zeros only for intentionally isolated comparisons.


### Actor producer backpressure and cancellation (2026-10-24)

LoadingSyncQueue previously submitted each arrival as an independent scheduler
job; a resource burst could exhaust maxPending128 and reject loading. It now
uses its existing FIFO with one outstanding global admission per owner. No new
RAF, timer queue or parallel executor added. Task CPU remains synchronous and
per-task; promise continuations can refill the same presentation budget. The
admission deadline is captured when enqueued, not reset on capacity wait.
Owner abort rejects admitted and producer-held tasks without adoption.

26 loading queue/scheduler tests pass. New tests submit256tasks against global
maxPending1, verify FIFO/results, <=1admission and no global failures; aborting
256tasks leaves zero tasks/jobs and every promise rejected. These are burst
correctness tests, NOT measured game speedups. Producer backlog still retains
its callbacks/assets until processed/cancelled: this is admission pressure
control, not a global asset-memory cap or universal dependency system.

Game pilot `scheduler-actor-backpressure-3.json`: integrated scheduler enabled
with automatic shadow/crop preparation, active Manglares720p, media/baja cycles.
2actor tasks completed, CPU11.18ms/max6.82ms, pending0;240/240advancing frames,
15new chunks, zero stream failures and scheduler pending0. Initial ready37994ms;
this is slower than earlier~28–31s pilots and cannot establish throughput
non-regression without interleaved current control. Do not call this a loading
performance improvement. Actual fixture has2actor tasks and does not reproduce
the256arrival burst; that stress coverage is explicit unit-only evidence.

Attempt1 reached loaded game but QA accessed removed `.scheduled.size`; updated
harness pending count to the single FIFO. Failure JSON retained. Attempt2 timed
out waiting for menu text; failure diagnostic page.evaluate then failed to
respond. Inspected the exact owned Node/Chrome via local inspector, with some
initial failed inspection queries; no timing measurements accepted. Browser
had menu frame, not evidence of actor-load deadlock. Closed only its verified
owned Chrome PID14396(parent40572); runner then exited with menu TimeoutError.
Both failures archived. Added explicit60s menu waits and a5s bounded failure
snapshot so reporting cannot hang behind an unresponsive browser. Attempt3
fresh run passes. No other process terminated; no production/browser launch
flags altered. This bounded producer path remains behind experimental scheduler.
Main unchanged; further loading ABAB needed before default activation.


### Current integrated loading ABAB (2026-10-24)

Reports `scheduler-loading-current-{a1,b1,a2,b2}.json` and summary JSON.
Same Manglares media fixture,1280x720, pthreads, actual default streaming,
frozen at readiness, fresh Chrome each run, no concurrent benchmarks/builds.
A: unchanged default; B: frameScheduler=1 including stable shadow/crop prep.
WG_THREAD_PORT=5190, WG_THREAD_DEFAULT_STREAMING=1, WG_THREAD_FROZEN=1,
WG_THREAD_LOADING_TIMES=1; alternate WG_FRAME_SCHEDULER=0/1/0/1.
This compares the whole current bundle, not isolated actor backpressure.

| Run | Initial readiness | Worker actor phase | GPU preparation phase* | Far assets phase* |
|---|---:|---:|---:|---:|
| A1 |32.170s|58.61ms|8.302s|7.122s|
| B1 |31.435s|188.27ms|8.977s|7.170s|
| A2 |31.322s|58.28ms|8.560s|6.918s|
| B2 |33.128s|134.36ms|8.836s|8.343s|

*Async elapsed phase duration, NOT GPU execution time; nested/overlapping
phases must not be summed. Readiness is measured in-page, not10s host polling.
Paired deltas are -0.734s and +1.807s: no consistent loading improvement or
strong nonregression conclusion. Mean candidate +0.536s (~1.7%) with only two
pairs is not statistical acceptance. Previous38s pilot is not reproduced here,
but that does not establish its cause. Actor CPU remains12.9–14.8ms total for
two tasks: longer actor phase is waiting/other asynchronous work, not evidence
of extra native execution. Far assets variance is substantial and not isolated.

All four finish25chunks, zero stream failures/pending work. Candidates complete
67scheduler jobs/918units, with29.69–31.07ms total coordination during the whole
load (not per frame), no failed jobs. These runs do not measure loading-frame
P95/P99, GPU duration or peak memory; the final scheduler two-second policy
snapshot is NOT a loading latency distribution. Do not use it as one.

Keep the candidate experimental; do not tune a universal budget from these
four observations. Next structural producer attribution should separate far
texture decode/upload, preparation and async waits. Existing far phase witness
can provide that split without changing material quality or atlas density.


### Integrated low-quality context restoration (2026-10-24)

`scheduler-bundle-low-context.json` plus before/after PNGs: scheduler bundle,
Manglares baja, frozen720p fixture. Actual forced WebGL loss/restoration passes:
world snapshot unchanged, pthread backend and16MiB native memory retained,
76old program references abandoned,29new retained,72draw calls after recovery,
GL epoch1, zero unknown deletes, no failure pauses or pending scheduler work.
Recovery elapsed1503ms is asynchronous wall time, not an asserted CPU block or
smoothness result. No compilation was pending in this case; do not infer
interrupted-compilation coverage from it. Inspected images preserve soil,
vegetation, structures/water and low-quality lighting. Existing context-loss
notification remains visible after successful recovery; images are therefore
not globally pixel-identical. This notification/UI issue remains documented.


### Far preparation attribution, no production policy change (2026-10-24)

Harness `WG_THREAD_FAR_TIMES=1` records the existing native-far witness alongside
its original consumer. It does not alter draws, shader recipes or admission.
`scheduler-loading-far-attribution.json` and summary: integrated Manglares media,
ready32.682s, same fixture/default streaming. Spans collected until the
post-readiness snapshot, including preparation completed after readiness;
incomplete spans absent. Do not interpret their sum as the loading critical path.

Found real remaining synchronous submission spikes: far-gpu draw slot0 max
117.395ms and slot2 max65.030ms. Other slots max5.815/9.485ms. These are CPU wall
durations around submission, not GPU timers. Slot0 compilation/readiness max
1178.825ms is ASYNC elapsed; queue waits up to1679.960ms and fence wait up to
989.870ms are NOT CPU freezes. Worker waits717–885ms and ground-seam wait1366ms
also remain asynchronous. Region object creation1.47–2.28ms is much smaller.

This identifies a better next target than blindly splitting cheap object
creation: explain the117ms native draw and repeated preparation/queue ownership.
The loading-only far queue deliberately serializes compile/draw/fence after
parallel texture preparation. Replacing it with a global job that retains
borrowed GL state or awaits fences in the scheduler would be incorrect. Need
atomic submission attribution and resource-recipe reuse before integration;
not established by this single exploratory run. No throughput win claimed.


### Far first-use shader diagnostics: attributed and bounded experiment (2026-10-24)

`far-draw-attribution.js` is QA-only, synchronous wrappers restored in finally.
No extra GL query/draw. `WG_THREAD_FAR_TIMES=1` plus FAR_DRAW_TIMES=1 records
CPU per native API and slow material submissions. Nested durations overlap.
Report `scheduler-far-draw-attribution.json`: worst draw81.875ms includes
51.135ms getProgramInfoLog and26.635ms getShaderInfoLog. bufferData0.080ms.
Main slow recipe smooth-far-opaque48.255ms; another ShaderMaterial29.240ms.
Thus this observed spike is first-use successful-program diagnostics, not
buffer transfer or geometric density. This is attribution, not an A/B speedup.

New explicit opt-in `farValidatedBindings=1` (not implicit in scheduler):
compile readiness snapshots actual selected programs; ready hook validates
LINK_STATUS, then initializes uniform/attribute bindings with Three's success
log queries disabled only for that synchronous call. Debug flag restored in
finally; failed links run full Three diagnostics and reject preparation. No
shader source, geometry, buffers, density, light or render pass removed.
Success warning strings are intentionally not fetched in this experiment;
shader/link failures are not ignored. Three r180-specific, unsupported binding
shape rejects. Hook exceptions and post-hook owner invalidation propagate.
No new RAF, global GL patch or asynchronous borrowed state introduced.

Pilot `scheduler-far-validated-bindings-pilot.json`: maxdraw5.22ms;34binding
initializations total2.565ms/max1.165ms. This showed an opportunity but is not
acceptance, so repeated without per-GL-call wrappers below.

ABAB `scheduler-far-bindings-{a1,b1,a2,b2}.json`, PNGs and summary. Both use
scheduler bundle, same Manglares media1280x720 save, frozen at readiness,
actual defaults/pthreads. Only B adds farValidatedBindings=1. Flags:
WG_THREAD_PORT=5190, DEFAULT_STREAMING=1, FROZEN=1, LOADING_TIMES=1,
FAR_TIMES=1, LOADING_FRAMES=1, LOADING_CAPTURE=1, WG_FRAME_SCHEDULER=1;
alternate FAR_VALIDATED_BINDINGS absent/1/absent/1. Each prefixed WG_THREAD_
except WG_FRAME_SCHEDULER. Fresh browser; serial, no concurrent builds/tests.

| Run | Ready | Far draw max | Binding max | Load RAF P95/P99/max |
|---|---:|---:|---:|---:|
| A1 |33.883s|126.87ms|not separately prepared|66.54/133.32/947.83ms|
| B1 |32.882s|5.41ms|30.73ms|66.52/149.67/964.33ms|
| A2 |31.551s|129.00ms|not separately prepared|49.94/133.15/964.35ms|
| B2 |31.848s|5.25ms|23.17ms|66.45/133.01/1130.87ms|

28far draws in each case. B bindings total32.06/30.61ms, versus A total draw
CPU208.98/210.50ms, B draw40.68/38.49ms. Strong localized CPU reduction, but
NOT complete-frame or loading-throughput acceptance. P95 does not improve;
B2 max is worse. Largest loading frame remains about1s, outside measured main
RAF callback (callback max10–14ms), requiring attribution of asynchronous
continuations/driver work; do not label it GPU without evidence. Hook still has
23–31ms atomic outliers. Candidate stays a separate gate pending this diagnosis.

Both image pairs inspected at fixed view; RGB MAD .003030/.000401 out of255,
fraction pixels delta>8 .000155/.00000543. Same25chunks, no pending scheduler
work. Scope is fixed daytime Manglares, not all-biome/night/moving equivalence.
45 unit tests pass across compiler, binding validation and QA wrappers,
including failed link rejection/debug restoration, cancellation and ready-hook
errors. Vite production build passes (6.72s, existing bundle-size warning). Full
acceptance and platform distribution tests remain pending for this variant.


### Remaining loading peak: browser long frame and CPU profile (2026-10-24)

`scheduler-loading-long-frame-attribution.json`: observed943ms long animation
frame,892.62ms blockingDuration,939.71ms script continuation attributed to
wait-gpu-frame RAF resolver. That resolver is an async origin, NOT proof the
wait itself consumes CPU. Added opt-in LOADING_LONG_FRAMES observer and
LOADING_CPU_PROFILE CDP sampler in QA harness; no extra animation loop or
production instrumentation. Existing frame timings omit async continuations,
so their low callback maximum could not exclude a main-thread stall.

`scheduler-loading-block-profile.json/.cpuprofile` and summary expose cumulative
sampled self-time, not exact atomic-call duration: texSubImage2D under
initializeLoadingTextures~930ms; getProgramInfoLog under renderLoadingFrame~915ms;
getProgramInfoLog under initializeProgramBindingsAsync~699ms; getContext under
GuardianMesh/SpriteMesh~795ms and renderer construction~223ms. Profile overhead
and OS scheduling apply; do not compare this run's speed to non-profiled ABAB.

Next actions are therefore concrete: identify upload sampler sizes/source and
first-use program recipes; remove redundant successful diagnostics where safe,
then address actual texture upload/context creation cost. Do not place one
large texSubImage2D in a scheduler job and claim it is interruptible. No change
to assets, density, simulation, or those other producers made in this checkpoint.


### Texture identity diagnosis and revised priority (2026-10-24)

QA flag WG_THREAD_TEXTURE_TIMES=1 wraps the existing initTexture call only and
records dimensions/type/name/mips. `scheduler-loading-texture-attribution.json`
and summary: largest upload168.885ms for named normal2048x2048 ImageBitmap;
other2048x2048 bitmaps139.730/95.815/71.070ms. All these already use decoded
ImageBitmap, mipmaps enabled. A4096x2048 bitmap without mipmaps takes54.950ms.
Generic GLTF texture names do not yet identify the owning asset, so do not
claim a specific actor/building source. Adding another decoder worker does not
address the observed upload cost. Measurements are synchronous wall duration,
not GPU timers, and this run is diagnostic only.

Re-examined consecutive identical-node samples in the previous CPU profile:
longest non-idle streak~897.08ms getProgramInfoLog, ~795.25ms getContext, and
~150.99ms texSubImage2D. Sampling streaks are approximate, not exact GL timing.
The earlier~930ms texture figure was cumulative, NOT a single900ms upload.
Priority is therefore first-render deferred diagnostics as well as structural
texture preparation; do not attempt to explain the full1s spike by one texture.
No production path changed in this diagnostic checkpoint.


### Fixed512 recipe prepared too late: structural loading correction (2026-10-24)

`scheduler-first-world-draw-attribution.json` with QA LOADING_DRAW_TIMES=1:
first world draw897.8ms, MeshStandardMaterial2401vertices851.95ms, three program
links, getProgramInfoLog875.79ms(max848.22ms). Buffer creation only1.225ms.
Cache code patches material on its first published target, after ordinary warm
compilation. This creates a new fixed512 recipe at first render. Success-log
suppression alone would not ensure compilation had finished for this variant.

Explicit experiment `groundCachePreparation=1`: call existing
prepareFrameResources once before warm-compile-world. First published fixed512
material participates in normal batched compilation/readiness/binding warmup;
later chunks reuse its program recipe with their own cache textures. No extra
cache resolution, texture clone, lighting change or geometry. Uses existing
cache owner/cancellation disposal; no new scheduler or RAF. Default remains
unchanged pending broader validation. This is ordering of real work, not a
promise wrapped around the first render.

Pilot `scheduler-ground-cache-preparation-pilot.json`: initial ground recipe
68.68ms, first draw78.44ms, remaining slow recipes depth43.21ms and shader21.37ms;
large ground link absent. Ready31.312s, maxRAF415.66ms. Pilot diagnostic wrapper
is excluded from the acceptance comparison below.

ABAB `scheduler-cache-recipe-{a1,b1,a2,b2}.json`, PNGs and summary: both scheduler
bundles, Manglares media720p same frozen fixture, fresh Chrome, serial runs.
Flags WG_THREAD_PORT=5190, DEFAULT_STREAMING=1,FROZEN=1,LOADING_TIMES=1,
LOADING_FRAMES=1,LOADING_CAPTURE=1 (WG_THREAD_ prefix), WG_FRAME_SCHEDULER=1.
Alternate WG_THREAD_GROUND_CACHE_PREPARATION=0/1/0/1; zero currently means absent
URL opt-in. No farValidatedBindings or per-GL instrumentation in these runs.

| Run | Ready | RAF P95 | RAF P99 | RAF max |
|---|---:|---:|---:|---:|
| A1 |33.775s|66.515ms|150.320ms|948.205ms|
| B1 |31.974s|66.335ms|116.635ms|415.815ms|
| A2 |32.234s|66.510ms|132.950ms|931.190ms|
| B2 |31.534s|50.040ms|99.815ms|432.365ms|

Two pairs consistently reduce worst presentation intervals/P99, without longer
loading; this is real loading-frame improvement, not only a function timing.
Not yet universal acceptance: total load speed difference has variability and
only two pairs, P95 unchanged in first pair, residual400+ms peaks remain.
Recipe preparation itself is65.30/73.97ms atomic GPU-facing work, still too
large for a smooth frame and requires further preparation. GPU time not measured.

All25chunks finish, zero scheduler pending. Fixed-view visual RGB MAD
.001483/.000491 out of255, fraction pixels delta>8 .0000304/.00000651. First pair
visually inspected, both pairs numerically compared. Ground/ferns/shadows retain
approved appearance. No claim of all-camera/night/all-biome equivalence.
Six targeted tests pass including first publication exposing same shader key
as subsequent chunks with distinct texture owners, budget reserve, invalidations
and owner events. PR159 rechecked OPEN/draft, base main unchanged.


### Cache preparation consolidated with scheduler; nighttime lifecycle (2026-10-24)

After the repeated daytime loading benefit, `frameScheduler=1` now also selects
first fixed512 recipe preparation unless groundCachePreparation=0 explicitly.
Explicit1 works standalone; no scheduler/no option preserves old default. The
harness forwards0 and1. Reproducing historical controls at this commit requires
explicit0; old reports without the option reflect the earlier opt-in version.
This removes an extra activation requirement, not the separate experimental
farValidatedBindings switch (that change lacks global acceptance).

`scheduler-cache-night-low-context.json` validates the earlier explicit recipe
option in Manglares night,baja,720p. Real loss/restoration: snapshot unchanged,
shared pthread16MiB,76old retained references abandoned,28new retained,
29programs/73draw calls,GL epoch1,zero unknown deletes,no GL error/failure pause.
Recovery1380.565ms asynchronous elapsed, not a smoothness result. Notification
remains after recovery as previously documented. Below y180 to exclude it,
RGB MAD.071198/255, fraction delta>8 .002229; full image MAD1.06150 is reported
separately. No pending-compilation cancellation exercised in this case.

`scheduler-cache-night-bundle-{control,candidate}.json/.png` and summary then
verify actual consolidated activation: control URL explicitly0, candidate URL
only frameScheduler1, no cache option. Candidate reports65.16ms recipe phase;
control has none. Same controlled night fixture(time450),baja,1280x720,25chunks,
zero pending jobs. RGB MAD.002626/255, fraction delta>8 .0001204. These fixed-view
visual runs are not repeated performance acceptance;31.826s versus34.178s
readiness is exploratory only. Day/night appearance and lifecycle remain
consistent; all hardware/camera/quality acceptance remains outstanding.


Active integration check `scheduler-cache-bundle-active-quality.json` then
immediate explicit0 control `scheduler-cache-bundle-active-control.json`:
low/media/low transition durations candidate2032/2130/5604ms, control
2101/2156/6154ms. Per-step maximum RAF candidate228/392/359ms versus
control248/313/271ms. This is NOT a fluency pass: both are substantially slower
than historical integrated-quality-1(403/670/1439ms), and frame tails remain high.
Historical actor-backpressure-3 already showed2071/2285/5594ms before this cache
ordering change; the slower behavior therefore predates it. Do not conclude
thermal/browser cause without attribution, nor claim the new preparation fixes
quality transitions. This single B/A check cannot establish small differences.

Both runs240/240advancing,0paused,15new chunks,zero stream failures/queues and
scheduler pending0. Native/visual lifecycle functional check passes; full-frame
quality performance remains explicitly unresolved. Initial cache residency
35,209,000bytes (about33.58MiB) unchanged across first two quality steps; final
travel legitimately evicts/replaces chunks. Not a driver VRAM measurement or
long-session leak test. Preserve the measured loading improvement inside the
still-opt-in scheduler bundle while investigating this existing active-workload
cost; do not promote the overall scheduler to default.


### Active quality attribution: distinguish QA stalls from game work (2026-10-24)

No renderer change in this attribution step. `scheduler-current-quality-attribution.json`
finds maximum instrumented WorldScene.render CPU 23.75ms; terrain/group phases
mostly below5ms. It does not explain hundreds of milliseconds of presentation delay.
`scheduler-quality-execution-attribution.json` records existing main callback CPU,
Long Animation Frames and asynchronous render GPU timer intervals. Intel UHD
0x9A60/D3D11 is confirmed. Main callback maximum25.78ms;81GPU samples average
82.33ms, maximum246.64ms, no disjoint. These query intervals include pipeline
bubbles and query overhead; they are not exclusive GPU busy time. Largest LoAF
734.29ms includes an anonymous RAF continuation593.06ms while main callback
is10.45ms. Do not infer native generation or scheduler CPU saturation from RAF.

`scheduler-quality-block-profile.json/.cpuprofile` attributes749.1ms cumulative
sampled self time to getError under verifyGameQualityCycle. The QA helper checks
GL errors after each transition. This synchronous browser query can drain pending
GPU work; it is outside the sampled frameTimes but inside legacy transitionMs.
The test itself therefore contributes blocking, independently of normal gameplay.

`scheduler-quality-diagnostic-cost.json` measures that exact call without removing
or weakening assertions. Low/media/low legacy totals1934.15/2290.81/5364.72ms;
before diagnostic1421.64/1666.68/5048.10ms; diagnostic512.41/623.69/316.55ms.
All240travel frames advance simulation,15new chunks,zero stream failures and
scheduler pending0. These are single attribution runs, not A/B acceptance.
This explains part of test blocking, NOT all slow transitions: before-diagnostic
latency and presentation tails remain high. Retain original totals and reports;
never claim deleting an error check makes the renderer faster. Subsequent timing
must separate diagnostics from presentation and retain correctness validation.

QA instrumentation is opt-in via WG_THREAD_QUALITY_EXECUTION and
WG_THREAD_QUALITY_CPU_PROFILE. It creates no new presentation loop; the existing
quality scenario still owns its camera RAF. GPU timers are stopped/restored after
the scenario. No production scheduler policy, artistic content or simulation
changed. Full-frame acceptance and remaining integration work remain outstanding.


Follow-up `scheduler-quality-completion-phases.json` leaves all operations and
checks unchanged and attributes sequential completion waits. Low/media/low:
12-frame stabilization842/868/615ms; explicit test render8.47/14.89/12.17ms CPU;
chunk idle wait0.02/1.17/1200.14ms; remaining program recovery wait effectively0.
Diagnostic checks309/357/219ms. Thus first two transition totals mainly measure
presentation pacing plus QA GPU synchronization; third also waits for streaming.
This run has lower tails than prior runs (max173/193/129ms), without a renderer
change: evidence of significant variability, not an optimization. No performance
claim based on this single run.240/240advancing,15new chunks,zero pending/failures.
15 scheduler/GPU-timer tests pass, QA modules syntax checked. Further work must
measure frame tails and required-chunk latency independently of QA diagnostics.


### Recovery compilation admission: two controlled iterations, not adopted (2026-10-24)

The quality recovery still uses its specialized compile budget. Tested passing
its owned obstruction representatives through the global scheduler (safe to defer:
no borrowed live material override held across an await). First ABAB reports
`scheduler-recovery-admission-{a1,b1,a2,b2}.json`: legacy first two transitions
1009/816 and788/856ms before diagnostics, candidate1618/2042 and1411/1170ms.
No acceptable throughput result. Existing compiler gives each batch a fresh250ms
grace; changed the batched helper to capture ONE operation deadline, preserving
explicit deadlines. Regression test verifies all later batches retain it and
never invoke the independent yield budget when globally admitted.

Second ABAB `scheduler-recovery-deadline-*`: before-diagnostic low/media/low
A1=807/864/4458ms, B1=1068/1449/5039ms,
A2=1230/1730/5366ms, B2=846/965/3248ms.
Maximum RAF A1=107/130/179, B1=163/302/321,
A2=294/284/277, B2=179/171/214ms. Direction changes between pairs;
no consistent full-frame or throughput benefit. All runs exercised active
simulation and streaming, with no harness failure. Camera travel uses the same
240-frame protocol, but changing preparation duration changes which camera frame
coincides with quality boundaries; not pixel-equivalence validation.

Do NOT activate live recovery admission. Scene production code returned to its
previous policy. Keep the operation-deadline fix for callers already using the
batched global API (unit correctness, not claimed real-frame speedup). The live
experiment remains QA-only via WG_THREAD_RECOVERY_GLOBAL_ADMISSION=1 source
transform; omit it for current control. Historical runs used the inverse
WG_THREAD_RECOVERY_LEGACY_ADMISSION switch while the candidate was temporarily
in source. First series predates the shared-deadline change; reproducing it needs
that old policy. No benchmark values rewritten.38 scheduler/compiler tests pass.

Code audit identifies a next structural lead: qualitySetting releases the old
program lease before recovery, and retainStreamingPrograms also disposes before
acquiring. This can delete exclusively pinned variants before reuse. Investigate
transactional replacement and lifecycle safety rather than repeatedly trying to
hide the same preparation behind another budget. This remains a hypothesis for
performance, not a demonstrated saving or completed scheduler integration.


### Transactional program leases: functional benefit, no fluency acceptance (2026-10-24)

Implemented opt-in transactionalPrograms=1 (QA WG_TRANSACTIONAL_PROGRAMS=1).
Quality changes cancel obsolete recovery/revisions as before but preserve the
old program lease until replacement. Replacement acquires a bounded snapshot
before releasing the previous lease. Context loss, disabled retention and world
exit still release/abandon all owned references. Maximum retained selection stays
96; brief overlapping references do not clone driver programs. Actual driver
memory bytes unavailable. Default without the option keeps prior release order.

`scheduler-program-swap-{a1,b1,a2,b2}.json`: active Manglares,media720p,
same240-frame camera protocol and low/media/low changes. Before-diagnostic
transition totals A1=1240/860/4500ms, B1=1155/1397/6032ms,
A2=1002/1427/5554ms, B2=1529/1342/5232ms.
Maximum RAF A1=231/121/183, B1=236/180/271,
A2=237/395/260, B2=307/176/347ms. No consistent latency/P95/P99 improvement;
last-step maxima are worse in both candidate runs. Do not enable in the scheduler
bundle or call this a performance optimization. It does avoid intermediate
program destruction: recovery leases destroy2programs per legacy step versus0
for candidate. Fewer destroys alone do not satisfy the user's acceptance gate.

Lifecycle validation with candidate: scheduler-program-swap-context.json reports
83old references abandoned,38new retained,80draw calls,world unchanged,shared
pthread16MiB,GL epoch1,unknownDeletes0. Recovery1521.94ms is asynchronous elapsed,
not CPU or a smoothness claim. No interrupted compilation was exercised here.
Before/after screenshots retained, but not used to claim broad artistic equivalence.
`scheduler-program-swap-exit.json` exits during native generation (status2), starts
quality recovery then cancels it:83/83references released,workers0,lateInstalls0,
queue0,world disposed,menu restored. Exit496.78ms elapsed, not performance gain.
10 retention tests pass including warmed-only replacement, cap eviction and failed
replacement preserving old ownership. This experiment narrows the diagnosis:
program churn is present but avoiding it does not explain/fix the remaining tails.

Vite production build passes in7.97s; existing bundle-size/dynamic-import warnings remain.


### Current streaming attribution after rejected quality experiments (2026-10-24)

`scheduler-current-admission-stream.json`: active Manglares,720p,media,360frames,
144m travel,60warmframes,original quality lifecycle (transactionalPrograms absent),
scheduler enabled.15chunks complete. Mean native pthread compute38.80ms,
publish0.611ms CPU,max0.94; graphical installation0.495ms,max2.085.
Private preparation mean8.025ms CPU versus1574.69ms elapsed,p95=3690.64,max4153.47.
601units average0.200ms,p95.660,max3.78. Main WorldScene.render mean8.073ms,
p95=13.945,max25.94. RAF mean119.54,p95=216.08,max349.46.121GPU query intervals
mean93.28,p95=140.94,max240.19ms; intervals include pipeline bubbles, not exclusive
GPU busy time. These are diagnostic samples, not an accepted improvement.

Lifetime scheduler counters include loading:21pending/no-work frames,all21with
mandatory CPU pressure;13also late,0elapsed-guard. Therefore relaxing elapsed
protection is unsupported. Phase sums during streaming: ground20.31ms CPU,
mud geometry35.18ms,edge vertices39.33ms,props15.41ms. Edge vertex work waits
8215ms summed across chunks,not all exclusive wall time. Grid construction only
2.73ms CPU across150units; prior grid coarsening already failed repeated acceptance.
Do not repeat that unproven budget/coarsening change merely because its wait is high.

Code review: mud geometry queries current authoritative surface/slope/water;
blind worker regeneration would duplicate world state and is unsuitable. Pure
edge interpolation/distance work consumes immutable prepared geometry and
outlines, so it is a plausible independent executor candidate. It currently has
247cooperative units for15chunks. Any worker version must account for copying,
cancellation,stale quality/context results and total presentation/stream latency;
no claim of benefit until actually implemented and compared. This points toward
moving/eliminating whole preparation dependencies rather than enlarging budgets.


### Pure mud-edge kernel and real worker feasibility (2026-10-24)

Extracted unchanged grid lookup/interpolation/contour-distance calculation into
mangrove-mud-edge-data.js. Existing cooperative caller still performs exactly the
same units, then publishes material/attributes atomically; no worker is active
in normal streaming. Material shader and terrain/normal/color inputs unchanged.
Cancellation still closes computation before publication. No native world copied.

QA WG_MUD_EDGE_WORKER_PROBE=1 recomputes immutable resident chunk attributes in
one reused module Worker without installing its results. Inputs structured-clone
original float/interleaved arrays (never detach live GPU-facing data); outputs
transfer newly allocated color/normal/edge buffers. Validates byte-for-byte against
actual resident attributes and terminates worker on completion/error. Unsupported
normalized/non-float attributes reject explicitly. This is not yet a general
worker client, streaming integration, or distribution validation.

scheduler-mud-edge-worker-probe.json:21real mud chunks,all byte-identical.
Input copy/submission mean0.1205ms,max0.155;setup mean0.0093ms.
First round trip56.94ms includes worker boot; later mean5.205ms.
Worker compute warm mean4.386ms; this is NOT faster pure computation than the
previous main-thread measurements and not an apples-to-apples CPU comparison.
Its value to test next is removing cooperative waits from the main-thread path.
Input backing buffers mean132005bytes,max166068;output mean106328,max185808.
JSON outlines/runtime overhead and temporary clone memory are additional.
Sequential probe has one in-flight job; no claim of bounded production backlog yet.

Five tests pass: both terrain triangles with nonuniform attributes and translated
contour,duplicate vertices,incremental byte identity,quality material ownership,
cancellation and irregular/signed-zero terrain lookup. Actual worker equivalence
is against the current resident output; it is not a six-biome visual acceptance.
Next integration must publish only for current owner/revision/context and account
for cancellation,buffer lifetime,backpressure,worker startup and full-frame A/B.

Vite build passes in7.01s with existing bundle-size/dynamic-import warnings.


### Worker integrated into private terrain preparation (2026-10-24)

Opt-in mudEdgeWorker=1 plus frameScheduler=1 (WG_MUD_EDGE_WORKER=1). A world-owned
single module Worker computes only immutable mud-edge arrays. Native generation,
mud geometry and authoritative surface/navigation remain unchanged. At most2
requests including a cancelled in-flight request; one executes at a time. Inputs
are copied through structured clone, outputs transferred; no live geometry buffer
is detached. Timeout/error falls back to original cooperative computation. Disposal
terminates worker and rejects requests. Cancelled running computation may finish
but its result cannot settle a replacement request or publish into the scene.

Global scheduler now supports yielding {waitFor:promise,label}; pending dependency
jobs retain bounded ownership but consume no execution budget and do not block
other jobs. Promise settlement only marks readiness; a later admitted unit resumes
with the result after checking validity. Rejection/cancellation closes generators.
No extra RAF, no awaiting worker work inside endFrame. Snapshot reports waiting.
Terrain wrapper forwards resumed data and keeps world/quality/context/revision
checks. Only asynchronous terrain staging opts into worker; synchronous entry
points remain synchronous. Publication of material/attributes stays atomic.

Serial active Manglares media720p ABAB,360frames/144m,60warmframes,Intel UHD:

| run | preparation CPU mean ms | preparation elapsed mean ms | RAF P95 / P99 / max ms |
| --- | ---: | ---: | --- |
| A1 cooperative | 8.34 | 2308 | 216.18 / 316.04 / 398.90 |
| B1 worker | 5.68 | 1601 | 199.63 / 265.96 / 382.52 |
| A2 cooperative | 8.39 | 2418 | 232.84 / 316.01 / 449.06 |
| B2 worker | 5.99 | 1597 | 216.19 / 299.26 / 482.43 |

Raw scheduler-mud-worker-stream-* and summary retained. All15new chunks complete.
Initial immutable probe (outside timed streaming) validates21real chunks byte-for-byte
in each run. Candidate36/36worker requests complete,peak pending2,no failures.
Loading readiness A1/B1/A2/B2=31.185/31.926/33.354/32.784s: no consistent loading
speed improvement. GPU timer means91.34/86.40/86.23/76.40ms include pipeline bubbles;
not a pure GPU optimization claim. Camera path is frame-based and simulation
advances in wall time, so final active world states are not image-identical. Faster
readiness also changes when chunks become drawable. Actual captures retained;
byte identity is stronger evidence for the unchanged material calculation itself.

Preparation latency reduction repeats (~31/34%). P95/P99 improve both pairs, but
B2maximum worsens, and total frame times remain poor. Promising integration, NOT
complete scheduler acceptance or default activation. No density/art reduction.

Lifecycle: scheduler-mud-worker-context.json recovers with unchanged world,
83oldprogram refs abandoned,37new retained,80draw calls,GL epoch1,unknownDeletes0,
shared pthread16MiB. Worker21/21complete,queue0. This case did not interrupt an
in-flight worker. scheduler-mud-worker-quality-exit.json runs active quality cycle
then exits during native generation:worker36/36complete/closed,queue0,globalwaiting0,
0native workers/late installs,menu restored. Active worker cancellation and stale
results tested deterministically in units, not claimed from these real cases.

51 targeted tests pass: pending dependencies,frame-owned resume,late replacement,
rejection,revision validity,bounded worker queues,cancelled active ownership,dispose,
cooperative fallback and byte equivalence. Vite build passes6.81s and emits the
2.43kBworker asset. This proves packaging, not deployed itch/Tauri execution.
Remaining: real in-flight cancellation/failure injection,night/low/fast-camera
coverage,distribution checks,repeatable worst-frame improvement before activation.


### Pending worker lifecycle exercised in the real renderer (2026-10-24)

QA WG_MUD_WORKER_LIFECYCLE=quality|failure|exit builds a private duplicate from
an actual resident native chunk through prepareTerrainChunk and the real worker.
Intercepts delivery of its completed response before executor.receive. Confirms
one pending request and one waiting scheduler job, then triggers the event.
This tests in-flight delivery/ownership, NOT interruption during worker CPU work;
no perf timings from these injected cases may be used for performance claims.

scheduler-mud-worker-pending-quality.json: quality revision changes,private group
released exactly once,request cancelled,late reply ignored,global/worker queues0.
Resident chunk keys and paused simulation time unchanged. Actual quality recovery
finishes normally. scheduler-mud-worker-pending-failure.json: injected transport
failure terminates executor,original cooperative fallback completes and produces
byte-equivalent color/normal/edge arrays;private group explicitly released,queues0.

scheduler-mud-worker-pending-exit.json first verified world/menu teardown while
delivery was held. It exposed a stats classification issue: dispose counted its
rejection as failure. Corrected fail's cancellation classification, preserving
rejection/termination behavior. Final repeat pending-exit-final.json:22submitted,
21complete,1cancelled,0failed,executor closed,pending0,global waiting0,private group
released once,stale result discarded and menu restored. Original report retained
as historical evidence.20scheduler/executor tests pass including cancelled versus
failed accounting;QA modules syntax checked. No shader or simulation changes.

Worker remains opt-in. Still pending low/night/fast-camera and deployment coverage,
more worst-frame validation and remaining scheduler producers. These correctness
checks do not complete the full Global Frame Scheduler objective.


### Night/baja streaming and emitted worker smoke test (2026-10-24)

Serial ABAB scheduler-mud-worker-night-low-*,same tracked controlled-night fixture
(seed712,elapsed450),720p,baja,active simulation,360frames/144m after60warmframes.
Raid camera is locked to the authored QA path equally in all runs.15new chunks
complete per run,0paused frames. Both variants retain all original geometry and
lighting. Worker stays opt-in; no tuning between repetitions.

| run | preparation elapsed mean ms | RAF P95 / P99 / max ms |
| --- | ---: | --- |
| A1 | 2344 | 199.55 / 299.29 / 365.88 |
| B1 | 1478 | 166.37 / 216.25 / 249.39 |
| A2 | 2481 | 182.83 / 216.33 / 365.39 |
| B2 | 1942 | 182.96 / 249.38 / 415.72 |

Preparation latency improves21–37%,but worst-frame result is inconsistent;
B2P99/max regress. Do not turn this into a blanket smoother-game claim. GPU
interval means77.22/73.53/78.10/64.53ms include bubbles and scene scheduling;
no pure GPU efficiency claim. Final A2/B2screenshots inspected: same terrain,
ribera,vegetation composition and visible ground response. HUD clock/water
animation differ with active evolution,so not pixel-equivalence acceptance.
Raw captures/data and summary include exact values and scope.

New check-mud-worker-package.mjs tests the ACTUAL emitted Vite worker asset via
nested URL and a cross-origin iframe with isolation delegation. Both return
expected color,normal,edge arrays,matching request identity,original input buffer
still attached,zero page errors;worker explicitly terminated. Artifact2425bytes,
SHA256ae5f6ba2a3d49558d43fd2c7c872b738399feecd1dcdcb380f49d6606a1c30e4.
Built with current Vite configuration;scope excludes deployed itch.io/full game
and actual Tauri/WebView2. JSON report retains those limitations. Production build
passes with existing bundle/import warnings. This closes the packaged-worker
protocol smoke test,not global distribution or scheduler acceptance.


### Remaining atomic texture uploads: owning assets identified (2026-10-24)

Extended the existing WG_THREAD_TEXTURE_TIMES diagnostic with a QA-only ownership
index and per-renderer texture identity/version history. It matches shared Source
objects across cloned materials and modelSources; no production behavior changed.
Index collection is outside timed initTexture calls but adds traversal overhead.
Do not compare this diagnostic run's loading speed to non-instrumented runs.

scheduler-loading-texture-owners.json records115calls/113sources,770.275ms summed
synchronous invocation wall time,0repeated texture objects,7already initialized.
Largest119.505ms upload is the2048x2048lion bestiary albedo, identified through
models.json and the actual loaded GLTF URL. Rhino packed roughness/metalness52.330ms,
hyena normal50.740ms,sky atlas4096x2048 52.830ms. These are initial uploads, not
claims of GPU execution duration. Expected existing shader warnings only;25chunks
ready,0failed/queued,authoritative pthread runtime active.

Two sources have multiple texture wrappers. Their later invocations take0–.025ms;
Three already reuses the shared source allocation. Another deduplication layer
would not address the expensive initial uploads. This scope does not exclude
reuploads during later context restoration or quality changes.

Installed Three WebGLTextures supports row updateRanges for DataTexture but the
observed resources are ImageBitmap. A possible follow-up is private staged pixel
uploads with worker-side conversion and atomic publication, measuring conversion,
allocation,mipmap cost,temporary memory and exact sampling before adopting it.
That is not implemented or assumed beneficial: changing image representation can
alter color/alpha handling, and allocation/mipmap generation remain atomic. Simply
putting the existing119ms initTexture into a scheduler job cannot interrupt it.
No asset resolution,art,lighting,simulation or production default changed.


### Private pixel transfer / scheduler feasibility (2026-10-24)

Actual lion albedo,normal and packed roughness textures,2048square,real world
renderer/context. QA creates private RGBA8 allocations;never installs or replaces
visible materials. A module worker converts a cloned ImageBitmap with OffscreenCanvas
and transfers16MiBpixels. Original bitmap ownership is retained. Every generated
mip is read back and compared;all bytes match in all three diagnostic runs,zero
GL errors. Scope does NOT prove sRGB sampling,alpha-cutout assets or all game images.

Reproduce with check-spatial-thread-game.mjs,port5190,WG_THREAD_FROZEN=1,
WG_THREAD_DEFAULT_STREAMING=1,WG_FRAME_SCHEDULER=1,WG_TEXTURE_STAGING_PROBE=1.
WG_TEXTURE_STAGING_MODE=original|control|scheduled selects the three reports:
scheduler-texture-stripes-probe,scheduler-texture-pixels-control,
scheduler-texture-admitted-stripes. Each repeats its mode sequence twice. Scheduled
mode uses the actual existing GlobalFrameScheduler,one synchronous64-row unit per
yield,priority30,250ms admission deadline;QA watchdog cancels after30s.

Original forced-one-frame-per-stripe mode reduces invocation cost but takes1.45–2.57s
pertexture: not an acceptable production policy. Control distinguishes worker pixel
conversion from splitting: full pixel uploads still take~9.5–14.5ms,versus cold
bitmap spikes up to174ms and warmed~14–21ms. Conversion14.8–83.4ms occurs off main;
cloning submission under.3ms in the control run. Not evidence of faster total load.

Actual scheduler trial: five of six stripe submissions have max unit.09–.20ms,
~1.9–2.7ms summed calls. Completion41–377ms,not fixedoneframeperstripe. First
albedo stripe has an18.445ms atomic outlier;total preparation2299ms. Conservative
cost/recovery and prior probe pressure remain relevant;this is not uniformly fast.
No budget relaxation or lowered estimates used to hide that observation.

Readbacks take315–710ms and synchronize the pipeline;the diagnostic retains mip
arrays for all modes until comparison (~128MiB for six2048RGBA mipchains,excluding
pixelbuffer and GPU allocations). These deliberate validation costs influence
later trials and cannot be counted as production savings or representative memory.
No reliable GPU/wholeframe conclusion from this experiment. Next gate:bounded
validation storage,sRGB/alpha equivalence,private publication via supported Three
APIs and real loading ABAB without readbacks. Do not adopt rawGL private probe as
production upload manager or claim the scheduler objective complete.


### sRGB correctness, alpha exclusion, and rejected Three copy path (2026-10-24)

The private probe now allocates SRGB8_ALPHA8 for actual sRGB albedo and RGBA8 for
linear maps. scheduler-texture-srgb-alpha.json: all bytes at all generated mip
levels remain identical for actual lion albedo,normal,roughness. Validation retains
only the baseline mipchain plus current trial (~42.67MiB for2048square),rather than
six chains (~128MiB). Each reference is22369620bytes;worker pixel output16MiB extra.
Those are calculated validation storage sizes,not measured total process memory.

Added an adversarial64square semitransparent gradient. Canvas conversion differs
in7934channel bytes across mip levels,while repeated bitmap upload remains exact.
Therefore opaque result MUST NOT be generalized to alpha foliage/cards/sprites.
No production texture changed. Matching encoded sRGB bytes/mips supports this
transfer representation;no game shader screenshot or full-world A/B acceptance yet.

Attempted supported Three API: private Texture with Source.dataReady=false for
allocation,restored immediately;DataTexture + copyTextureToTexture with Box2 row
regions. Intermediate copies suppress mip generation,finalcopy regenerates mips.
Resources owned/disposed by Three;no private-handle mutation. Scheduler unchanged.
Three attempts terminate at QA30s watchdog (first generic,second/third attributed);
no successful publication. Raw reports preserve failure,not a performance win.

scheduler-texture-three-transfer-diagnostic.failure.json: secondstripe102.315ms;
its conservative cost exceeds bounded recovery policy,so pending work correctly
cannot be treated as cheap. scheduler-texture-three-calls.failure.json instruments
actual GL calls only within the copy: thirdstripe187.760ms,including getParameter
UNPACK_ROW_LENGTH(3314)=90.455ms and UNPACK_IMAGE_HEIGHT(32878)=96.845ms.
texSubImage2D max~.100ms. These are synchronous wall spans (driver/queue waits can
contribute),not proof of GPU workload duration. The API's state reads defeat this
cooperative slicing on this hardware. Do not solve it with artificial low estimates,
longer watchdogs or allowing100ms scheduler units. Reject copyTextureToTexture for
this candidate. A bounded interop path avoiding synchronous state queries needs
separate lifecycle/equivalence validation before any production adoption.

Reproduction remains WG_TEXTURE_STAGING_PROBE=1;MODE=scheduled for raw transfer
and MODE=three for rejected Three path (actual env WG_TEXTURE_STAGING_MODE). Detailed
GL instrumentation is QA only,restored in finally. Browser error logs contain the
existing f_environment4 warnings;failure is explicit watchdog,not a GL upload error.
No main merge,art changes or production defaults changed. Scheduler objective open.


### Three-owned interop and real loading pilot: not accepted (2026-10-24)

scheduler-texture-interop.json uses Three-owned private Texture allocations and
normal dispose,while raw upload units avoid copyTextureToTexture state queries.
All opaque bytes/mips remain exact,resource count delta0 every trial. Opaque stripe
max calls.11–.75ms,preparation34–50ms. Alpha adversarial control still differs7934
bytes as expected. No source bitmap closed/replaced by interop probe.

Moved beyond the isolated probe with WG_TEXTURE_LOADING_PILOT=1. QA-only route
replaces the initial texture loop with a serial pilot restricted to the three
already validated lion textures. Worker conversion refuses nonopaque data;main
keeps original Texture,Source and bitmap. Initial readiness barrier prevents
showing partial resources. Allocations remain Three-owned,32row units+allocation
and mip generation run through the actual scheduler. On failure original bitmap
upload restores content,or world cancellation rejects. Worker terminated finally.
No production modules/defaults changed. Pilot remains a rejected QA candidate.

Real ABAB Manglares media720p,frozen populated seed/camera,default streaming,
scheduler1;no pixel readbacks or profiling. Initial presentation intervals:

| run | ready ms | upload phase ms | RAF P95 / P99 / max ms |
| --- | ---: | ---: | --- |
| A1 | 33128.5 | 1054.9 | 66.49 /116.36 /415.80 |
| B1 | 34714.8 | 3931.1 | 66.34 /116.40 /382.61 |
| A2 | 31082.6 | 943.6 | 66.44 /116.12 /432.31 |
| B2 | 61318.8 | 31288.8 | 49.73 /99.80 /365.98 |

B1completes3textures,maxunit30.345ms;B2completes2,fallback1,maxunit33.765ms.
B1/B2workerconversion124/74ms,peak outputbuffer16MiB(excludes bitmap/canvas/internal
storage). Allocation+transferCPU50.5/53.0ms. The30s timeout proves unacceptable
throughput. B2percentile improvement is NOT success:many cheap waiting frames
inflate the distribution. Ready25chunks in all cases,0failed/queued at end.

A2/B2captures visually inspected:ground,ribera,ferns,building composition retained;
wind/water phase differ. Lion textures are not prominent in this camera,so these
screenshots do not replace the separate byte/mip correctness proof. Existing shader
warnings only. No GPU-speed or full-game equivalence claim.

Decision:do not adopt. Need phase attribution on the observed atomic outlier and
admission history. The scheduler's generic historical-unit estimate can carry a
cost across unlike allocation,row,and mip phases;possible contributor,not proved
by aggregate stats. A bounded estimate by measured operation class may be appropriate,
but do not simply lower estimates or extend the watchdog. Keep whole-loading
throughput as acceptance gate,not the attractive isolated stripe timings.


### Upload finalization attribution and corrected pilot ABAB (2026-10-24)

scheduler-texture-pilot-phases.json adds per-unit phase/work/wait records without
changing admission. Confirms the unlike-phase issue:normal-map last row18.945ms,
then mip generation.030ms waited2223.46ms. Packed map last row6.665ms,then.065ms
mips waited222.61ms. No need to hypothesize GPU time from these CPU wall spans.

Corrected only the QA producer:final row and mip finalization are executed in the
same admitted generator step. No yield between them. Full combined synchronous
cost remains charged;no lower estimates,extra budget,policy or watchdog changes.
This also avoids exposing an incomplete mipchain between those phases. Earlier
rows retain cooperative yields. Added two tests:allocation+two-row upload has
three admissions with final mips included,original bitmap/source ownership kept;
alpha rejection occurs before allocation. Both pass.

Fresh ABAB,same real initial-loading protocol,no profiler/readbacks:

| run | ready ms | upload phase ms | RAF P95 / P99 / max ms |
| --- | ---: | ---: | --- |
| A1 | 32015.2 | 863.1 | 66.50 /133.10 /415.68 |
| B1 | 32174.9 | 1183.7 | 66.58 /149.65 /498.97 |
| A2 | 32193.0 | 1234.9 | 66.81 /133.08 /415.70 |
| B2 | 30997.2 | 1099.5 | 50.10 /116.35 /399.46 |

Both B complete3textures,0fallback,25worldchunks ready. Pertexture preparation
27.7–91.5ms,versus previous2.2s or30s waits. Real driver unit outliers38.445ms B1
and20.480ms B2remain;cooperative scheduling cannot interrupt them. One pair worsens
P99/max,the other improves. Overall load timing does not establish consistent gain.
Keep corrected experiment QA-only;do NOT activate or broaden to more textures based
on the isolated upload results. The throughput bug is resolved for this observed
finalization sequence,but global scheduler acceptance remains unproved. Reports,
summaries and captures retained;no simulation/art/production defaults changed.
