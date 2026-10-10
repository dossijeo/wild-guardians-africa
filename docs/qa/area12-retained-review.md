# Independent retained area-impact review

The frozen experimental area12 pilot is running outside main. Its original sources and reports must remain unchanged during execution. Root review found two diagnostic risks in that source: `operational` is a centre-only predicate but was used to count owned walls, and the opening summary checks raw activity rather than the separate paid-completion activity metric.

`node tools/review-area12-report.mjs CASE_DIRECTORY` reads the original `native-report.json.gz` and `native-state.json.gz` without mutating them or launching another simulation. It counts only owned walls, reports each real wall status, retains raw inactivity separately, and checks the meaningful inactivity threshold strictly below 25%. Missing meaningful evidence remains unknown. Disagreements with original counters are warnings, not silently rewritten original evidence.

Three isolated diagnostic contracts passed on 2026-10-10 (`node --test tests/area12-retained-review.test.js`, 123.0224 ms). They cover mixed intact/ruined/collapsing walls, unrelated structures, immutability, missing activity evidence and the accepted threshold. These are synthetic report fixtures, not native campaign or gameplay acceptance.

No gameplay parameters, save format, assets or production raid behavior change. Structure contact counts alone do not establish defensive effectiveness; useful wall activity still needs actual interception evidence. The six-night pilot cannot prove survival or defeat over 100 nights.
