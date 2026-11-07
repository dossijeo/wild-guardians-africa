# Current Guardian component GPU measurements

Production state: 2d0dbd4b3. QA instrumentation now records hidden frames and Guardian animation/VFX CPU samples per mode. The scene has 20 animal entities, 12 crops, one worker, one building, and a frozen Shield at visual age 0.6 s. Close framing does not place all twenty animals on screen; `wide` uses the laboratory's farther zoom. `context.png` shows the close framing and QA overlay.

Intel UHD / ANGLE D3D11, 1600x900, pixel ratio 1. Four modes alternate in balanced rotating order: no Guardian presentation, body only, effects only, both. Each run has 40 warmup frames then 240 measured frames (60 per mode), using asynchronous GPU elapsed queries. Simulation, spell age and pose remain frozen. The instrumented RAF is not a game FPS measurement. The hide modes still execute the Guardian controller; therefore GPU mode comparisons isolate drawing, while CPU animation/VFX figures are direct samples of the active controller, not an enabled/disabled CPU comparison.

| Run | Age (s) | GPU median none / all (ms) | Median paired all-minus-none (ms) | Paired first / second half (ms) | All-mode animation / VFX p95 (ms) | Draw calls none / all |
|---|---:|---:|---:|---:|---:|---:|
| steady-first | 0.8 | 29.597 / 30.229 | 0.559 | 1.094 / 0.465 | - / - | 85 / 92 |
| arrival | 0.12 | 28.715 / 27.943 | 0.549 | 0.620 / 0.490 | 0.240 / 0.120 | 85 / 93 |
| fade | 1.9 | 28.950 / 29.468 | 0.692 | 0.681 / 0.692 | 0.205 / 0.105 | 85 / 92 |
| steady-repeat | 0.8 | 39.044 / 39.946 | 1.028 | 0.730 / 1.830 | 0.200 / 0.090 | 85 / 92 |
| wide | 0.8 | 32.817 / 32.689 | 0.351 | 0.299 / 0.411 | 0.165 / 0.090 | 101 / 108 |

The paired statistic subtracts `none` from `all` within each four-frame block, then takes the median of the 60 differences. It is not the difference between two global medians. The arrival and wide global medians would misleadingly suggest an improvement; nearby paired differences are positive. This remains descriptive evidence, not proof of causality or a confidence interval. Raw per-frame query results and mode p95 values are retained in each run JSON.

All five runs have 240 resolved samples, zero disjoint events, no pending queries, and no reported errors. The first steady run predates hidden-frame/CPU component instrumentation, so those fields are unknown there. The four subsequent runs report zero hidden frames. The first synthetic analyzer check used two known differences (2 ms and 1 ms) and an incomplete third block: it returned two pairs with median 1.5 ms and ignored the incomplete block.

Observed paired GPU medians range 0.351–1.028 ms. The body's draw contribution is three calls; its effects add four or five depending on phase. All-mode animation p95 ranges 0.165–0.240 ms and VFX update/prepare p95 0.090–0.120 ms. Do not add those percentiles as though they came from the same frame. Reference GPU medians vary substantially between runs (about 29–39 ms), so differences across runs cannot be attributed to the feature.

## Reproduction

Open `/tests/browser/guardian-combat.html`, choose Night, freeze, cast Shield and step five times by 0.12 s. Select the GPU phase and run the interleaved GPU comparison. For `wide`, use the Zoom button before repeating 0.80 s. Save the DOM status JSON after the report completes.

Run:

```powershell
python tools/guardian/summarize_gpu_pairs.py docs/guardian/gpu-current/arrival.json docs/guardian/gpu-current/fade.json docs/guardian/gpu-current/steady-repeat.json docs/guardian/gpu-current/wide.json
```

## Acceptance limits

This isolates the current Guardian's drawing cost at arrival, steady float and dissolve. It does not measure moving raids, ragdoll creation, navigation, input latency, worst-case spikes, Multiply's new branches or sustained integrated-GPU gameplay. No global performance problem was investigated or changed. Full phase-2 fluidity acceptance remains open; these measurements must not be presented as a game FPS improvement or a complete performance sign-off.
