# Canyon atomic horizon handoff: first real-game candidate

Opt-in horizonHandoff=atomic, current review, seed 712, media, 1280x720, native longitudinal camera, day/night, simulation active. Original recipe and main remain unchanged.

The baseline native-path capture showed a large rectangular opening at day-6 (30 s), with desired chunk 0,4 missing. Enabling the regional resident mask did not help: Canyon does not use that regional ground, and its native horizon omits the near rectangle geometrically.

Candidate keeps the previous native horizon and its near chunks while requesting the union with the latest destination. Completed worker data is retained until destination chunks are installed and not stale. Incoming groups remain hidden outside the adopted rectangle. No terrain regeneration at handoff; no simulation algorithm changed. The initial horizon is still allowed before all near chunks exist, as in existing loading.

Directly inspected full-resolution day-6: large opening absent. Also inspected day-2 and day-7 while preparation was pending (one and two chunks preparing respectively): walls remain covered. Fine seam discontinuities are visible and require temporal review; do not claim seamless completion. At day-6 candidate has no missing desired chunks, so this frame alone is not a controlled delayed-chunk proof.

Day installed chunk count ranges 25–29, compared with 19–25 in baseline. This is a resource/latency tradeoff, not a performance win. No GPU benchmark claim from recordings. More state telemetry and controlled delay tests are required, along with force rebuild, cancellation, quality changes, memory and shadow validation before adoption. Fixed art and geometry sources remain unchanged.

Fifteen horizon/generator/staged-bed tests pass, including repeated held-worker-result updates without extra generation. These unit tests do not establish whole-game correctness.

First attempt was interrupted by development-page reload while files were corrected (Execution context was destroyed). It is not a measurement; r2 ran with source fixed and completed both phases. The QA option is not enabled in the current review recipe.
