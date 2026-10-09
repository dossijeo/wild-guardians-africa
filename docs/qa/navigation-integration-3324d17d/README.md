# Navigation integration — 9 October 2026

Root pulled main `3324d17dd2305ea8595aea311c518cc6db2404ad` after reviewing and merging PRs 9 and 10. Both PRs passed Validate Game and Windows before merge. This revision includes the exact animal-landing guard from `381bd602`, the bounded fractional exit search and the authored building-corner shortcut.

The five directed test files passed together: **38 tests, zero failures**, 16.360 s. They include native Desert/Suajili night 9, the recorded Saheliana night 25 and night 28 exits at dt 0.1 and 1, frontier save/reload and malformed-frontier rejection, rotated building footprints, dynamic route clearance and fluid/solid restrictions. The exact output is retained compressed with a SHA-256 receipt. This is integration evidence, not a 100-night replay or a frame-time benchmark.

Validate Game run **37875008779** passed on the same full revision: **3315/3315 tests**, build **6.50 s**, and the web package verifier (702 files, 859 relative links, 20 runtime GLBs). Full log and job metadata are retained, including the ordinary bundle-size advisory. The previous merge's superseded CI cancellation is not reported as a game failure.

The original already-invalid Suajili night-9 save still requires its separate, physically constrained recovery candidate. Preventing new invalid landings does not prove recovery of old snapshots.

## Frozen campaign expansion

`dispatch.json` records seventeen new 100-night dispatches, each verified against this exact revision. Musgum and Ethiopian cultures cover all six biomes. The five additional cases repeat Canyon/Mapungubwe, Canyon/Saheliana and Desert/Mapungubwe, Desert/Saheliana, Desert/Suajili after the integrated navigation corrections. The policy, seed and responsible reinvestment strategy are unchanged.

These records prove dispatch and source identity only. They do not prove completion, victory, activity below 25%, rendering or physical-mobile acceptance. Earlier successes and failures remain intact; the still-running historical Canyon/Suajili job was not replaced or cancelled.
