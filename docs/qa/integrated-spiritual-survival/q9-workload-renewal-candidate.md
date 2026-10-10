# Q9: explicit workload-aware renewal candidate

Q8 renews its previously selected crew as long as any crop or valid task remains.
In the seed-2026 unprotected fourteen-day campaign, that meant paying 17 older
workers (510 coins) for ten remaining crops and protecting a further 510 renewal
reserve. The bot could not replant after those crops were harvested. This policy
can compound native agricultural losses; definitive balance needs a recovery
control that adapts staffing instead of assuming this is unavoidable insolvency.

Q9 is an explicit QA player-policy option. Production code, prices, attack
parameters and native worker productivity are unchanged. Q4–Q8 remain available
and all historical results are preserved.

## Exact candidate

Opening day retains Q8's payable six-worker startup. For later days, compute
the actual `q4Workload` of each operational center, excluding dead plants and
invalid/blocked tasks. Plants and their queued tasks overlap, so use their
maximum, not their sum:

```
workloadStaff = max(1, sum(ceil(max(living, pending) / 6)))
desired = min(previous Q8 desired crew, workloadStaff)
staff = min(previous Q8 payable crew, desired)
```

Six is the already existing backlog heuristic, not a claim that a worker can
produce six crops per day. It is not a cap on buying crops, farm size or midday
workers. The existing ten-second measured-service saturation and physical
delivery/margin gates can add workers during the day through paid native hires.
No artificial planting quota is introduced.

After a real paid renewal, the reserve belongs to the newly hired crew. The
plan recalculates salary, remaining cash, renewal reserve and capital shortfall
consistently. It does not spend or modify state; the runner must execute and
verify `Game.hire` and its ledger entry. It does not provide funds, alter growth,
book projected revenue or infer completed work from reserved tasks.

At the ten-plant/653-coin diagnostic unit checkpoint, Q9 proposes two workers,
cost60, remaining593 and renewal reserve60; historical Q8 still proposes17,
cost510, remaining143 and reserve510. These are arithmetic unit fixtures,
not a claimed surviving campaign or economic projection. Full native pilots
are required to evaluate the candidate.

## Checks and calibration

Focused tests cover paid renewal and reserve updates, historical Q8 behavior,
continued sixty-crop expansion and native additional hires, pending repairs,
world reload, startup, original30/40 wages and explicit source provenance.
The controlled unit fixture uses a declared budget and flat terrain; it does
not stand in for real-world navigation or income evidence.

Run the same seeds, terrain, crop decisions, magic, defense and military
parameters with `--labour-policy q9`. Do not compare incompatible source hashes
as if only damage changed. First validate fourteen-night recovery controls and
review early results; do not proceed immediately to definitive hundred-night
campaigns. Preserve negative outcomes and stop cooperatively if a technical,
policy or balance failure becomes clear. No main merge.
