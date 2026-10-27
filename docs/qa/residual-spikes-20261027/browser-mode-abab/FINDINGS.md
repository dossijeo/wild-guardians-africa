# Browser mode does not explain the variability by itself

Same integrated renderer in all four runs, no heavy trace, Intel UHD, canvas and viewport 1280x720, matching source hashes/camera/initial chunks. Visibility sampled as visible before recording. The initial strict comparison rejected DPR 1 vs 1.0000000149011612; numerical tolerance <1e-6 now handles representation noise, while canvas dimensions remain exact and raw values are retained. This is not a relaxed image/performance gate.

| P95 ms | Headless A1 | Visible B1 | Headless A2 | Visible B2 |
|---|---:|---:|---:|---:|
| Render CPU | 16.01 | 22.60 | 21.14 | 21.98 |
| GPU query | 30.58 | 52.95 | 61.32 | 52.02 |
| RAF interval | 49.93 | 99.65 | 99.89 | 99.65 |
| Intervals >100 ms count | 0 | 20 | 36 | 23 |

Headless itself varies strongly. The first pair alone would incorrectly suggest a simple browser-mode effect; the second contradicts that explanation. Do not claim thermal throttling, a driver fault, or an implementation regression without supporting observations. Active simulation and temporal residency remain variable; visibility is not continuous occlusion evidence. No page/console errors.

Next isolate repeatable rendering workload from simulation/streaming variability, measure browser-process and hardware load where available, and compare against the same immutable production reference. Avoid inferring progress from the unusually fast first run. Integrated water remains experimental; no main promotion based on this diagnostic.
