# Optional native await attribution

Base 71917b71; helper a7fe45c1 cherry-picked as 8820a003. The b76,12dd,719 refs remain frozen. Strict selection requires --smoke-report and --smoke-loading-trace. Workflow and production recipes unchanged.

App installs one WeakRef-owned observer after World construction. Prior hooks retain this/arguments/results/exceptions; rebinding preserves active awaits. The dedicated frozen report getter snapshots BEFORE close clears pending resources. Cancel/dispose/finish release tokens and prior hooks without clobbering replacements. Data contains only bounded scalars: 64 pending waits, 128 completed labels, explicit dropped counts. Nested durations are nonadditive, not exclusive CPU/GPU cost. Uninstrumented operations remain unknown.

Only opt-in activation reads renderer.getContext once (existing context), VERSION/VENDOR/RENDERER and optional debug unmasked identity with unavailable/errors. No new context, timer query, extra render/RAF/poll/fetch or waiting. Hardware/software identity does not prove a bottleneck.

Smoke copies diagnostic data without changing ok, worldStartedAt, original 90-second readiness, 300000 hidden or 900000 process gates. No constructor cost is inferred. Normal OFF has no collector, clock or GL reads. No native/raster/CI or Rust compilation is claimed.

36/36 directed CPU tests PASS, changed JS syntax PASS, build 10.65s, package 720 files / 445281215 bytes / 860 links / 24 GLBs. SFX 126 classifications/original bytes unchanged, only App fingerprint/lines refreshed. An initial exact-source test failed because it did not strip the new observational finish hunk; narrow normalization now preserves its full source equivalence assertion.

Run python docs/qa/windows-loading-regression/native-loading-trace-integration/verify.py. Source and original compressed logs are hashed in receipt.json. No PR/promotion/dispatch authorized.
