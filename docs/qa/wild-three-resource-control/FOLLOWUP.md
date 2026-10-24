# Follow-up: attribute first-use state query before rejecting the mechanism

P1 adoption remains rejected. This follow-up does not erase its failures.

Inspection after the negative ABAB found a measurement asymmetry: the isolated
probe reads back the full-upload reference first. Its readMips finally calls
renderer.resetState, which initializes the five unpack-state mirror entries.
In real loading the mirror starts empty, so the first region still makes five
getParameter calls. Thus zero-query steady state is not zero-query first use.

New hypothesis P2: capture the five actual unpack parameters during WebGLState
construction, when r180 already queries capabilities and establishes ownership,
rather than lazily during the first resource upload under scene GPU load.
This does not assume externally supplied contexts have default unpack values.
No extra scheduler, changed density, asset resizing or normal lighting changes.

P1 diagnostic adds per-call synchronous wall attribution only inside scheduled
upload units, restoring methods before yielding. WG_WILD_TEXTURE_TRACE=1 enables
it. These timings include wrapper overhead and are diagnostic, not acceptance.
P2 source is separate r180-resource-control-eager-state.patch; prepare.py
--eager-state selects it. Default preparation still reproduces rejected P1.
Pending: call attribution, P2 real-load pilot, correctness without preceding reset,
and fresh controlled ABAB if the pilot removes the actual first-use stall.

## P1 attribution (2026-10-25)

loading-p1-call-attribution.failure.json reproduces the failed load. First region
168.15ms; getParameter(UNPACK_ROW_LENGTH=3314)47.30ms and
getParameter(UNPACK_IMAGE_HEIGHT=32878)119.91ms; texSubImage2D only0.35ms.
This confirms lazy state queries, not pixel-copy cost, explain this measured
outlier. No GPU execution-time claim. The queued estimate then starves as before.
P1 failure is valid; extending that rejection to all region-control approaches
would be premature. P2 specifically removes those first-use queries from loaded
resource preparation. Constructor query cost and total readiness still count.

## P2 evidence and user-directed loading work

Instrumented P2 finishes in48.971s, nine textures,297units,109.985ms synchronous
upload work, max21.465ms, zero per-unit getParameter calls. The first-region-first
correctness probe passes56trials/14resources, all mip bytes identical, no GL errors
or resident texture-count delta. This removes the prior readback/reset asymmetry.

Fresh uninstrumented P2 ABAB: stock controls35.172/35.740s, but both partial-upload
runs still time out. B1 reaches four complete textures before a35.785ms unit
poisons admission. Removing lazy queries is necessary for the tested mechanism
but insufficient for robust loading. Reports remain negative evidence.

User redirected work to parallel loading and explicitly requested an emergency
fallback for indispensable units. The scheduler now accepts required:true only
with a finite deadline. After2seconds without service beyond that deadline, it
may admit one exceptional unit on a cheap CPU frame; after4seconds it may admit
one even if mandatory CPU stays high. Global oversized recovery is throttled to
once per2seconds. Actual cost is measured separately; estimates are not falsified.
No browser/driver call becomes interruptible, so a universally small hitch cannot
be guaranteed. Optional, stale, cancelled and dependency-blocked work is excluded.
Loading actors, loading compilation and the texture pilot mark required work.
61scheduler/actor/far-ownership tests pass with the isolated Three dependency.

Parallel loading prototype parallelFarDecode=1 starts existing far-image owners
before GPU warmup; a cancellable gate delays adapter construction and GPU
admission until warmup succeeds. Failed warmup rejects the gate and releases
images; world disposal cancels the gate. No second resource owner or scheduler.
It is opt-in; full load/visual/peak-memory comparisons are still pending.

## Emergency admission real-game result

loading-p2-emergency-pilot.json completes in75.053s with9/9textures,297units,
no fallback upload and no remaining jobs. There were10 emergency units totaling
2.085ms actual CPU wall time, maximum0.275ms, versus708.224ms accumulated estimates.
This demonstrates recovery from stale estimates, not an improvement of loading
throughput: texture readiness still took38.542s. The original unpredicted upload
reached152.595ms before admission could react. Calls are not preemptible.
The branch subsequently prioritizes an admitted emergency over optional work,
preventing a continuously refilled optional queue from hiding recovery.
103scheduler, actor, compilation and far-ownership tests pass.

The next loading comparison uses ordinary whole texture initialization in both
arms, P2 source in both, and only toggles parallelFarDecode. This keeps the known
partial-upload pacing regression out of the test of asset/decode overlap.

## Far-image overlap ABAB: not adopted

Original initialization in both arms; partial texture pilot OFF, P2 in both.
A1/B1/A2/B2 readiness38.847/38.374/35.195/38.326s. P95 RAF66.50/66.51/50.01/50.01ms;
max348.99/482.22/315.97/332.56ms. No consistent total-load or tail benefit.
All four loads complete25chunks with no emergency admissions. The candidate
remains opt-in, not a performance recommendation.
A2/B2 captures visually retain ground, shadows, vegetation and background; mean
absolute RGB differences0.000314/0.000269/0.000228 over720p. This narrowly validates
the fixed opening view, not animation, all biomes or peak memory.
The next evidence-led target is overlapping initial program-readiness waits,
analogous to the existing bounded live-scene compiler, without concurrent borrowed
GL state or additional shader variants.

## Initial program readiness waves (opt-in, acceptance pending)

The first concurrency4 pilot failed before readiness because the scene caller
omitted the scheduler argument required by bounded parallel admission. This is
an integration defect, not a performance result; the failure report is retained.
The corrected caller passes the existing frame scheduler. Sequential control
also uses that admission path, so the new ABAB isolates readiness concurrency.
65 compilation and scheduler tests pass, including bounded outstanding batches,
original object preservation and draining an already-submitted failed wave.

The corrected pilot completes 25 chunks in37.068s with no emergency admissions,
no pending work and a maximum scheduled CPU unit of16.120ms. Presentation P95
is66.465ms and P99 is133.055ms, but the maximum interval is3492.110ms between
RAF timestamps16985.245 and20477.355. This interval is not a measured GPU time
or proof of a synchronous compiler stall. It prevents accepting this pilot as
a fluency improvement without attribution and repeated controls.

Reproduction: tools/wild-three/run-compile-abab.py --fixture <same saved fixture>
--prefix <new prefix>, against P2 on port5197. Both arms use ordinary texture
uploads and disable far-image overlap; A uses concurrency1, B concurrency4.
The default remains concurrency1. No production performance claim yet.

## Initial waves ABAB: no throughput acceptance

A1/B1/A2/B2 completed in35.926/39.308/37.976/36.474s, each25chunks.
P95 intervals50.10/49.99/66.49/66.31ms; P99 132.88/116.40/133.15/116.63ms.
Maximum intervals3176.56/3724.55/3442.20/3591.75ms affect both arms.
The total-load differences reverse between pairs; concurrency4 is not adopted.
Opening A1/B1 captures were inspected: ground, fern coverage, shadows, buildings
and distant scenery retain their appearance. This is not full lifecycle proof.
The common multi-second gap requires separate long-animation-frame attribution;
no claim that it is GPU execution, driver waiting or caused by concurrency yet.
