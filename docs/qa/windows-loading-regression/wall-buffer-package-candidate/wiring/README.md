# Smoke-only flag wiring

This follow-up changes only workflow, Rust smoke injection, smoke recipe reporting and source-wiring tests against the reviewed8faa9f19. `wall_buffer_package` is boolean/defaultfalse. Both existing primary and visibility invocations add `--smoke-wall-buffer-package` only when explicitly true. Rust sets the boolean only within the existing `--smoke-report`/main-page guard. World additionally requires smokeStarted true. Normal app and push/PR workflow paths remain OFF.

An authorized future isolated run would set wall_buffer_package=true, compile_window=false and resource_overlap=false. There is **no dispatch authorization or execution at this freeze**. All other historical recipe flags remain unavailable/OFF, original90s and native300000ms gates unchanged. No fixture/asset/loader/core source changes accompany this wiring.

66/66 directed tests passed; build10.36s; package712/450,452,640 bytes/860 links/22 GLBs; SFX check and two changed JS syntax checks passed. Raw logs retain JSON-module/Vite warnings. Rust native build remains unexecuted locally. Session38901 terminalexit0; values are checks receipts, not native performance evidence.

The original8faa receipt remains frozen evidence for that commit; its test hash intentionally differs after the new wiring contract. This folder's receipt/verifier supersedes only the current-source wiring check, not the earlier raw evidence.
