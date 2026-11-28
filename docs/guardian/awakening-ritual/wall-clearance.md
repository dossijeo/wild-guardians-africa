# Ritual clearance beside a wall — 2026-10-29

Follow-up to main-game-plant.md. A seedling supplied a very low hover height. An intact wall behind the spirit need not occlude visibility rays, yet its projected silhouette crowded the arrival.

For the direct-above ritual candidate, guardianPlacement now includes intact walls within 3 scaled world units in the height ceiling, using the same 2.5-unit wall top already used by summon collision volumes. Existing occupied-volume, visibility and frame checks still gate the candidate; blocked/out-of-frame cases retain the existing fallback. No per-frame scan is added; ordinary spell placement is unchanged. Destroyed walls do not raise the candidate.

Repeated the actual main-menu/load/plant-confirm flow at seed 712 and the default 1280x720 camera. [Before](main-plant-arrival.png) and [after](main-plant-clearance.png) show the Guardian now visibly above the wall instead of sharing its central silhouette. Screenshot timings are approximate, not identical animation frames. The charge is 0 and balance remains 855 after confirmation; the partially draining purple bar in the new arrival capture is its transition, not remaining logical charge.

17 placement tests pass, including intact vs destroyed neighboring wall coverage; 3 ritual/lap-pose tests pass. Production build succeeds: 535 modules, 9.99s, existing far-atmosphere import/chunk-size warnings. This resolves the observed composition at this camera, not the full multi-angle/obstacle acceptance matrix or a global performance claim.
