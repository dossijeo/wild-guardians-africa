# Native crop shadow preparation — pilot 81

Runtime `08fe1462`; QA source `ca29f6ed`. One instrumented attribution run, not an unprobed paired performance comparison or GPU-duration measurement. No production activation.

Preparation submitted 72 original/bridge shadow sources in 47.9 ms; 45 bindings initialized. At the preparation boundary geometry count stayed 120, textures 65; programs rose 43 to 45. This does not measure total memory. Both subsequent native first-crop depth draws selected keys exactly present in the preparation list, matching pilot 80's native shadow recipe. No shader/program information or link-status call exceeded the trace's 5 ms recording threshold; smaller calls are not claimed absent.

| Paid first crop | First draw CPU | Texture submission CPU | Image | Following 2 s RAF maximum | RAF >100 ms |
|---|---:|---:|---|---:|---:|
| Maize | 55.6 ms | 43.0 ms | ImageBitmap 2048 × 2048 | 66.7 ms | 0 |
| Millet | 65.5 ms | 53.0 ms | ImageBitmap 2048 × 2048 | 83.1 ms | 0 |

Native-call CPU wall times include wrapper overhead, not GPU timer queries or presented-frame durations. Atlas submission remains a meaningful first-use stall. Exact-key evidence supports the hypothesis but does not close smoothness acceptance.

Initialization 11.793 s / controls 15.939 s, six RAF intervals >50 ms and zero >100 ms, cannot support a causal comparison: fresh focused process inventory was empty; pilots 78–80 had four verified background campaigns. Origin/driver caches differ too. Original evidence remains preserved.

Readiness, logical/save state and intended camera checks passed. Cleanup: disposed/contextLost true, errors empty, tab closed and selected browser inventory empty. Full JSON and current CPU inventory accompany this note. Wider visual/lifecycle/memory/performance gates remain open.
