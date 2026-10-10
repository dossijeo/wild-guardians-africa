# Initial hiring: read-only self-consistency proposal

No simulation, commands, runtime edits or policy replacement were performed. The parameter-only ratio6 runner is frozen at10047175 and must not be launched without further review. Its twelve-worker opening reserve lock is preserved, not hidden by this proposal. The parent’s separate navigation-cache repair experiment is outside this source and analysis.

## Definition and source

The native opening places the compulsory first mijo before hiring. With initial1500, centre800 and seed5, current money M=695, existing live plants L=1, olderFemale wage W=30. The original maintenance rule is max(100, native repairCost of operational centres); the newly intact centre needs no repair, hence R=100 here. Actual selectedCrop is mijo before day10, even when mixed=true; its native plant_cost C=5 and base_harvest_value33. These inputs are read from the unchanged source88ebf647 rules and tools/horde-defense-farm.mjs, not arbitrary estimates or credited future sales. Defence saving starts day10, so D=0 at this opening.

For each legal integer crew n>=1, subtract both today’s actual payment nW and tomorrow’s full wage reserve nW before forecasting seeds:

    seedBudget(n) = M - nW - nW - R - D
    newSeeds(n) = max(0, floor(seedBudget(n) / C))
    capacityProxy(n) = n * plantsPerWorker

Choose the smallest n for which today’s hiring is affordable, seedBudget>=C (at least one genuinely purchasable seed), and L+newSeeds(n)<=capacityProxy(n). This is a staffing proxy, not measured throughput. Its benefit over merely capping hiring at9 is selecting the minimum sufficient crew7 while retaining more real reinvestment cash. It does not guarantee that all forecast plants can be placed/reached or watered/delivered before night. No expected harvest money or free workers enter the calculation.

All sums are integer coins. For a later proposal with different selectedCrop, use its actual price instead of5; recompute with actual damaged-centre repair reserve and defence saving. Current wages and actual costs must be recorded separately. Mixed planting can change the next price after each placement, so this first-selection forecast is not a promise to afford a complete mixed batch. At days after opening the existing living-only hiring target is a distinct policy; this initial-only proposal does not silently change it or middayHiring=false.

## Exact opening table

Negative seedBudget is a reserve deficit, not an available balance; newSeeds is zero in that case. Capacity is the ratio6 proxy. Feasible requires both one seed and sufficient proxy capacity.

| Crew | Pay today | Balance after hire | Tomorrow reserve | Maintenance | Seed budget | Purchasable seeds | Existing + seeds | Capacity | Feasible |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 30 | 665 | 30 | 100 | 535 | 107 | 108 | 6 | No |
| 2 | 60 | 635 | 60 | 100 | 475 | 95 | 96 | 12 | No |
| 3 | 90 | 605 | 90 | 100 | 415 | 83 | 84 | 18 | No |
| 4 | 120 | 575 | 120 | 100 | 355 | 71 | 72 | 24 | No |
| 5 | 150 | 545 | 150 | 100 | 295 | 59 | 60 | 30 | No |
| 6 | 180 | 515 | 180 | 100 | 235 | 47 | 48 | 36 | No |
| 7 | 210 | 485 | 210 | 100 | 175 | 35 | 36 | 42 | Yes |
| 8 | 240 | 455 | 240 | 100 | 115 | 23 | 24 | 48 | Yes |
| 9 | 270 | 425 | 270 | 100 | 55 | 11 | 12 | 54 | Yes |
| 10 | 300 | 395 | 300 | 100 | -5 | 0 | 1 | 60 | No |
| 11 | 330 | 365 | 330 | 100 | -65 | 0 | 1 | 66 | No |
| 12 | 360 | 335 | 360 | 100 | -125 | 0 | 1 | 72 | No |

The native ratio12 formula hires6, pays180, retains515 and can forecast47 further mijo plus the existing one within72 proxy slots. The unmodified ratio6 formula hires12, pays360, retains335 and cannot meet465 wages+maintenance+one-seed threshold. Even the first native33 delivery would leave368, still insufficient. This read-only proposal hires7, pays210, retains485 and preserves210 tomorrow+100 maintenance, leaving175 for35 seeds;36 plants fit42 slots. For a uniform seed batch that remains within those42 slots, the native growth labour reserve does not exceed the explicit next-day210 reserve.

## Review requirements before any implementation or run

This would be a new, explicitly named player staffing strategy, identically applied to responsible and neglect arms. It changes neither centre800, wage30/40, native economy nor original ratio12/ratio6 historical evidence. Original behaviours and negative gates remain archived. No claim of better campaign activity is possible from arithmetic alone.

If no crew satisfies both requirements, return an explicit infeasible diagnostic; do not inject money, reduce maintenance or force hiring/planting. A reviewed policy still needs a legal fallback for scarce cash, minimum mandatory hiring, living crops exceeding affordable capacity, rounding and native selectedCrop changes. Such a fallback is not implemented here. Testing must cover exact one-seed and wage boundaries, damaged-centre reserve, crop-price sensitivity and identical both-arm rule. Native purchase, FIFO, repair arrival/debit, next-day wages, physical crates, activity and risk must be measured in later authorised runs. The isolated day21 result with212 hired and174 paid repair demonstrates service capacity in that snapshot only; it cannot validate this seven-worker opening or a100-night policy.

This table was generated by finite integer arithmetic (twelve rows); no world generation, GPU, campaign producer, paths, RNG or clock ran. Await parent review before changing the prepared runner or launching any campaign.
