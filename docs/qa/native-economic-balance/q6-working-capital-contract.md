# Q6 candidate: payable crew continuity

Isolated branch from `9124b118`; opt-in `--labour-policy q6`. No campaign was launched. Q5, Q4, legacy and their retained negatives are unchanged. This is a player-policy candidate, not accepted economic balance or survival evidence.

Read original root evidence before editing: `C:/Users/PC/source/repos/wild-guardians-africa/docs/qa/native-economic-balance/pilot-pressure-9124b118-q5-no-walls-712-7/report.json`, SHA256 `ad82b09117b219c88d723c4bd67c3c989fde1d82ba64c7b4503b67949645d6ba`. Original7-day D/no-walls/712 Q5 run completed6 nights and ended native defeat on night7. Day1 settled wages155 across1+5 hires, cash238 and renewal reserve180. Day2 began238 but chose crew3 (desired6), paid90; day3 began92, chose1 (desired3), paid30, retained166 crops and delivered16. These observed rows support correcting staffing liquidity; they do not prove how a retained crew would have performed. Originals were not copied, altered or replayed.

## Difference from Q5

Q6 delegates all incremental service,10-second evaluation, ratio and native proportional-hiring gates to frozen Q5. Only the dawn decision differs: desired previous selected crew is retained while crops/tasks remain; staff is `min(desired, floor(real cash / actual profile wage))`. Today's wage must be actually payable. Pending repairs, seeds or a second simultaneous renewal do not reduce a payable existing crew at dawn.

After the native wage settles, the full next-day selected-crew wage remains reserved. `workingCapitalShortfall = max(0, next full wage - current settled cash)` is diagnostic debt of the player budget, never a negative ledger balance, credit line, expected payout or grant. Dawn reports also distinguish `purchaseBudgetShortfall`, which includes pending repairs and one seed; reduced capacity is explicit if today's full crew cannot be paid. Purchases and added employees must retain the complete next wage from cash actually present. Native repair/defense and village spending already use the same labour reserve. No anticipated harvest funds a command.

At238/crew6/wage30: pay180, remaining58, next reserve180, working-capital shortfall122, purchase gap127 for a5-coin seed. Retain six employees and wait for deliveries. At180 the six can still be paid but next reserve has180 shortfall; at179 only five current contracts are payable. Cash29 cannot hire a30 profile. Such risk remains visible; no native GameOver override or economic guarantee is made.

Full and partial reports retain labourHistory/observations; onDecision and daily rows additionally expose current workingCapital under Q6. Provenance includes the separate Q6 module. A/B/D/E use identical Q6 agricultural/labour choices; the existing D/E difference remains Shield only. No production prices, seeds, structures, raids, yields, credited activity durations or save format changed. Default remains legacy.

## Directed validation

18 contracts passed (507.3851ms): Q6 plus preserved Q5/Q4/CLI/D/E tests. Runner syntax and diff checks pass. The Q6 fixture legally buys crops and hires crew6 through native commands, then establishes the explicit retained cash238 boundary for day2. Native wage settlement leaves58 and reserve180, rejects policy purchases and increments, and does not add coins. An explicitly mature, watered crop fixture then runs native harvest/carry/delivery for at most180 one-second ticks; at least12 actual CrateDelivered events replenish funds. Every added coin reconciles to its `deliver:<crate>` ledger payment; RNG is unchanged. Only after those payments can a native5-coin seed settle while leaving180 reserved.

The initial fixture assertion counted old expired workers alongside today's six; the contract now checks contractDay correctly. No gameplay was changed to fix that assertion. Explicit ready-crop state tests liquidity/physical delivery, not growth speed, real first-day throughput or a campaign survival result.

Remaining risks: Q5's heterogeneous service estimate and new-center staffing limitations remain; maintaining crew can still result in unproductive wages, no deliveries, prolonged inactivity or insufficient repair budget. Subsequent root-authorized short pilots must preserve those failures and working-capital traces. This implementation proves the requested funding semantics and native settlements, not25% activity, protection, or100-night balance.
