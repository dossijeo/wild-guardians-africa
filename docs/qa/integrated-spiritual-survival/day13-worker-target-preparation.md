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

Seventy-seven targeted raid/entry/reload tests passed, including post-spawn parity across all six biomes and rejection of stale crop-state hints. Browser script syntax validation passed (169 files, 164 scripts). Long campaigns remain deferred until later motion spikes are assessed in a native pilot and browser, and this branch is not merged into `main`.
