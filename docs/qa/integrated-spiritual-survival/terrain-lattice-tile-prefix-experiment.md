# Exact lattice tiles: isolated CPU experiment

The instrumented native Desert prefix contains 64 existing crops, without deleting or moving other crops. Its cold native profile spent about 2.22 seconds preparing watering routes and 3.33 seconds on return geometry/paths. V8 samples repeatedly point at `TerrainField.lattice` and `slope`; serialization/GC also appear in the whole-process profile. The raw profile is retained. No exclusive-sample total is described as exact CPU instruction cost or GPU time.

This candidate changes only an instance-local lattice cache in an isolated QA adapter. The native height function, triangle interpolation, slope, fluids, generation, navigation, RNG and snapshots remain unchanged. Integer height samples use bounded 32-by-32 tiles, with 16 FIFO tiles and a direct last-tile fast path. Non-integer/unrepresentable queries use the original method. Undefined/custom non-number height adapters retain their original return values. The adapter can be restored without changing the class prototype or native height map.

The experiment assumes immutable terrain instances. Height-function or height-cache-object replacement invalidates its tiles; in-place terrain edits require explicit invalidation. This is not a production integration, and it does not claim support for an unannounced `heightCache.clear()` or arbitrary in-place configuration edits. Existing fields, production workers and the active v105 campaign are untouched. The old full-surface memo failures remain archived; this caches integer corners in bounded tiles rather than millions of exact fractional surface coordinates.

| Fresh-process AB/BA order | Watering + return CPU observation |
|---|---:|
| Native A | 5,565.07 ms |
| Tiled B | 3,394.76 ms |
| Tiled C | 3,402.84 ms |
| Native D | 5,587.69 ms |

The native mean is 5,576.38 ms and tiled mean 3,398.80 ms, an observed 39.05% reduction. The strict audit verifies identical retained input and recorded sources, all 64 crop IDs, successful/failed service outcomes, 116 path calls, exact watering destination/path hashes and return-path hashes. State/file hashes remain unchanged. Timer overhead is present and another campaign was active; this is not controlled hardware, total loading/worker/campaign throughput, frame-time or GPU acceptance. Do not extrapolate this percentage to the entire dense farm or claim the rejected full proof is now affordable.

The two tiled runs allocate 147,456 bytes of typed-array payload, their configured maximum. This excludes JS map/object overhead, the existing native cache and other scene/worker fields; total RAM was not measured. All six biomes preserve exact sampled surface/slope/water outputs across tile boundaries and negative/far coordinates. Validation additionally covers FIFO bounds, invalidation, custom values, fallback and restoration.

## Final adapter verification

The adapter now rejects custom lattice methods rather than silently changing their semantics. After that guard was added, all 20 tests passed: six biomes with seeds 1, 712 and 2026, plus lifecycle and validation checks. These sampled equivalence checks are not exhaustive terrain coverage.

The final source version was measured again with fresh processes in AB/BA order. The retained final audit checks identical sources and input, 64 crop route/service results, all exact destination/path hashes, 116 path calls and unchanged state.

| Final AB/BA order | Watering + return CPU observation |
|---|---:|
| Native E | 8,286.09 ms |
| Tiled F | 4,338.64 ms |
| Tiled G | 4,557.42 ms |
| Native H | 8,399.49 ms |

The final native mean is 8,342.79 ms and tiled mean 4,448.03 ms, an observed 46.68% reduction. Absolute timings differ from the first series while the native campaign continues concurrently. Both series are retained; neither is a controlled hardware benchmark, a full-farm service sweep or a game frame-time measurement. The result justifies further isolated lifecycle and navigation validation, not production activation.

Next gates are native geometry/RNG/persistence regressions, bounded memory and invalidation under real lifecycle changes, a representative full-farm service measurement, and fresh frozen campaigns after v105 terminates. No production source or game parameter has been modified by this experiment.
