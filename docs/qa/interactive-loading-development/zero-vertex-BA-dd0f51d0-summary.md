# Zero-vertex native reverse pair - dd0f51d0

Two fresh temporary archive copies were continued through the production menu, B then A, at 1280×720. Loading, the first positive world draw, and 120 ordinary gameplay frames used the same optional timer owners as the retained A/B. No resource-binding probes or concurrent local heavy CPU/GPU work. Runtime predates the subsequent main Desert fixes; no simulation equivalence with latest main is claimed. Both runs exited through Save and return, temporary slots were removed, tabs closed, viewport reset, and the browser inventory was empty. Console warnings/errors were empty.

| GPU milliseconds | A control | B zero vertices |
| --- | ---: | ---: |
| Far preparation p95 / maximum | 5.653 / 41.915 | 0.529 / 4.006 |
| Cinematic p95 / maximum | 56.485 / 71.934 | 57.050 / 70.254 |
| First identified positive world draw | 54.691 | 53.499 |
| First ordinary gameplay draw | 56.431 | 66.601 |
| Ordinary gameplay median / p95 | 52.606 / 63.535 | 52.535 / 64.633 |

Both positive world draws reported 47 calls and 2,676,866 triangles. Every B preparation draw reported zero triangles; the control reached 2,876,324. Preparation queries cover synchronous submitted draw work only, excluding asynchronous shader/decode/fence waits. Last-render metadata describes the final subpass, not the total query envelope.

Loading RAF p95/max was A 33.4/133 ms with three intervals over 100 ms, versus B 49.5/133 ms with five. The initial negative boundary interval remains in raw data. Ordinary gameplay RAF maxima were 282.6/315.9 ms, respectively. These results do not establish global smoothness or net loading improvement. Four final queries were unresolved at each owner disposal; disjoint, discarded, foreign and nested counts were zero. All 36 actors completed, with no pending or failed requests.

Across the retained A/B and this B/A, zero vertices consistently removed submitted preparation triangles and lowered that GPU envelope. Cinematic/frame pacing did not consistently improve. First positive appearance showed no extreme new deferred GPU spike in these observations, but this is not a general pipeline-warmth guarantee. The option remains disabled by default. Separate resources, visual readbacks and cancellation/context-loss/repeated lifecycle coverage remain required before adoption.

Raw reports and the computed JSON summary retain all samples and negative evidence; percentile calculation uses the nearest rank without excluding outliers.

## Retained four-arm comparison

| Arm | Far GPU p95 / max ms | Cinematic GPU p95 ms | Loading RAF p95 / max / over100 |
| --- | ---: | ---: | ---: |
| A1 | 8.999 / 48.089 | 58.422 | 33.4 / 133.1 / 4 |
| B1 | 0.500 / 0.513 | 69.666 | 33.4 / 166.4 / 3 |
| B2 | 0.529 / 4.006 | 57.050 | 49.5 / 133.0 / 5 |
| A2 | 5.653 / 41.915 | 56.485 | 33.4 / 133.0 / 3 |

The four sequential arms retain the same source and archive with the intended flag change. This supports the targeted preparation-envelope observation; differing actor CPU totals, preparation sample counts, and uncontrolled driver/cache state prevent extrapolation to total-loading or smoothness gains. In particular, B1 has equal loading RAF p95 and a higher maximum than A1; B2 has worse p95 than A2.
