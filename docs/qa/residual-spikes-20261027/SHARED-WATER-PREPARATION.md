# Shared incremental water preparation

Extracted `prepareNaturalWaterBedIncremental` from the existing asset-water coalescing implementation. Both asset preparation and the QA chunk candidate now use it. The global scheduler continues to own frame admission; 0.75 ms is only a coalescing target because individual sample blocks remain atomic.

The helper borrows geometry. The asset wrapper owns/disposes its proxy; chunk preparation retains its existing private-group ownership and cancellation. No texture, shader, sample order, byte packing or publication rules were changed. The scene's chunk path is not enabled by default yet.

Validation: `node --test tests/natural-water-edges.test.js tests/prepare-terrain-chunk.test.js tests/chunk-water-bed-candidate.test.js tests/chunk-water-bed-lifecycle.test.js` — 24 passed. Includes byte/sample equivalence, no resampling during installation, proxy disposal, borrowed geometry ownership, and invalidation for quality/context/revision/teardown/abort through the real scheduler module.

This is consolidation of the measured candidate, not a new performance claim. Previous browser evidence predates this extraction; real in-flight interruption and remaining night/construction acceptance are still pending before activating the chunk path.
