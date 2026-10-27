# Packed contact metadata — do not adopt

Four interleaved real-game runs completed with source hashes unchanged, same renderer/720p/medium quality/camera/initial residency, no page or console errors, no invalid GPU query events and no streaming failures. Candidate substitutions were verified in both B runs. Exact topology/height/seam differential tests pass, but correctness alone is not the acceptance criterion.

| Metric | A1 | B1 | A2 | B2 |
|---|---:|---:|---:|---:|
| Presentation interval P95 ms |116.405|49.895|99.840|116.385|
| Presentation interval P99 ms |149.560|66.510|149.650|166.220|
| Main frame synchronous mean ms |14.074|11.402|13.762|21.412|
| World.render GPU mean ms |35.121|22.356|33.943|34.130|
| Largest ground-message getter ms |12.055|7.000|10.735|10.440|
| Completed / demanded chunks in40s |21/30|23/30|21/30|8/30|
| Pending / cancelled at window end |9/0|7/0|9/0|15/7|

First pair:19 of21 common completed keys arrive sooner. Second pair: only8 common completed keys; mean matched latency worsens2019ms, with two keys over11seconds later. Do not present the second pair's negative median delta as a win: many demands never completed within the observation window.

The intended intervention changes worker metadata transport, not draw geometry. Large whole-window GPU and CPU variation cannot be attributed confidently to that intervention from this experiment. A faster getter in one run is insufficient evidence of whole-game improvement, and B2 is materially worse. Keep production unchanged and retain the negative comparison; no identical repeat planned without a stronger causal hypothesis/control. Metadata probe overhead differs slightly by representation (about.4ms vs.02–.06ms on the large message), further limiting attribution of small savings.

GPU queries cover World.render, not physical presentation or every browser GPU operation. Four/five unresolved queries at disposal are reported; the40-second metric window only uses resolved samples matched to measured submissions. No memory or load-time benefit is established. The candidate adds3649 bytes of typed contact metadata in this region while avoiding nested objects; that byte reduction does not override the end-to-end result.

Reproduce with run-packed-contacts-abab.mjs and summarize-packed-contacts-abab.mjs. comparison.json retains per-key latencies, all observations and limits; compressed reports and per-arm provenance preserve raw evidence. Whole-game fluency remains unresolved. PR221 UI changes are independent and have no runtime dependency on this QA candidate.
