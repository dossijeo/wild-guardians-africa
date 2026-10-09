# Actual Continue: synchronous far preparation GPU draws

Source `78aeda85`, real application menu Continue, `?qa-loading&qa-loading-gpu`, validated temporary dense archive at day 101/time 360 (23,894 historical plants, 36 workers), 1280×720. Context142/DOMseed141. No concurrent agent renderer, heavy local build or local campaign. This is opt-in attribution, not a paired performance comparison.

The existing loading GPU owner now also envelopes the **synchronous zero-viewport upload draw** in native far preparation. Compilation awaits, decoder awaits and fence waits are outside the query. The helper restores target/viewport/scissor, borrowed visibility and ownership as before. If a presentation query is active, a nested diagnostic query is skipped and counted rather than started. No query crosses an await. No isolation or gameplay default was changed by this instrumentation.

| Label | Resolved samples | Median GPU ms | p95 GPU ms | Maximum GPU ms |
| --- | ---: | ---: | ---: | ---: |
| Diorama render | 897 | 5.049 | 10.085 | 11.915 |
| Far upload draw | 33 | 24.874 | 54.138 | 69.337 |
| Cinematic step | 110 | 9.161 | 62.388 | 78.894 |

All 33 far-draw queries resolved. Zero disjoint events, nested skips, dropped samples, foreign conflicts or allocation failures. Four final queries from other labels remained unresolved at owner close and were disposed/accounted; they are not zero samples. The label/query IDs remain joined in the raw report, along with all CPU/RAF/readiness/download data.

Despite the zero color viewport, the most expensive far draw took 69.337 ms GPU and its final renderer.info subpass recorded 174 calls / 3,415,966 triangles. Another took 54.959 ms and recorded 181 calls / 3,477,560 triangles. These counters describe the final subpass under Three autoReset, not every shadow/color subdraw in the elapsed query. They do not identify the precise expensive material/pass, but demonstrate **additional GPU preparation work outside the diorama envelope**. Do not infer that a viewport-zero draw costs nothing or that shader compilation/awaited fences were timed by this query.

Eight preserved RAF intervals exceed100 ms:116.2,116.3,133.1,149.7,149.6,133.1,166.2,116.2. Maximum166.2 ms; first negative capture interval retained. The measurements do not prove that any single query explains an entire RAF gap; profiling may change pacing. Normal dense-farm GPU cost remains separately recorded in the preceding140 comparison, and is not attributed to this feature.

Genuine readiness: progress1/readytrue/pending milestones empty/no loading error.36 queued actors completed, failed/pending0,30 yields,284.5 ms accumulated synchronous CPU,maxjob15.9 ms,queueclosed. Loading-night audio owner stopped at handoff with no loading voices left. Warn/error console entries empty.

Cleanup: Pause → Save and return to menu; native-menu verified before app142close. Temporary slot removal confirmed visibly in141, then seedclose/viewportreset/browserinventoryempty. Original save/archive untouched. Raw progress and audio retained in adjacent JSON files.

**Fluency and final acceptance remain open.** The next candidate must be compared on a frozen source with ownership/lifecycle and visual parity preserved. No asset, quality, simulation or production preparation default changed in this pilot; no PR.
