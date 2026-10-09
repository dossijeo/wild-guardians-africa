# Independent root review of the original native result

Run38005088945 is terminal failure, source24b76926, inputs compile_window=true and resource_overlap=false. Root independently downloaded official artifact11650758352: direct JSON, 28,768 bytes, SHA256 `58a1d824a7c639460adab9ed29beaf0cce2d2e2ee303af7a920701d17e995c81`. It matches the archived payload; the archive verifier passes. Build/executable/installer completed; native minimization was skipped after smoke failure.

The original 90-second gate ended after90.0655s at86%, readinessfalse, visible/focused1028x720, contextnotlost. Compilation started0/completed0/activeempty/windowHighWater0. Thus this execution **does not exercise the two-batch window** and cannot demonstrate its benefit or cost. It is still an unsuccessful complete-load candidate, not accepted or promoted.

The snapshot records230 transfer observations,56 pending,44 rows omitted,0 failures,8 completed GLTF records. Chunks/hands/actors/far snapshots are null. App-world-load is active47.8791s; early prepared-pending38.6243s and pre-world setup3.5649s are separate awaited observations. Child spans must not be added as exclusive CPU/GPU time. The bridge GLTF record spans21.9223s, heuristically split at responseEnd into21.0282s before and0.8941s after. This packaged local-protocol boundary does not prove Internet latency or parsing-only cost.

The earlier f92 diagnostic reached World compilation with transfers idle. This different stop point precludes attributing between-run timing differences to the unexercised window. Renderer identity is a fact, not a causal measurement. No automatic rerun or lower readiness gate is authorized.

## Source-grounded next candidate

Root inspected the unchanged wall loader and runtime descriptor. `Assets.walls` requests five base buffers for each of20 pieces, then their morph buffers:160 unique binary URLs containing5,135,408 bytes in total, largest161,712 bytes. The wall texture is additional and excluded from this binary count. All requests still feed required wall prototypes; no subset can be omitted to obtain readiness.

An isolated offline contiguous-buffer packaging candidate is authorized for implementation/CPU validation only. Its purpose is to reduce request fanout while preserving bit-exact source data, types/alignment, indices/UV/normals, regions, every morph and all required material/GPU preparation. It must retain reproducibility/originals, backward-compatible descriptors, cancellation/resource ownership and package closure without distributing redundant original binaries if eventually promoted. No saving is presumed. No Tauri protocol, shader-window, sky-overlap or driver change may be mixed into that candidate; another native dispatch requires frozen root review first.
