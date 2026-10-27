# Shadow-cache bypass: decision gates

The active A/B/A/B sequence uses the same promoted pthread runtime and agricultural fixture. A enables the existing exact snapshot cache; B disables its snapshot construction and comparison, but still renders all shadows. No production shadow policy has changed.

First completed baseline (1-baseline/summary.json): 6,547 draws and 2 cache hits. This confirms low reuse for this moving-camera, active-simulation workload, not for static scenes. It does not establish the performance benefit of bypassing the cache.

Before implementing a policy:
- Complete all four runs and validate provenance with `node tools/experiments/compare-release-border-abab.mjs docs/qa/residual-spikes-20261027/shadow-bypass-abab shadow-bypass`.
- Compare CPU, GPU and presentation tails separately, with streaming latency and workload counts. Reject a claim of global fluency based only on CPU savings.
- Keep cache reuse for static scenes. If repeated misses justify adaptive probing, skipped probes must draw fresh shadows; they must never reuse an unchecked map.
- After a skipped interval, capture inputs for the freshly drawn map before comparing a later frame. Invalidation, forced refresh, context changes and unknown depth contracts must preserve the current conservative behavior.
- Validate actual depth readback under instance edits, camera/layer changes, removals and changes made during a skipped interval before running an adaptive candidate in the game.

The earlier packed-snapshot implementation was rejected after its A/B/A/B results. This experiment tests avoiding demonstrably unproductive comparisons, not repacking the same work.
