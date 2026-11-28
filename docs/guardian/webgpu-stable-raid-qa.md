# Publication lag after a paused loading barrier

The initial attempt with the unmodified raid never reached its readiness condition: the raid ended while visuals were still loading. That run was stopped and is preserved in [webgpu-stable-raid-initial-timeout.jsonl](webgpu-stable-raid-initial-timeout.jsonl); it has no valid measurement window.

The revised QA fixture starts from the existing raid snapshot with one animal already attacking an intact wall and a `qa-stable-start` pause. Both variants hold the authoritative simulation during loading. The harness waits for the WebGPU backend, terrain, sky, biome, crops, center and wall textures, one worker and all present animals to report ready; it then waits ten more seconds and verifies that simulation time is unchanged. A development-only hook releases the existing pause command. It records 20 seconds of main-thread `requestAnimationFrame` intervals and requests Worker inspection only at the beginning, midpoint and end. These readiness signals do not prove all possible resources and driver work are finished. The prepared attack is a real simulation action, but this is not a natural navigation or horde comparison.

| Metric | Legacy draw on | Legacy draw skipped |
| --- | --- | --- |
| Backend / separate adapter request | WebGPU, NVIDIA/Turing | WebGPU, NVIDIA/Turing |
| Readiness time before 10 s paused warm-up | 56.63 s | 37.66 s |
| Simulation time while paused | 4.449745 s | 4.449745 s |
| Simulated-time lag, three snapshots | 0 / 0.25 / 7.75 s | 0 / 3.70 / 7.40 s |
| Sequence lag, three snapshots | 0 / 25 / 128 | 0 / 140 / 130 |
| Inspection round trip, three snapshots | 7.60 / 130.09 / 6.80 ms | 7.88 / 61.19 / 44.30 ms |
| rAF samples | 313 | 438 |
| rAF mean / p95 / p99 / max | 82.32 / 33.38 / 33.40 / 14166.70 ms | 50.08 / 33.38 / 66.67 / 4699.93 ms |
| Main page JS heap snapshots | 658.3 / 588.0 / 567.2 MB | 587.6 / 584.4 / 591.0 MB |

Three lag observations cannot support a meaningful lag p95 or p99. They are approximate because Worker inspection returns before the main-side state is sampled. The inspection calls and rAF recorder add some instrumentation cost, and the requested 20-second window can extend while the browser responds. The long maxima demonstrate that the readiness barrier did not eliminate all exceptional stalls. One pair with differing warm caches is insufficient to attribute the differences to legacy rendering or infer normal FPS. Frame counts, only one prepared actor, scene evolution and driver work can all affect the result. No GPU timing or GPU/Worker memory was captured; the heap is only the main page's reported JS heap.

Both variants reported 32 visual workers at the first sample and zero in the later samples. The original sample did not retain the corresponding main-state worker count, so this is an unresolved observation, not proof of a defect; the script now records both counts in future runs. Windows listed one NVIDIA GeForce GTX 1660 with driver 32.0.15.8129, but the browser's independent adapter request returned no device identifier, so the Worker adapter is not independently identified.

Raw pair: [webgpu-stable-raid-barrier-pair.jsonl](webgpu-stable-raid-barrier-pair.jsonl). On the Windows development machine with Vite at `http://127.0.0.1:5175`:

```powershell
$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
$env:QA_REPEATS='1'
$env:QA_WINDOW_MS='20000'
$env:QA_OUT_FILE='.cache/webgpu-stable-raid-barrier.jsonl'
.\.cache\tooling\node20.exe tools/experiments/measure_webgpu_stable_raid.mjs
```

The `qa-webgpu-benchmark-barrier` hook is development-only. It releases only the QA pause through the existing authoritative pause command. Fragment experiments remain disabled in this comparison. No simulation rules were modified.
