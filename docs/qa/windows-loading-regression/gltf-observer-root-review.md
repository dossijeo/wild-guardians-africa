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
