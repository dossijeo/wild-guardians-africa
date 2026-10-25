# Native shore construction profile

Six biomes, native natural edges and regional palettes, seed 712, medium 1280x720. Day/night five-point round trips. QA instrumentation times prepareNaturalWater and records packed texture bytes plus disposal. No geometry or material behavior changes. No browser/WebGL errors. Sixty real captures retained. Timing includes instrumentation and is observational, not ABAB or GPU time; day includes initial loading builds, night is a warm second traversal.

| Biome | Day builds / total ms / max ms | Night builds / total ms / max ms |
|---|---|---|
| River | 75 / 180.2 / 13.3 | 34 / 74.7 / 8.3 |
| Canyon | 24 / 345.8 / 72.3 | 15 / 226.5 / 58.5 |
| Mangrove | 45 / 445.6 / 21.0 | 25 / 236.6 / 18.7 |
| Savanna | 69 / 96.3 / 8.1 | 36 / 34.7 / 2.3 |

Volcano and Desert full values are in summary.json; Desert creates no shore maps. Canyon p95 build 60.1/53.4 ms day/night; Mangrove 19.8/16.5 ms. This establishes a meaningful synchronous preparation cost, separate from the previously measured GPU cost. It does not establish how much of real continuous-camera frametime it causes.

Tracked live map bytes return exactly to initial values in every biome and both phases: River 477040, Canyon 390604, Mangrove 279296, Savanna 436916, Volcano 457204, Desert 0. Peak across the tested scenes is 500032 bytes. These are logical packed map storage bytes, not full GPU allocation measurements, and short return tests do not prove long-term leak freedom.

Recommendation: retain the visual result and first separate height sampling, boundary extraction and packing costs, especially Canyon horizon and Mangrove. Canyon currently builds boundary structures even though its boundary distance is constant; investigate removing that unnecessary work without changing output. Do not reduce shoreline resolution merely to make these numbers smaller before measuring exact-output opportunities.

Reproduce Vite 5190, `node tools/experiments/profile-native-shore-construction-20261022.mjs`, then `python tools/experiments/audit-native-shore-construction-20261022.py`. Raw per-build times, dimensions, checkpoint records and screenshots are in captures.json and subfolders. Core option is not enabled in this profile; it does not alter map construction.
