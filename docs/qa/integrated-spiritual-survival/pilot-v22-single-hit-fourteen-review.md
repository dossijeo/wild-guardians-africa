# Fourteen-day one-point native comparison

Frozen source 452c5f03; same simulation as cd377ab0 (the intervening commit archived evidence only). Seed 712, Sabana/Mapungubwe, q8 labor, cashflow crops, shore defenses from day 6, zarzas, fluid clearance 1.5. Crop HP is one. Prices, pressure candidate v3 and manual-magic budgets remain unchanged.

| Strategy | Terminal outcome | Completed nights | Cash | Living plants | Cumulative crop losses | Income | Wages | Seeds | Walls | Repairs |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Good, walls and Shield | Observed horizon | 14 | 570 | 186 | 101 | 13,471 | 5,138 | 6,990 | 740 | 733 |
| No walls, no Shield | Native defeat during night 14 | 13 | 711 | 0 | 488 | 13,742 | 5,662 | 8,069 | 0 | 0 |

Both reports include fourteen daily rows. The control's final row describes its terminal loss, **not** a fourteenth survived night. Its saved center is ruined at zero HP; the native event sequence ends with StructureRuined, RaidEnded and GameOver. It still has cash: this is destruction of the last center, not insolvency or a harness timeout. All 28 crops exposed in that final raid were destroyed; nineteen native structural contacts removed 475 HP, triggering the ordinary center collapse threshold and subsequent destruction. No synthetic losses were applied.

The defended case recorded 338 wall hits, 63 shield contacts and no center hits. Its 733 repair expenditure consists of actual native paid repairs; wall purchases cost 740. All strike budgets were observed and consumed. The defeated control retained two buffalo strikes because no reachable living target remained after the farm and center were destroyed; that documented normal retirement is distinct from group-wide reservation starvation.

Ledger reconciliation is exact for every day; raid observers report verified coverage with none lost. Native saved states, daily transactions and full source hashes accompany both results.

## Comparison with historical two-point resistance

| Through day 14 | Old two-point crop losses | New one-point crop losses | Old cash/live | New cash/live |
|---|---:|---:|---|---|
| Good management | 89 | 101 | 555 / 173 | 570 / 186 |
| No walls, no Shield | 353 | 488 | 951 / 209 | 711 / 0, defeat |

Across days 8–14, unprotected net cash changed from +202 to −212, with delivered income changing from 10,656 to 8,037. Protected net cash changed from −29 to −14. These are historical campaign comparisons, not identical subsequent impacts: real production, target populations and persistent RNG draw counts diverge after crop losses. A provenance audit confirms only crop-resistance implementation/save support and campaign metadata/material-selection tooling differ; all other recorded runtime hashes match. The material default is still zarzas. There was no concurrent adjustment of prices or military pressure.

Total destroyed crops divided by summed per-raid starting exposure is 4.58% protected versus 22.61% unprotected. This is an exposure-weighted descriptive statistic over this particular campaign, including introductions, not a guaranteed nightly reduction or a matched-layout estimate of walls alone. Individual unprotected raid losses grow from 12.1% on night 6 to 58.4% on night 13 and 100% on the terminal night.

## Remaining acceptance

This is promising short evidence, not final balance approval. A productive no-wall strategy **with Shield** still needs testing to separate wall protection from magic. Additional preselected seeds 123 and 2026, longer coherent pilots, other strategies and Gran Cañón coverage remain necessary before 100/180-day acceptance. The q8 policy renews previously hired crews while work remains; record its labor decisions rather than attributing every financial difference to resistance alone. Do not compensate policy/navigation bugs by modifying damage or prices.

Manual inactivity is not measured: bot decision-window idle proxies remain 67.6% and 62.2%. No under-25% human-action acceptance, mobile/GPU approval or main merge is claimed.
