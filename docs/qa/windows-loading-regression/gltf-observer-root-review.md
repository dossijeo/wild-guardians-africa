# Root review of bounded completed GLTF timing

Reviewed source:64cb737e42ee0529fda7123212ca10180f0f8559, compared with
8b075be94f0228c7fd0295f79f952023ed0f1886. Root independently ran
loading-gltf-timing-snapshot, loading-readiness-snapshot and
loading-hands-observation:35/35 passed, exit0, 531.1148ms.

The extension copies existing owned transfer records only when the smoke
observer requests its final snapshot. It does not create requests, query
ResourceTiming, call readiness methods, alter clocks or wrap GLTF parsing.
The eight longest completed GLTF durations use stable insertion-order ties;
counts and omitted rows remain explicit. Timing association stays heuristic
by URL and window, with overlapping repeated URLs and invalid or missing
timings reported unknown. ResponseEnd separates two browser timeline
intervals; neither interval proves exclusive CPU, Internet or disk cost.

Root approved CPU/build/package preflight for this diagnostic branch, not a
native dispatch or production integration. These tests do not prove that
WebView2 supplies useful timings, that Windows loading meets its original
90-second readiness gate, or that loading performance improves.

Separately, normal Windows run38000980557 at main9c753d32 was inspected as
terminalfailure: executable/installers built successfully, native smoke
failed and minimization was skipped. Original artifacts and logs must be
preserved. Main run38001296015 was still live at this review; no restart or
timeout change was authorized.

## Frozen preflight and one native dispatch

Root subsequently checked f92c6872c5974523a7843f456713307ddb746400:
no src/tools/workflow/content/public change from64cb737e; the extra SFX
inventory change only refreshes the experimental scene fingerprint. Preflight
receipts cover59 CPU tests, build9.60s,711 packaged files/445272688bytes,
860 relative links/22GLBs, five syntax checks and126/100/26 SFX freshness.
Root ran both preflight and original-negative verifiers successfully.

The official artifact11649438416 was fetched independently: direct JSON3119B,
SHA256370b92e9603f36a2da17034f92d465379579b09a225cd5a510cf4344f5f51121,
byte-identical to the archived normal report. Its73% Preparing animals state
at90011.9ms supplies no model-specific cause. The original report, complete
job log and metadata are archived alongside their verifier in
normal-9c753d32-38000980557. Build success is distinct from smoke acceptance.

After review, root authorized exactly one native workflow_dispatch at f92c:
run38002516951, observed in_progress, resource_overlap=false, original90-second
readiness and complete model/variant requirements retained. This is a
diagnostic run, not acceptance or promotion. No retry or second run was
authorized. Its terminal result remains pending.
