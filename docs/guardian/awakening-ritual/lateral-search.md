# Lateral fallback search — 2026-10-29

Measured the actual installed Guardian GLB at runtime scale 2.4: bounds x ±0.736524, y ±1.141992, z -0.375586..0.365040. The existing conservative body envelope is not grossly undersized. This does not cover every animated pose.

Expanded the emergency wider rings from offsets 0/±0.4/±0.9 to also include ±1.5/±2 radians. These rings are used only when nearby sites lack a clear, framed view. The bounded footprint count is now 34 rather than 26; corresponding existing edge-search tests were updated while retaining their framing and crop/worker exclusion assertions.

18 placement tests pass. Production build succeeds (535 modules, 16.42s, existing import/chunk warnings). [Eight-view screenshot](lateral-search.png), [UI report](lateral-search-ui.txt): eight one-Guardian/cleanup checks pass with no errors. In the tower view, the spirit shifts leftward from the roof and its energy silhouette is more separated. **Still not full artistic acceptance:** the distant figure is high/small and needs a full-resolution inspection. The plant itself remains hidden by the tower at this deliberately fixed QA camera. No camera, economy or game rules changed.

The extra emergency candidates and worst-case elevated checks require component timing before performance acceptance. This is an incremental improvement, not closure of the full occlusion matrix.
