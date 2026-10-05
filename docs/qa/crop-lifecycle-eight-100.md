# Intensive mixed farming: eight plants per paid worker, 100 nights

The original recording loaded clean `80f64ff`, Sabana/Mapungubwe, seed 712,
older men, proportional midday hiring, mixed crops, shields and ordinary repairs.
It retains the original planting policy and has no money, growth, damage or task
overrides. It is an undefended campaign; it does not validate wall access.

The campaign reached victory after 100 nights with 633083 coins, a peak of 634
living plants, 20443 paid sprouts and 19436 physically delivered crates. All
eight species were delivered, including 2214 cotton and 1803 banana harvests.
There were 461 destroyed crops, including 403 bananas. All 112 incursions ended.
The centre survived at its full 600 HP.

The independently regenerated summary matches the recorded summary; its older
schema only lacks the later nullable `defense` field. Native audits reconcile
integer ledger entries, seed spending, mandatory waterings, unique physical
pickups and delivered income. The saved state survives a byte-identical
serialization round trip. Both full state and 163 MB lifecycle trace are
archived losslessly with SHA-256 and streamed decompression checks.

Recorded policy inactivity occupies 28.35% of daylight, down from 55.10% in this
policy's first twenty nights. The longest interval is still 168 simulated
seconds; the 90th percentile of daily maximum intervals is 45 seconds. These are
strategy-command intervals, not measured human boredom. Final wealth is large;
victory alone does not prove adequate late-game economic pressure or pacing.

Evidence is in [the original report](crop-lifecycle-eight-100/report.json),
[summary](crop-lifecycle-eight-100/summary.json) and
[snapshot manifest](crop-lifecycle-eight-100/snapshot.json).

Reproduce archival checks without rerunning the campaign:

```powershell
node tools/archive_crop_lifecycle.mjs test-results/crop-lifecycle-80f64ff-eight-100 NEW_OUTPUT_DIRECTORY
```

This records one historical domain campaign, not a current-head 30-combination
matrix, rendered campaign, physical mobile test or complete master-plan pass.
