# WebGPU wall-impact publication latency, QA

Prepared raid with an animal already attacking a wall, unchanged game rules and an actual `AnimalLogicalHit`. Edge headless ran the normal development presentation, including the legacy renderer and the WebGPU Worker. We alternated three attempts without and three with `qa-webgpu-wall-fragments`, then ran one additional pair because an enabled attempt was invalidated by Vite hot reload. Each fresh browser context recorded after the game screen appeared until five seconds after the confirmed wall effect was observed. Every 200 ms the test requested a Worker inspection and then sampled the main-side confirmed state; frame intervals came from main-thread `requestAnimationFrame`. This sampling itself has a cost and the readouts are not atomic.

Windows enumerated one display adapter, NVIDIA GeForce GTX 1660, driver 32.0.15.8129. A separate WebGPU adapter request reported NVIDIA/Turing with no device identifier; this is consistent with that GPU, but it does not directly identify the renderer Worker's adapter. SwiftShader was not explicitly enabled. Browser-reported heap is the main page's JavaScript heap only, not total process, Worker or GPU memory. No GPU timestamp queries were recorded. Cache temperature, startup resource preparation and the duplicate legacy presentation were not controlled; the measurements cannot isolate fragment cost or establish steady-state FPS.

| Run | Fragments | Simulated-time lag p95 / p99 (s) | Sequence lag p95 / p99 | rAF p95 / p99 / max (ms) | Main JS heap p95 / p99 (MB, decimal) |
| --- | --- | --- | --- | --- | --- |
| 1 | Off | 4.45 / 5.30 | 143 / 147 | 66.65 / 433.24 / 10866.70 | 628.1 / 632.7 |
| 1 | On | 3.80 / 4.35 | 139 / 143 | 66.68 / 799.99 / 9900.06 | 656.4 / 663.0 |
| 2 | On | Invalidated by Vite hot reload | — | — | — |
| 2 | Off | 3.50 / 4.40 | 143 / 147 | 100.00 / 2033.38 / 11866.84 | 651.6 / 657.2 |
| 3 | Off | 3.75 / 4.40 | 136 / 155 | 66.67 / 1333.32 / 8566.85 | 666.3 / 671.8 |
| 3 | On | 5.40 / 6.30 | 129 / 159 | 66.71 / 966.59 / 8933.24 | 651.6 / 660.9 |
| Replacement | Off | 3.50 / 4.65 | 151 / 153 | 99.99 / 4933.45 / 9133.28 | 585.3 / 601.7 |
| Replacement | On | 3.95 / 4.75 | 145 / 149 | 66.67 / 1100.01 / 11666.80 | 648.7 / 652.4 |

Lag also occurs with fragments disabled. All completed runs saw the same confirmed wall hit; enabled runs drew 14 rigid fragments. Neither the overlap in lag ranges nor these startup-heavy samples support attributing the lag to fragments or claiming that the backlog safeguard makes presentation responsive. No publication overflow occurred in the completed runs. Individual Worker-inspection round trips reached roughly 1.5–2.4 s at p99, including Worker scheduling and the inspection itself. Fragments remain disabled by default.

The exact replacement-pair output is in [webgpu-wall-publications-final-pair.json](webgpu-wall-publications-final-pair.json). From a Vite server at `http://127.0.0.1:5175`, run:

```powershell
$env:NODE_PATH='C:\Users\Gabriel\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules'
.\.cache\tooling\node20.exe tools/experiments/measure_webgpu_wall_publications.mjs
```

The default is three alternating pairs. Set `QA_REPEATS=1` for one pair and `QA_OUT_FILE` to save the complete machine-readable results. No simulation mechanics were changed for the test; the initial state is prepared rather than a natural navigation run.
