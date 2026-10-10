# Passive empalizada control: native dawn defeat and renewal-policy defect

Seed712 completes nine nights and suffers native economic defeat at the following
dawn. The final snapshot is day10/time0, completedNights9, result=defeat, no raid,
37 living crops, three coins and an intact 600 HP center. All 149 strikes were
consumed; the last raid records no crop destruction and no center hits. This is
not a transport failure, timeout, missing observer window or center destruction.

Exact accounting: 700 after the paid initial center +3,804 physical delivery
income −1,433 wages −1,998 seeds −1,000 wall purchases −70 repairs =3 coins.
Census reconciliation passes. Total agricultural losses are 15 plants. The paid
empalizada contour finishes normally; its physical protection does not solve the
working-capital and labor decisions below.

| Day | End cash | Live plants | Purchases | Deliveries | Losses | Wages | Walls | Repairs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 6 | 287 | 59 | 0 | 75 | 15 | 210 | 540 | 0 |
| 7 | 332 | 0 | 11 | 70 | 0 | 210 | 460 | 0 |
| 8 | 33 | 37 | 37 | 0 | 0 | 30 | 0 | 70 |
| 9 | 3 | 37 | 0 | 0 | 0 | 30 | 0 | 0 |

At day8 renewal, the native workload is empty (pending0/living0), and the QA
policy chooses one worker with desired1/priorDesired1/workloadStaff1, paying30
from332. Its risk flag is false because current cash covers that tiny contract.
During the day it buys37 new crops and pays70 in actual repairs. No deliveries
settle on either day8 or day9. These are real growing/queued crops, not ready
income. The last snapshot retains32 native tasks and no hired workers after
the terminal dawn check; three coins cannot fund the minimum30-coin contract.

The policy anticipates neither the intended replanting workload after an empty
harvest nor its throughput and liquidity requirements. This needs investigation
before attributing the defeat to inadequate magic potency or excessive animal
damage. The defeat itself is native and retained; whether better ordinary labor
and planting decisions recover the situation must be measured, not presumed.
Do not change crop prices, salaries, damage or grant money to rescue this case.

The terminal auditor initially rejected the campaign because it assumed every
defeat occurs during an incomplete night. This defeat occurs after RaidEnded,
at the next dawn, so nine daily rows correspond to nine completed nights. The
auditor now recognizes this phase only with a compressed snapshot proving the
matching result, completed-night count, next-day time0, no live raid, exact cash
and GameOver after RaidEnded. Five parser tests pass, including negative cases
for missing snapshot, live raid, wrong time/cash and reversed event ordering.
This is an audit correction, not an altered game outcome or extra simulated day.

Evidence: original six campaign files, `pilot-v41-dawn-terminal-audit.json` and
`pilot-v41-census.json`. Rules include the grid-exit bridge. Earlier pre-bridge
passive results remain separate historical evidence; the still-running matching
zarzas control shares this campaign's frozen source hashes. No imported runtime
or player-policy module changes were made for this diagnosis.
