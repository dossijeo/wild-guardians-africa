# Paid staffing and expensive-crop throughput

Both recorded Sabana/Mapungubwe campaigns run twenty nights with older men, mixed crops, ordinary proportional midday hiring, labour and repair reserves, native terrain, FIFO tasks, shields and repairs. They use no money, growth, speed, damage or task overrides. The second player policy hires one worker per eight living plants instead of twelve. The original benchmark is retained.

The twelve-plant run is archived in `crop-lifecycle-20/`, with its byte-identical full state referenced in the original profile comparison. The eight-plant run loaded clean `80f64ff`; its full provenance, report, financial summary, lossless state and trace, and SHA-256 manifests are in `crop-lifecycle-eight-20/`. Both were independently audited for integer ledger conservation, mandatory watering, physical pickup and settled deliveries. Every observed expensive crop reconciles with its final plant and crate outcome.

| Observation | Twelve plants per worker | Eight plants per worker |
| --- | ---: | ---: |
| Final coins | 1238 | 1944 |
| Peak living plants | 290 | 294 |
| Harvest income | 30241 | 51935 |
| Seed spending | 18536 | 38107 |
| Wage spending | 10613 | 12189 |
| Repair spending | 554 | 395 |
| Cotton physically delivered | 12 | 46 |
| Banana physically delivered | 0 | 14 |
| Cotton median daylight to first watering | 147.5 s | 73 s |
| Banana median daylight to first watering | 147 s | 69.5 s |
| Daylight without player-policy actions | 61.02% | 55.10% |
| Longest continuous interval without actions | 127 s | 168 s |

The first-watering comparison excludes nighttime and only includes plants actually observed receiving initial watering. The trace brackets changes between ticks; durations have sampling uncertainty. Missing waterings are counted explicitly in `first-watering-comparison.json`. The maximum observed daylight wait in the eight-plant case is still 304 seconds, so median improvement does not eliminate every long backlog.

All eight crop species were physically delivered in the eight-plant case. It still lost 33 bananas and 16 cotton plants. Banana income was 6624 coins against 13500 spent on its seeds, including 6450 tied up in 43 still-living plants. This is not evidence of final banana profitability, especially after allocating wages. More staffing also changes future planting decisions and RNG consumption, so these runs are not an identical-raid causal experiment.

The improvement does not yet meet the requested pacing goal: more than half the daylight still has no strategy action, and the worst idle interval increases. Both strategies use no walls. Defended strategies and the full hundred-night higher-staffing campaign remain to be verified; the latter was started from scratch with source provenance. No gameplay balance parameter has been changed on the strength of a twenty-night result.

Eight combined native farming/lifecycle tests pass, including bad-management defeat, paid part-day hiring, physical delivery, observer non-mutation and the original default strategy's complete-state golden hash. These checks do not substitute for the ongoing long campaigns, visual/mobile testing or full-plan acceptance.
