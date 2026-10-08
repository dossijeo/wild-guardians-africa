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

This candidate is not imported by production or the pending native resource
fixture, preserving its source while browser recovery remains unresolved.
Next: connect it at the compilation wait, validate the direct integration,
and rerun native
loading/streaming cancellation QA after tab 846 is confirmed closed. The open
resource audit and visual/performance gates remain incomplete.
