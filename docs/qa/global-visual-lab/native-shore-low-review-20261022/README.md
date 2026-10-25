# Integrated six-biome low-quality review

36 real captures, six biomes, day/night, three settled views, seed 712, low quality, 1280x720. Native regional palettes, natural edges, river soil bank, mangrove sediment/moss and Canyon-only opaque core enabled. No QA water replacement. All 12 records have no browser/WebGL errors. This is a visual compatibility review, not proof of low-profile performance or mockup-quality completion.

Reviewed overview-day.jpg and overview-night.jpg:

- Savanna: warm ground and coverage remain legible; subdued pond water fits better, but a cyan rim persists in the original model and needs targeted investigation without changing its silhouette.
- River: banks and vegetation remain distinguishable. These views target the settlement pond; main-channel evidence remains in earlier reports.
- Mangrove: approved moss shore survives low quality. Olive water is too uniform/opaque-looking, especially at night; retain the shore and refine the water body.
- Desert: approved rich dune/sand shading remains visible by day and night. No natural water is created there.
- Volcano: luminous lava and dark rock remain clearly separated; it stays lava rather than receiving an aquatic palette.
- Canyon: mineral blue and soft shore remain readable; core preserves the image. The smooth channel boundary and sparse bank detail still leave room for artistic improvement.

The current evidence does not prove performance on all modest devices, all seeds or long sessions. Missing global work is not redefined away by this successful capture gate. Next prioritize visible water integration issues alongside remaining construction cost, rather than indefinite microbenchmarks alone.

Reproduce `node tools/experiments/capture-native-shore-low-review-20261022.mjs`, then `python tools/experiments/audit-native-shore-low-review-20261022.py`, Vite 5190. Overview sheets show view 0; all full-resolution poses and counters are retained.
