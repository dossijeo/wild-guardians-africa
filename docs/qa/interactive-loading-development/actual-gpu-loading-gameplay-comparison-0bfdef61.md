# Loading / ordinary gameplay GPU attribution

Source `0bfdef61`, application flags `qa-loading`, `qa-loading-gpu`, `qa-loading-gpu-gameplay`; real menu Continue of the same validated temporary day-101/time-360 dense archive (23,894 historical plants, 36 workers), 1280×720. Context 140, with DOM-only seed 139. No concurrent agent GPU/heavy local build. This is exploratory attribution, not a paired before/after performance benchmark.

Two query owners are sequential: the loading owner closes before controls; a new owner profiles exactly 120 ordinary `World.render` calls from the existing gameplay RAF and then disposes itself. It does not change simulation, camera, quality, renderer autoReset, shadows or resource ownership. In this observed run the final victory presentation keeps simulation time at 21:29 while normal render continues. No user interaction occurs during the measured post-loading window.

| Envelope | Resolved samples | GPU median ms | GPU p95 ms | GPU maximum ms |
| --- | ---: | ---: | ---: | ---: |
| Diorama | 883 | 4.953 | 10.353 | 12.289 |
| Cinematic | 113 | 6.808 | 60.913 | 77.920 |
| Ordinary gameplay | 116 | 53.375 | 70.384 | 83.427 |

Loading has 1,000 labelled calls / 996 resolved queries; ordinary gameplay has 120 calls / 116 resolved queries. **Each owner retains four unresolved queries at its close; neither converts them to zeros.** Both have zero disjoint events, dropped samples, allocation failures, foreign conflicts or overflows. Last loading invocation starts at 47,393.3 ms; first gameplay invocation starts at 47,641.6 ms. The owners are closed sequentially; no nested or concurrent timer query was introduced.

`lastRender` copies Three renderer.info counters after each invocation without resetting them. With Three autoReset, these describe the **last subpass**, not all subdraws included in the elapsed query. High cinematic samples show roughly 160–170 calls and 3.28–3.34 million triangles in that subpass; ordinary gameplay shows 182 calls / 3,441,962 triangles throughout the observed window. The final camera/world visibility differs from the elevated/tilting reveal, so do not interpret the rows as equal-work ABBA or a causal feature overhead calculation. They do demonstrate a substantial ordinary dense-farm GPU cost alongside the cinematic cost on this machine.

Every recorded RAF interval is retained. Loading maximum 133.2 ms with six >100 ms; gameplay maximum 299.3 ms with five >100 ms. The first loading capture's negative interval remains in the raw file. Query polling and instrumentation can alter pacing; these are not uninstrumented FPS/frametime acceptance results. CPU witnesses nested within presentation calls are not summed twice. Asynchronous far preparation outside the query envelope is not measured by it.

Actual readiness verified: progress 1, ready true, pending milestones empty, no loading error. All 36 queued actor jobs completed, pending/failed zero, 21 yields, 213.9 ms accumulated CPU, 10.3 ms maximum job, owned queue closed. Loading audio night loop started once and stopped at handoff; no loading voices remained. Warn/error console entries were empty.

Raw evidence:
- `actual-continue-gpu-comparison-0bfdef61.json`: all loading RAF, CPU spans, labelled GPU samples, downloads and readiness.
- `actual-gameplay-gpu-comparison-0bfdef61.json`: bounded ordinary-render RAF/query report including unresolved results.
- `actual-continue-gpu-comparison-0bfdef61-audio.json`: loading audio ownership trace.

Cleanup: ordinary Pause → Save and return to menu, verified native-menu state before closing 140; temporary slot removed with visible confirmation in 139; seed closed, viewport reset, browser inventory empty. During cleanup the victory message advanced automatically; one stale 'Continue in this world' locator had no match, fresh AX state was read and Pause used. This happened after both measured reports had closed. The original archive remains untouched.

**Acceptance remains open.** The comparison cannot certify 60 FPS, full loading fluency, total GPU cost outside the envelopes, peak RAM/VRAM, full compatibility or absence of regression. No production asset, quality, camera or simulation change was made. No PR is open.
