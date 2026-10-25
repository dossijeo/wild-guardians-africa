# River streaming control: filter disabled versus persistent filter

Reproduce with `node tools/experiments/capture-river-underlay-mask-persistent-stream-control-20261022.mjs`, then `python tools/experiments/audit-river-underlay-mask-stream-control-20261022.py`. Vite port 5190 required.

Same seed 712, media, 1280x720, paused simulation, fixed wind, settled 96-unit round trip as the preceding probe. Both arms retain the same mask computation and geometry; control sets the shader filtering weight to zero. This isolates visible filtering, not its CPU cost. No performance measurements.

| Arm | Phase | Changed return pixels | Max channel delta | Mean absolute RGBA delta (0-255) | Return mask hashes |
|---|---|---:|---:|---:|---|
| Disabled filter | Day | 11604 | 39 | .007334 | Different |
| Persistent filter | Day | 10438 | 39 | .006812 | Different |
| Disabled filter | Night | 0 | 0 | 0 | Exact |
| Persistent filter | Night | 0 | 0 | 0 | Exact |

Draw and triangle counts return exactly in all four runs. No console/GL errors or orphan mask ownership. Eleven chunk-mask hashes change on the first daytime round trip in both arms; none change during the following nighttime round trip. Hashes cover whole chunks, including offscreen accepted tiles: a changed hash alone does not establish a visible error. Day and cache-warmth are confounded here; do not infer a day-specific lighting defect or blame only caching.

Conclusion: return-image drift is not exclusive to the filter. This does not fully exonerate the candidate or establish causal equivalence. Next isolate cold versus warm repeated daytime loops and inspect changed mask regions. Real gameplay occupancy events remain unvalidated. Keep QA-only; global artistic objective remains incomplete.
