# OpenCL defense proof: isolated QA result

**Conclusion:** OpenCL does not presently unlock 100-night campaigns on this host. The tested slope kernel is fast, but the full real-snapshot defensive proof is slower even under an optimistic replay that excludes discovering/generating the query batch. No production or balance code was changed. The native CPU path remains the default and fallback.

## Source and snapshot

- Branch: `codex/opencl-defense-qa`, based on `7fd47aad62c5e55c87add3f072ac3fb0a082d24b`.
- Retained native snapshot: `docs/qa/integrated-spiritual-survival/pilot-v90-q9-good-rolling-zarzas-canyon-712-seven/partial-state.json.gz`, SHA-256 `bf193cf625f19b9fe86731e30ebb445ebb2d7ce3f4489d52d7dbf7a455f39ab1`.
- The snapshot is day 6 of a stopped Gran Cañón/Saheliana native pilot. Its retained candidate wall plan is evaluated hypothetically with `nativePerimeterProof`; no wall is purchased or added to the saved game.
- GPU: Intel UHD Graphics, Intel OpenCL Graphics platform, **no FP64 support**.
- Reproduce the sample with `node tools/experiments/opencl-defense-capture.mjs <pilot-directory> <fresh-output.json> capture`; set `OPENCL_QA_SAMPLE_LIMIT=16384` for the large batch. Run `python tools/experiments/opencl-defense-slope.py <output.json.workload.json.gz> <results.json> <gpu-report.json>`, then use the capture script's `replay` mode with that results file. `OPENCL_QA_FORCE_CPU=1` exercises the no-GPU fallback. The retained snapshot already exists in this branch; intermediate workload/result arrays are regenerated, not committed.

## Where parallelism is and is not useful

| Operation | GPU suitability | Exactness and batching issue |
| --- | --- | --- |
| Procedural height/lattice and five-point slopes | Independent samples, theoretically strong | Terrain uses JS double-precision noise/height interpolation; this GPU has only FP32. The CPU must first discover adaptive path queries. |
| Static collision broad phase / occupancy | Independent cells; possible integer masks | Existing obstacle bounds, chunk index, and exact caches already avoid many checks. A GPU mask cannot replace narrow-phase footprints, moving geometry, or terrain validation without a complete geometry epoch. |
| Transitability at known poses | Good as a batched mask | Service/path queries reveal new poses sequentially; generating a dense grid up front can cost more than the paths use. Fractional positions and fluids still require exact native checks. |
| Connected components | Parallel label propagation possible | Existing positive component certificates and reused per-target service certificates already remove repeat work. GPU flood fill requires repeated passes or a full grid upload, while the native search exits early. |
| Target choice, path ordering, RNG, player policy | Leave on CPU | Sequential and order-sensitive; changing it risks different decisions even with an identical binary walkability map. |

The retained historical CPU profile `perimeter-proof-cost-v2.json.cpuprofile` attributed its largest sample groups to `TerrainField.lattice`, `surface`, `workerSurface`, `coarseSegmentClear`, `terrainValid`, and wall collision bounds. It observed 14,563 `approachPath` calls in a much older, slower source configuration. Those historical samples are motivation, **not** the baseline timing below. Current code, on the same retained state, completes this particular proof in about 1.8 seconds. Earlier exact surface/certificate reuse and bounded lattice-tile experiments should be considered before any GPU port; their QA results remain under `docs/qa/integrated-spiritual-survival/`.

## Prototype and measured result

The QA adapter records real `terrainValid` coordinates during one unmodified native proof. The CPU produces the exact 20 double-precision heights needed for each five-sample canyon slope test; OpenCL receives one contiguous FP32 height buffer, computes a binary slope mask, and returns one byte per sample. The native CPU result is compared with each proposed mask. Any mismatch or uncaptured coordinate uses the original `terrainValid`. The GPU does not run the pathfinder or mutate the game.

For 16,384 actual query samples, input transfer was 1,310,720 bytes and output 16,384 bytes. The median of six warmed OpenCL passes was **0.534 ms** end to end, with **0.068 ms** median kernel time. A scalar Python CPU slope loop over the same precomputed heights took **21.0 ms**; that is a kernel-only comparison across runtimes, not a game speedup. Preparing those heights in JS cost another **71.8 ms** after the capture proof. GPU-vs-double CPU slope decisions matched on these 16,384 samples, but **169** differed from full native `terrainValid` because slope alone omits other checks such as fluid; they were rejected. The device's missing FP64 means sampled agreement cannot establish numerical equivalence near thresholds for all seeds/biomes.

Fresh-process AB/BA whole-proof observations with the same snapshot and current source:

| Order | Native CPU | Optimistic GPU-result replay |
| --- | ---: | ---: |
| A | 1,805.8 ms | — |
| B | — | 1,929.9 ms |
| B | — | 2,013.4 ms |
| A | 1,729.9 ms | — |

Native mean: **1,767.8 ms**; replay mean: **1,971.7 ms** (**11.5% slower**). Replay replaced 21,472 of 159,368 terrain checks with prevalidated GPU-produced decisions, while 137,896 used the CPU fallback. This is an *optimistic* replay: its timed proof excludes the earlier full CPU pass required to discover samples, the 71.8 ms height preparation, OpenCL compilation and the ~0.5 ms GPU pass. Including them makes the result worse. Additional native A/B observations (`cpu-baseline-a/b.json`, `gpu-replay-16k.json`) show the same direction; timings are local wall-clock observations, not a controlled GPU benchmark or whole-campaign throughput measure.

The full native proof report SHA-256 was identical in every baseline, capture and replay: `a5537bf0148fff18853de1e47fe266ab3a4e966a04501f454ce28e3e871df93d`. The serialized state SHA-256 was also identical. Thus the tested *defensive proof decision, diagnostic report, and saved state* match byte-for-byte. This does **not** establish equivalence for the entire virtual-player policy or a 100-night campaign. A forced CPU-fallback run matched the same hashes.

## Recommendation and limits

Do not integrate this OpenCL prototype. The GPU arithmetic is cheap; obtaining exact procedural terrain values, discovering adaptive queries, applying fluid/collision rules and sequential routing dominate. A future GPU design would need a deterministic, tile-based representation shared by CPU and GPU, a complete geometry-epoch contract, batched candidate evaluation at policy boundaries, and either FP64 hardware or conservative FP32 intervals with CPU resolution of every ambiguous case. It must then prove equality for full policy decisions and states across multiple snapshots, biomes and seeds, and benchmark the full batch including generation, transfers and synchronization. These changes are substantially larger than a kernel substitution. Keep the current exact CPU certificates, spatial indexes and fallback while pursuing algorithmic reductions and profiling first.

Validation: `node --check` on the QA capture script, `python -m py_compile` on the OpenCL script, real GPU execution, forced-CPU fallback, and fresh-process native/replay SHA comparisons. No 100-night campaign was launched by this isolated experiment.
