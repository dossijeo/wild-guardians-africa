# Volcano shoreline parity after per-pose settling

The previous native/QA comparison had one extra draw and 4353 triangles in a night view. That capture waited for actors only before a phase, then rendered once per moved camera. This rerun waits for actorReady and renders twelve additional frames at every pose, identically in both arms. No renderer/material/LOD behavior was changed.

All six day/night pairs now match RGB exactly, with identical camera, target, time, calls and triangles. Twelve real captures, seed 712, medium, 1280x720, same three poses and native natural shore/regional palette settings. No browser/WebGL errors. This supports premature capture as the cause of the prior mismatch; it does not identify which transient draw or actor caused it. The general native-edge parity harness now also settles each pose.

Reproduce `node tools/experiments/capture-volcano-shore-settled-parity-20261022.mjs`, then `python tools/experiments/audit-volcano-shore-settled-parity-20261022.py`, Vite 5190. The old differing captures remain retained as evidence; do not use them for cost comparisons. This is visual equivalence validation, not a benchmark. Native construction/steady-state benchmarks and Canyon opaque-core adoption remain pending.
