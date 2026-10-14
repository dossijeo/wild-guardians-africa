# Phase-2 short policy screen, gene schema v2

This is a seven-night **technical/productivity screen**, not a survival estimate for the 100-night campaign. It uses unchanged game balance. The three initial legal genomes are the historical default with the new explicit `wallPolicy:'planned'`, the same policy with `wallPolicy:'none'`, and a planned-wall policy that gives half its agricultural spell choices to Crecimiento. The `none` arm still uses Escudo; the matched diagnostic measures no-wall/no-Shield separately. No fitness penalty is imposed for omitting walls. If a no-wall policy dominates robustly, report it as a design/balance signal rather than approving a defense-free strategy by fiat.

Training: Sabana/411 and Gran Río/626. Untouched biome/seed reserve: Desierto/431. Volcanes/907 is excluded here after the separate no-wall diagnostic hit a technical raid-entry failure. All baselines remain labeled, especially the legacy `no-walls` profile, whose agricultural calendar and cash policy differ from the new genes. The matched controls provide the causal wall/Shield comparison.

The first screen used a 180 s daily `Game.tick` ceiling and was stopped at batch level after repeated 113–140 s days. This version limits each candidate to 60 s/day and 8 minutes wall time, marking a limit hit `computational-cost-stop` rather than defeat. Technical engine errors remain separate. Only native terminal defeat or completed horizon determines a campaign outcome. Candidate selection will consider sustained production and later 14/30-night recovery evidence; seven-night cash alone cannot establish competence.

The no-wall design check uses paired runs with the **same genome, source revision, seed, biome and agricultural spells**. Compare walls+Shield, no-walls+Shield and no-walls/no-Shield on native survival, delivered harvest, final and daily cash after actual wages/repairs, crop and structural losses, and paid defensive expenditure. Record physical enclosure/breach status when the Wild Engine observer can certify it; `unknown` is never counted as protected. A no-wall policy is described as dominant only if it is no worse on survival and solvency and clearly better on productive returns across independent seeds and biomes, allowing uncertainty and technical censoring to remain visible. There is no fitness penalty for skipping walls. Consistent no-wall dominance would signal a defense-design imbalance, **not** a player-policy success to approve. A single 7- or 14-night run cannot establish that conclusion.

Historical v1 genome IDs and their SHA-stamped reports retain their original meaning. The v2 schema adds a discrete wall policy and has separate implementation IDs and source hashes; reports from different schema versions are not pooled as one cohort.

## Completed seven-night screen (smoke evidence only)

The run completed without a computational cost stop or technical error: source `7a3df5c490b8b0b5eb2274f4bd53890aac3ec4b5`, implementation `097dade8faa6`, run `955308005048`, clean worktree diff hash `e3b0c442...`. All 16 native reports are preserved as verified gzip archives with original and archive SHA-256 in `results/archive-index.json`; daily progress, search ranking, result and exact config remain readable. All reported arms reached seven nights. The first five nights are introductory, leaving only nights six and seven under the later attack pressure. These data are **not** a selection of the best strategy.

| Genome / control | Scenario | Delivered crates | Destroyed crops | Final live crops | Final cash |
| --- | --- | ---: | ---: | ---: | ---: |
| Default, planned walls (`4419e5...`) | Sabana/411 training | 640 | 2 | 118 | 1,133 |
| Default, planned walls (`4419e5...`) | Gran Río/626 training | 628 | 0 | 115 | 1,166 |
| Same default genes, no walls (`91b0fe...`) | Sabana/411 training | 686 | 58 | 94 | 1,409 |
| Same default genes, no walls (`91b0fe...`) | Gran Río/626 training | 688 | 54 | 98 | 1,385 |
| Pilot score leader, no walls (`193701...`) | Sabana/411 training | 707 | 50 | 91 | 1,555 |
| Pilot score leader, no walls (`193701...`) | Gran Río/626 training | 690 | 51 | 103 | 1,368 |
| Pilot score leader, no walls (`193701...`) | Desierto/431 reserved biome | 489 | 53 | 80 | 721 |
| `good-current-magic` | Desierto/431 reserved biome | 461 | 2 | 93 | 568 |

The original seven-night score ranked the no-wall pilot leader first (minimum training score 7,149.9; reserved-biome score 7,100.5 versus 7,097.95 for `good-current-magic`). It favored early deliveries and cash while the pilot lost 53 crops in Desierto, including 47 on nights six and seven, versus two for the control. The control differs in more than walls, so this holdout comparison is descriptive; only the paired default-genome rows isolate `wallPolicy`. No-wall early returns may be real, but this screen does not establish resilience, recovery or dominance. The old `no-walls` baseline remains a separate legacy policy.

For the next version, seven nights remain a technical and early solvency gate. The *primary* fitness horizon must reach at least 14–21 nights and measure post-introduction crop loss, sustained deliveries, wages/seed coverage, repair burden and recovery after a breach; finalists then need 30 nights and independent seeds/biomes before longer trials. A terminally tiny farm with negligible deliveries must be reported as survival with collapsed production, not a competitive player. The active-farm diagnostic will be calibrated from native baseline delivery and ledger trajectories and versioned separately, without adding a penalty specifically for skipping walls or changing the completed scores above.
