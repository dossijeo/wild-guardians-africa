# Pending GPU compilation: cancellable-wait candidate

Source inspection on 8 October found that `prepareNativeFarGpu` checks its
owner, context epoch and 30-second deadline before and after `compileAsync`,
but not while its returned promise is pending. A promise that never settles
therefore prevents that preparation from observing cancellation/deadline.
This is a contract gap found in source, not a diagnosis of browser tab 846.

`tools/experiments/wait-gpu-preparation.js` prepares a cooperative wait that
polls the caller's existing lifetime/deadline check on yielded frames and an
independent 100-ms timer, with optional immediate AbortSignal notification.
Completed warm work adds no frame. Shader failures are preserved when they
race cancellation, and a late rejection remains handled after the caller has
stopped waiting. The helper cannot interrupt synchronous driver/JavaScript
work; suspended animation frames alone do not prevent the timer/signal check.
Timers/listeners are removed on every exit; late driver rejection is observed.
It does not claim to cancel compilation submitted to the driver. Browser timer
throttling can delay observations; blocked JavaScript cannot process cancellation.

Twelve tests pass via `node --test tests/wait-gpu-preparation.test.js`, covering
never-settling compilation cancellation/deadline, context generation changes,
warm completion, real failures and late rejection without resource adoption,
including when RAF itself never resolves. Two additional tests inject this
waiter into the compile stub used by the real `prepareNativeFarGpu` API. They
prove owner/context cancellation leaves parent/render flags unchanged, submits
no draw/fence, releases cache listeners and never adopts late completion. This
CPU injection is not production integration or native-browser evidence.

Additional source audit: Three r180 `WebGLRenderer.compileAsync` owns an
uncancellable 10-ms `checkMaterialsReady` timer (local source lines 1408–1461).
It re-reads each material's `properties.currentProgram` and calls `isReady`
without a rejection/cancellation handler. Disposing a pending material can
therefore invalidate that lookup; an outer Promise race does not remove this
internal timer or turn an exception from its callback into a rejection. The
controlled pending-promise tests do not validate this third-party lifecycle.

Before adopting native compilation cancellation, use an owned bounded compiler
poll (like the loading feature's `compileLoadingPrograms`) that snapshots the
submitted programs, checks owner/context generation before readiness queries,
and removes its own timers/listeners on cancellation. Wrapping the existing
Three promise alone is insufficient for complete resource-lifecycle acceptance.
This source finding is still not evidence of what happened to tab 846.

`tools/experiments/compile-gpu-preparation.js` now implements that owned-poll
candidate for the normal target recipe. It calls `renderer.compile`, captures
each selected program once, deduplicates shared programs, checks the caller's
lifetime/generation before queries, and clears its timer on every exit. It uses
the shared cancellable waiter instead of starting Three's internal async poll.
The synchronous submission and readiness-query costs are not made nonblocking
by this wrapper; no native performance improvement is claimed.

Ten directed compiler tests and two additional real preparation-API injection
tests pass. Combined compiler/waiter/native-preparation/isolation checks total
61 passing tests. They exercise discarded borrowed materials, owner abort,
lost/restored epoch, never-ready deadline, query fault, and no late queries,
draws or readiness fences after cancellation. The candidate remains unimported
by runtime while the original resource audit recipe is being measured.

Browser recovery and the paired resource audit subsequently completed; see
`isolation-cheap-resources/README.md`. That audit used the original compiler,
so it is not evidence for the owned compilation option.

The preparation API now imports this helper behind `ownedCompilation: true`.
All three far-world preparation sites forward only an explicit
`world.farOwnedCompilation === true`; ordinary production keeps the original
compiler. The traveling fixture exposes `?ownedCompilation` and records that
choice in the report. This is a QA integration gate, not production activation.

Four new tests call the real option directly, without replacing compileAsync:
successful selected-program polling preserves the native upload/fence recipe;
owner cancellation works with suspended RAF; a lost/restored context rejects
before another stale query; and the existing deadline interrupts never-ready
programs before any draw. The directed suite now has 65 passing tests. The
earlier injection tests remain as separate lower-level evidence.

Next: native browser cancellation, exact shader-recipe and traveling regression
checks with the explicit option. Texture frame yields, decoding and fence waits
remain separate lifecycle gaps; this compilation option does not fix or claim
to fix them. Visual/performance gates and production activation remain pending.
