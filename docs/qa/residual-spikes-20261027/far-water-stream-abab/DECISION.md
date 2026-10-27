# Do not promote the water fallback candidate for fluency

Normal streaming A/B/A/B, same Intel UHD host, agricultural fixture, native runtime, 720p and medium quality. Two 144-unit camera sweeps per run, active simulation, no spells and no quality changes. The strict comparison passed: no run errors, console errors or failed requests; matching hardware/fixture/harness/native hashes, distinct stable treatment hashes, usable GPU queries.

| Metric | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Render CPU P99 ms | 20.860 | 21.855 | 20.580 | 21.200 |
| Presentation P99 ms | 50.020 | 50.025 | 50.010 | 50.050 |
| Presentation maximum ms | 83.220 | 99.840 | 99.770 | 99.595 |
| Presentation intervals >50 ms | 73 | 66 | 65 | 75 |
| Continuous render maximum ms | 39.455 | 32.870 | 29.380 | 34.825 |
| Continuous render calls >33.333 ms | 2 | 0 | 0 | 2 |

Full-run metrics include the initial abrupt camera reposition; continuous metrics are supplementary attribution starting at the first sweep, not replacement acceptance metrics. Neither full-run nor continuous results show a repeatable overall advantage. Render CPU is higher in B at P99 in both pairs; the small differences should not be inflated into a precise regression claim. No presentation interval exceeded 100 ms in any run.

The quality-cycle diagnostics separately prove a 14–18 ms local reduction in attachment by skipping unused per-vertex queries. That local saving does not establish the requested full-game benefit, and the quality-cycle settling delay also remains unfavorable. Do not merge solely on the local result. Preserve candidate.patch and the executable protocols; no art reduction or quality change was used.

Raw reports are gzip archived with SHA256 checksums. Comparison and per-run summaries retain all runs.

Pixel gate also failed strict equality: zero-filled attribute matched the candidate's initial image, but the all-one variant changed three channels (maximum delta 8); hiding the far ground changed 61,417 channels, so the view was not vacuous. This does not establish whether the cause is the attribute or inter-render variation. No equivalence claim is made, and no tolerance was added to pass the test. The report is preserved at ../far-water-pixels/raid-ui.json.gz.

Candidate source and its query-rejection test have been restored to HEAD. The original eight native-far-ground tests pass. Reproduction of the rejected candidate requires applying candidate.patch before running either ABAB script. Current production code remains unchanged. Further work should target a larger confirmed contributor rather than extending this micro-optimization indefinitely.
