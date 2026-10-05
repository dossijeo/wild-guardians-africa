# Paid perimeter recording: failure after 17 nights

The original clean `6d5e92e` recording requested twenty nights of intensive
Sabana/Mapungubwe farming with older men, eight living plants per worker,
proportional midday hiring, mixed crops and a paid bramble perimeter from day 10.
It finished in defeat after 17 nights with seven coins. The failed status and
error are preserved; the test has not been changed to pass this result.

It paid 500 coins for 50 wall pieces from a 56-slot rectangular stroke. Six
native skipped pieces remained gaps; no automatic gates were generated. The
strategy requested four wall repairs. It delivered 1057 crates in total, but
delivered none on days 11, 12, 15, 16 and 17. At defeat 175 plants remained alive,
the work centre had full 600 HP, and there were no delivered bananas.

An independent native navigation reconstruction of the terminal snapshot
cannot route a worker from the original village entry `(60,0)` to the centre
service point. Removing walls only in a cloned diagnostic world restores that
route. Converting the nearest wall into a gate in another diagnostic clone is
insufficient. This establishes a geometry/access failure in that snapshot;
it does not reconstruct every earlier day or prove its sole cause.

The financial summary was independently regenerated without changing any
field. Ledger, watering, pickup and delivery audits pass. Full state and
lifecycle observations are archived losslessly with SHA-256 and decompression
checks. The failure is not evidence of acceptable bad-management balance: access
must be investigated before drawing balance conclusions or changing prices.

Evidence: [failed status](crop-lifecycle-paid-defense-17/status.json),
[original report](crop-lifecycle-paid-defense-17/report.json),
[manifest](crop-lifecycle-paid-defense-17/snapshot.json),
[access reconstruction](crop-lifecycle-paid-defense-17/access-diagnostic.json).

Follow-up: automatic-door selection was corrected and the same paid policy
[completed twenty nights on clean `2022bad`](crop-lifecycle-paid-defense-20.md).
This failed recording remains the baseline. Longer campaign and pacing
validation are still pending.
