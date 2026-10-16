# Gran Cañón/123: sustained crop-service-site comparison

The full-roster frozen queue fixture found a real native worker assignment missed when the first crop service-point route was `unknown`. To assess its campaign effect, the unchanged source at `3e6317ba5c736c0836bf2428cdb3effd8b993612` ran the same continuous 14-night request twice, with `strategy=good`, `mode=intent`, seed 123 and Gran Cañón. The only experimental input difference was the WASM binary. Game, raid and runner source hashes match in both raw reports.

| WASM | SHA-256 | Nights completed | Terminal cause | Night-9 crops / coins | Night-10 crop losses | Night-10 center hits | QA issues |
| --- | --- | ---: | --- | ---: | ---: | ---: | ---: |
| Previous | `d757c2197f98fded1cb42b7759154f1bd95a532504da9539c2e8ade17a9f47b6` | 10 | Last center lost on day 11 | 9 / 242 | 9 | 9 | 0 |
| Alternate service sites | `291b8ab66366c4cc066ccad4ea7b4bd85d704f8fa895294d90ae727516be3ce1` | 9 | Last center lost on day 10 | 17 / 301 | 18 | 23 | 0 |

The corrected planner yielded more living crops and coins by the day-9 dawn, then lost one night sooner. In the day-10 raid, the previous run recorded 290 unavailable-target attempts and nine center hits; the corrected run recorded 135 unavailable-target attempts, 23 center hits, and a confirmed ruin of `structure-2`. This is consistent with different agricultural and raid opportunities after the worker-route change. It does not prove that a route became physically invalid or that the navigation change alone caused the defeat. Both terminal results follow the game's real last-center rule, and the raid observer recorded no technical issues.

The run ended at the actual defeats before the requested 14 nights. Elapsed time was 207.08 seconds for the previous run and 192.61 seconds for the corrected run; the different campaign lengths make this **unsuitable as a pure speed comparison**. The frozen route test establishes physical validity of the selected paths, but this single seed does not establish a favorable survival distribution. Keep the change in draft PR #53 while comparing further seeds and auditing the day-10 target-selection divergence. Do not alter damage, economy or enemy composition to make this result pass.

Raw reproducible reports: [previous WASM](old.json.gz) and [alternate-site WASM](alt.json.gz). They include input hashes, parameters, daily state hashes, finances, planning counters, and per-raid evidence.
