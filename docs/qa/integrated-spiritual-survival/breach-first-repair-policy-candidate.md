# Opt-in native maintenance candidate: breach-first

This changes automated **player decisions only**, on the experimental candidate branch. It is not a production mechanic or approved balance. Select `--repair-policy breach-first` with funded/routed/shore defense. The default remains legacy.

Diagnosis: seed 712's legacy Q9 crew spent 210 of 312 dawn coins while six breached empalizada pieces needed 120 to reconstruct. The controller protected another 210 for tomorrow's identical crew and delayed repair requests. None settled before the next attack. Buying walls is not equivalent to maintaining physical protection.

Candidate decisions:

- Request reconstruction of ruined owned pieces before damaged intact pieces; then prioritize lower health fractions with deterministic ID ties.
- While owned walls are ruined/collapsing, protect the real minimum next-day hiring reserve of 30 for repair requests, rather than the discretionary reserve for an identical full crew. Routine repair funding retains the chosen crew reserve.
- Reserve each pending repair at its exact native quote rounded upward independently. A fractional quote never grants cheaper or free repairs.
- Continue protecting the full selected crew reserve for seed purchases, additional hiring and new wall purchases. No new crop cap, salary rule or money is introduced.

All requests still call native `requestRepair`. Task order, worker navigation, arrival-time funds check, repair/reconstruction price, geometry, shields, RNG, army composition, attack damage, harvest and delivery remain unchanged. A requested repair may still fail or arrive too late. No tasks are reordered or completed directly. Record actual settled debits and restored HP, not request counts, as success.

Functional evidence: 16 focused tests pass. The damaged-wall test is explicitly synthetic: it creates walls with real purchases, then supplies artificial damage/cash solely to isolate the decision. In that fixture the legacy controller requests nothing at 70 cash/210 discretionary reserve; breach-first requests two 20-coin reconstructions and no scratch repair, leaving 30 earmarked. Requests change no HP, RNG or money, survive native snapshot reload, and real native worker ticks then complete both with exactly two 20-coin ledger debits. This is not a successful campaign or benchmark.

Next freeze source and run a 14-night native good/Q9 seed-712 pilot with unchanged military and economic parameters. Compare the historical daily prefix, actual repair timing/payments, night-14 crop losses, worker throughput and dawn solvency. Stop cooperatively on a clear policy/navigation failure; preserve negative evidence. Do not extend to 100/180 nights or merge main on fixture results.
