# WebGPU: terrain support and graphics-worker trace

## Scope and trace

On the NVIDIA Turing WebGPU adapter, the saved native savanna raid with eight
animals was run with temporal grass generation in its auxiliary worker and the
experimental shared light, motion and phase pools enabled. The simulation was
paused through resource readiness and a 10 s warm-up, then resumed. This is one
scenario, not a complete game or a visual-parity assessment.

The diagnostic trace covered 11,131.56 ms and contained 118 graphics-worker
tasks lasting at least 50 ms. Sampling within those tasks attributed roughly
2,876 ms to admission, 2,700 ms to timeline, 3,874 ms to drawing, 26 ms to
grass and 326 ms to other work. These are sampled stack classifications within
the selected long tasks, not exclusive CPU/GPU timings; tracing itself perturbs
the run. The two longest tasks were 240.3 and 235.2 ms, largely attributed to
admission and Three.js node construction. The trace does not establish GPU
execution time or explain every dropped frame.

Some timeline samples led to the confirmed terrain-support certificate. Its
trajectory cuts land on grid boundaries, where the ordinary terrain sampler
uses Three.js raycasting over the mesh. The full mesh raycast also checks
against the resident surface; eliminating this comparison outright would
weaken detection of a discrepancy between the surface and the rendered mesh.

## Alternatives and experiment

1. Eliminate mesh checks after certification. This would require proving that
   the resident surface and mesh remain identical, including seams, material
   sides and changed vertex buffers; the existing certificate does not prove
   all of these conditions. Not selected.
2. Cache sampled points with invalidation by mesh revision. This only helps
   when coordinates recur exactly and adds cache and lifecycle work. Not
   selected without evidence of sufficient reuse.
3. Check only the nearby triangles of a certified canonical mesh, falling back
   to the original raycaster for unsupported meshes. An opt-in prototype used
   Three.js triangle intersection and preserved the comparison with the
   resident surface. Its tests compared grid edges, diagonals, material sides,
   bounds and altered mesh heights against the original raycaster.
4. Move the checks to another worker. That reorganizes the cost and adds
   snapshot/ownership and versioning concerns rather than eliminating it.

The prototype was evaluated A/B/B/A on the same saved raid with 10 s measured
windows, sparse diagnostics and the same WebGPU configuration. All four runs
reported a valid WebGPU scenario with eight animals and auxiliary grass worker.
Times below are milliseconds; final lag is the difference between simulation
and presentation times at the last sparse inspection, in seconds.

| Run | Local triangle ray | Mean frame interval | p95 | p99 | Max | Final lag |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| A1 | off | 36.67 | 66.67 | 66.71 | 66.73 | 4.05 |
| B1 | on | 37.60 | 66.67 | 66.69 | 66.73 | 3.35 |
| B2 | on | 38.06 | 66.67 | 100.00 | 100.01 | 3.95 |
| A2 | off | 39.60 | 66.68 | 99.97 | 100.04 | 3.30 |

These short, noisy runs do not demonstrate a global improvement, and sparse
lag observations are not latency distributions. They contain no GPU timing or
GPU-memory measurement. The prototype was therefore removed rather than
enabled or retained as another production path. No gameplay, terrain support,
rendering or configuration behavior was changed by this experiment. Local
working artifacts include `.cache/local-terrain-{a1,b1,b2,a2}.jsonl` and
`.cache/full-shared-actor-classified.json`; these caches are not versioned.

For a new baseline, run `tools/experiments/measure_webgpu_native_horde.mjs`
with `QA_ONLY_SKIP_LEGACY=1`, `QA_REPEATS=1`, `QA_WINDOW_MS=10000` and
`QA_QUEUE_DIAGNOSTICS=1` against a Vite server configured with
`VITE_PRESENTATION_BACKEND=webgpu-worker`, `VITE_WEBGPU_GRASS=true`,
`VITE_WEBGPU_TEMPORAL_GRASS=true`, `VITE_WEBGPU_GRASS_WORKER=true`,
`VITE_WEBGPU_ADMISSION_SHARED_LIGHTS=true`,
`VITE_WEBGPU_SHARED_MOTION_POOL=true` and `VITE_WEBGPU_SHARED_PHASE_POOL=true`.
The discarded B implementation must be reconstructed to reproduce that side.

The remaining evidence points to admission/node construction and drawing as
larger avenues for the next investigation; it does not prove which individual
change would improve the complete frame or presentation latency.
