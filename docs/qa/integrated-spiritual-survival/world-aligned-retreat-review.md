# World-aligned native retreat connectors

The original v114 failure is preserved at `bce7076f`; it remains a technical failure, not a defeat. The fix interleaves world-aligned proposals with the existing exit-relative fan in the rare incremental grid-exit bridge. This preserves the original first proposal and all original relative directions, while covering straight narrow passages that the rotated fan misses.

Every proposal still requires native walkability and swept collision. Search uses the existing native incremental iterator with its direct long-ray shortcut disabled. The per-call budget remains eight proposals, one iterator slice or eight route-verification legs. The finite candidate set increases from 96 to 192; worst-case cumulative search work can increase, but no unbounded loop or synchronous iterator drain is added. Successful ordinary routes do not enter this fallback.

Sixty tests pass covering local/dynamic collisions, worker encounters, all five animal species, physical narrow passages, grid/quarter/footprint/slope fallbacks, geometry invalidation, persistence and route clearance. The new retained v114 test physically moves the exhausted animal to its exact original exit, with each movement bounded by native speed and checked against native swept geometry. It reloads while moving and then observes actual raid completion and dawn on day 12. Radius, hits and ledger remain unchanged.

The production Vite build also passes (365 modules, 10.78 seconds). Its existing large-bundle and mixed static/dynamic import notices remain visible; these are not a new animation-performance measurement.

The reproducible `tools/probe-stopped-native-retreat.mjs` records the same continuation on a copy: 2,353 native steps, 480 moving steps, 235.3 simulated seconds and approximately 2.3 seconds wall time. The maximum whole-simulation tick is 502.4 ms; this includes all workers and simulation systems and has not been attributed to the connector. It is retained as a limitation, not hidden or described as a smooth gameplay/GPU benchmark. The original failed campaign is not resumed or rewritten by this probe.

No prices, animal counts, budgets, damage, wall resistance, collision sizes or victory rules change. No teleport, forced disappearance or synthetic economic result is used. A new complete campaign must start from frozen source after the regression gate; passing this retained exit does not approve the overall balance or all possible future routes.
