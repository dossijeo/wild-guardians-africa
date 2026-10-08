# Pending GPU compilation: cancellable-wait candidate

Source inspection on 8 October found that `prepareNativeFarGpu` checks its
owner, context epoch and 30-second deadline before and after `compileAsync`,
but not while its returned promise is pending. A promise that never settles
therefore prevents that preparation from observing cancellation/deadline.
This is a contract gap found in source, not a diagnosis of browser tab 846.

`tools/experiments/wait-gpu-preparation.js` prepares a cooperative wait that
polls the caller's existing lifetime/deadline check once per yielded frame.
Completed warm work adds no frame. Shader failures are preserved when they
race cancellation, and a late rejection remains handled after the caller has
stopped waiting. The helper cannot interrupt synchronous driver/JavaScript
work or guarantee progress if animation frames themselves are suspended.
It does not claim to cancel compilation submitted to the driver.

Eight tests pass via `node --test tests/wait-gpu-preparation.test.js`, covering
never-settling compilation cancellation/deadline, context generation changes,
warm completion, real failures and late rejection without resource adoption.

This candidate is not imported by production or the pending native resource
fixture, preserving its source while browser recovery remains unresolved.
Next: connect it at the compilation wait, exercise the actual native owner/
cache/fence contracts including a never-settling compilation, and rerun native
loading/streaming cancellation QA after tab 846 is confirmed closed. The open
resource audit and visual/performance gates remain incomplete.
