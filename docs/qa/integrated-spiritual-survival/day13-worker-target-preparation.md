# Prepared animal targets: day 13 native checkpoint

Experimental branch only. The entry worker already ran the same target selector to warm static routes, but discarded its choices. This candidate returns those 16 choices and their approach paths (~24,330 JSON bytes) with a fingerprint of live crops, structures, active shields, relevant workers and navigation epoch. On the first raid update, the main simulation uses a choice only when the fingerprint still matches and the target, shield, reservation and physical approach remain valid. Otherwise it runs the original native selector. Introductory raids retain native selection. The worker never advances the real RNG, applies damage or modifies the real game state.

Replayed `pilot-v128-day13-split-entry/checkpoint-state.json.gz` from time 390 to 470 with 0.1-second native ticks and production-equivalent Node entry transport. Both variants used the same prepared entry. Worker waiting (~2.5 seconds) was excluded from tick times. This is a CPU simulation diagnostic, not a rendered browser frame or a 100-night campaign.

| Replay | Peak native tick to 455 s | Peak native tick to 470 s | Final state at 470 s |
| --- | ---: | ---: | --- |
| Worker target choices disabled, continuous | 1,423 ms | 1,364 ms | SHA `e1ead0477803090b2f05…` |
| Worker target choices enabled, continuous | 61 ms | 163 ms | Same SHA |
| Worker target choices disabled, immediate save/reload after spawn | 1,441 ms in the short replay | 1,384 ms | SHA `5b7033031de0607fb3a8…` |
| Worker target choices enabled, immediate save/reload after spawn | 262 ms in the short replay | 247 ms | Same SHA |

At 470 seconds the continuous variants both recorded 26 physical structure hits, 26 logical hits, two route-unavailable events and seven animal retirements. The reload variants both recorded 26 structure hits and one route-unavailable event. In each pair the full serialized state matched, not merely event totals. Prepared target selection itself took under one millisecond for all 16 animals; later spikes came from route/motion queries after the animals began moving, particularly following a reload that clears navigation caches. The one-checkpoint result is promising but does not establish visual frame smoothness or cross-biome campaign performance.

Seventy-seven targeted raid/entry/reload tests passed, including post-spawn parity across all six biomes and rejection of stale crop-state hints. Browser script syntax validation passed (169 files, 164 scripts).

The subsequent frozen-policy 14-night native pilot (`pilot-v129-worker-target-hints`, seed 123, good/Q15/cashflow/shore defenses) completed all 14 nights, with 157 living crops and 640 coins at the horizon. Its day-13 timing file exposes another bottleneck: among 416 instrumented native ticks, the maximum was 1,293 ms, the 95th percentile ~201 ms, and the 99th percentile ~825 ms. The largest ticks were in daylight around times 98–188 with 25 workers and 1,067 historical plant records; the action-decision code took roughly 0–2 ms on those ticks. A night tick at time 495 reached ~893 ms. This cannot be attributed to the newly prepared initial target choices without further phase profiling. The 100-night campaign remains deferred because these live-pilot costs are still excessive. The next bounded diagnostic should capture a daytime checkpoint near time 130 and attribute worker/navigation work before changing any balance parameter. No code from this branch has been merged into `main`.
