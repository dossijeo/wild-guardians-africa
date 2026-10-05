# Intensive campaign baseline, b0d19a5

The frozen detached QA checkout runs all thirty biome/culture combinations with
seed 712 and native paid commands. It preserves workers' complete paths,
watering checkpoints, FIFO harvesting, crate deliveries, raids and saves.
No balances, damage, RNG, task order or growth are overridden. This report is
partial: the 10 archived summaries are finished campaigns, not proof that
the whole thirty-case matrix passes.

| Biome / culture | Nights | Result | Final coins | Maximum live crops | Daylight without actions |
| --- | ---: | --- | ---: | ---: | ---: |
| Savanna / Mapungubwe | 100 | Victory | 1392 | 364 | 54.13% |
| Savanna / Sahelian | 100 | Victory | 865 | 314 | 60.83% |
| Savanna / Swahili | 100 | Victory | 817 | 281 | 59.86% |
| Savanna / Musgum | 100 | Victory | 985 | 288 | 58.85% |
| Savanna / Ethiopian | 100 | Victory | 801 | 288 | 58.36% |
| Grand River / Mapungubwe | 100 | Victory | 2214 | 583 | 53.28% |
| Grand River / Sahelian | 100 | Victory | 865 | 314 | 60.83% |
| Grand River / Swahili | 100 | Victory | 817 | 281 | 59.86% |
| Grand River / Musgum | 100 | Victory | 985 | 288 | 58.85% |
| Grand River / Ethiopian | 100 | Victory | 830 | 288 | 58.09% |

The activity metric already excludes night and incursions. Its denominator is
100 x 300 daylight seconds; numerator includes budget, space and end-of-shift
idle decisions. Budget dominates; none of these 10 runs reaches a space
limit. These are automated decisions, not measured human interaction time.

The policy reserves tomorrow's wages, maintenance and workforce growth, hires
older women at dawn, plants individually as income arrives, uses magic and
repairs, and buys all eight crop species once its mixed-crop threshold is met.
It does not build fortifications. There is no plot-count ceiling; the twelve
crops-per-worker ratio sets its hiring and reserve policy, not a game limit.

Survival is therefore demonstrated for these 10 cases, while the requested
busy-player pace remains unsatisfied. More expensive crops also have poor
realized cash flow: Sahelian cotton delivers only three of 83 planted crops,
and all 38 bananas are destroyed before delivery. The next balance comparison
must distinguish losses, harvest throughput, reserve policy and defensive
decisions. It must retain this baseline and the possibility of losing through
bad management, rather than changing an assertion to hide idle time or defeat.

Each summary includes its exact policy, source hashes, financial reconciliation
and activity breakdown. Full running outputs remain under the frozen checkout
`.cache/qa-post-jam-b0d19a5/test-results/intensive-parallel-100-1791225398073`.
Rendering/UI commits after b0d19a5 cannot change the running source snapshot.

Final snapshots are now archived as reproducible gzip with exact byte checksums in
[states.json](states.json). Every copied finished state agrees with its result,
completed nights, final balance and full cash-flow reconciliation. The remaining
cases are still running; neither their final state nor the full matrix is claimed.
