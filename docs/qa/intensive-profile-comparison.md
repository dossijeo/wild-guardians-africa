# Intensive comparison of ordinary worker hiring choices

Run `node tools/check_intensive_profiles.mjs 20 OUTPUT_DIRECTORY` to compare the
four approved worker profiles on Sabana/Mapungubwe, seed 712, mixed crops, with
ordinary proportional daytime hiring. The comparisons run sequentially in a
single Node process so all four use the same loaded gameplay modules. The
existing biome/culture campaign tests and their default strategy are unchanged.

Every profile uses the normal seed purchases, FIFO tasks, watering, physical
harvest transport, wages, spells, terrain, damage and random generator. The
existing labour and maintenance reserves remain enabled. No gameplay parameter
is overridden. Changes in worker choice naturally change subsequent decisions
and random-number consumption; this is not an identical-raid causal experiment.

The command preserves source hashes, per-day progress, report, complete state
and economic/crop/activity summary for each profile. It audits actual deliveries
and integer ledger conservation. A failure remains recorded with its snapshot,
sets a nonzero exit status and does not stop the remaining comparisons. An
existing comparison directory is rejected rather than overwritten. Twenty
nights are a diagnosis, not evidence of hundred-night campaign victory.

The one-night command check completed with all four profiles and physical
deliveries; refusal to overwrite that same directory was also verified.

## Recorded twenty-night results

All four cases completed twenty nights on the same loaded `7b3e94d` gameplay
revision, without overrides. Their full reports, progress, provenance, lossless
gzip states and summaries are in `intensive-profile-comparison-20/`. Each was
audited again after completion, with paid staff and real deliveries every day.

| Profile | Final coins | Peak live plants | Delivered | Destroyed | Daylight without actions |
| --- | ---: | ---: | ---: | ---: | ---: |
| Older men | 1238 | 290 | 1946 | 42 | 61.02% |
| Older women | 878 | 288 | 2035 | 34 | 60.20% |
| Young men | 952 | 233 | 1818 | 49 | 64.45% |
| Young women | 1010 | 228 | 2047 | 25 | 60.95% |

All eight species were planted in each case; their actual harvests and losses
must be assessed separately. The older-men case retains more money but its
shorter shifts leave 1,346 daylight seconds without actions near shift end,
compared with 399 for older women. The young-men case spends more on wages and
does not expand faster in this sample. Neither cheaper labour, the male harvest
bonus nor faster young workers independently fixes the roughly sixty-percent
idle fraction. The comparison informs the next pacing/economy investigation;
it does not justify a universally best profile, prove hundred-night viability
for those choices, or replace original failed and ongoing campaign evidence.
