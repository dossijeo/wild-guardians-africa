# GPU lifetime candidate — not activated

Runtime remains frozen at `08fe1462` for first-crop control/attribution. These files are QA candidates only: `wait-loading-gpu-fence.js` and its seven contract tests. No production import changes.

The candidate reuses the exact shared root `593ddf41` waiter. A single requested RAF is raced against ownership and deadline checks, with a timer independent of RAF. A suspended frame therefore cannot indefinitely retain a fence after cancellation. Default pending RAF is cancelled at exit; signal/timer/context listeners are released. Injected frame promises are caller-owned; their late failure is observed but their underlying scheduling cannot be cancelled by this API.

The context-loss event is latched, and an optional epoch getter plus context identity are checked before every fence query. A loss/restoration between polls never admits readiness or deletes an old-context fence in a restored context. Context loss already invalidates that handle. Ordinary completion, owner cancellation, timeout and fence failure delete their current-context handle.

This does not interrupt synchronous driver calls. Background timer throttling can delay checks. No native cancellation or performance acceptance is claimed from these tests. The separate bounded compiler already snapshots program objects and owns polling, but its epoch/loss-restoration regression remains to be integrated after the frozen comparison; wrapping Three compileAsync cannot cancel its internal timer.

Validation: `node --test tests/wait-loading-gpu-fence.test.js tests/wait-gpu-preparation.test.js` — 19/19 pass, no renderer/GPU scene opened. Root resource A/B window remains reserved.
