# Quality restoration: material and shadow controls

Current fixed512, medium/day, same paused fixture. The 16 registered water materials retain identical IDs, types and numeric uniforms through medium → very-low → medium twice; uTime remains zero. Shadow renders advance once on each medium restoration. This rules out those recorded water parameters as the explanation; vector/texture uniforms and shader variants are not covered by this numeric audit.

Additional controls:
- ../mangrove-quality-shadow-control-20261023/: force a shadow-cache invalidation before the first sample, then perform normal quality switches. Differences persist (~25k day pixels, ~23k night). A stale initial shadow cache is not sufficient to explain the issue.
- ../mangrove-shadow-redraw-control-20261023/: stay at medium, invalidate and redraw shadows at each sample. Only 2 pixels differ in each daytime comparison (MAE <0.000012). Shadow redraw alone is not sufficient either.

No production correction made on these rejected hypotheses. Next attribution should inspect quality-specific shadow target/camera state, compiled material variants and far-quality restoration. Full-scene switch parity remains open; cache ground appearance/ownership evidence still stands. No performance claim. Browser errors absent in completed probes.

Reproduce through the existing harness with WG_FIXED_QUALITY_PROBE=1; WG_QUALITY_REFRESH_SHADOW=1 forces the initial redraw, and adding WG_QUALITY_CONTROL=1 keeps quality fixed while redrawing each sample. Use fixednative, medium, seed fixture, 10 cadence samples / 30 warmups, normal static camera. Main report includes corresponding named directories; source probe records water state and shadow counters.
