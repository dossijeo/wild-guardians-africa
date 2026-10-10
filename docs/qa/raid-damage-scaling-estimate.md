# Farm-value damage scaling: analytical alternative

The user requested evaluating unchanged prior economic values with animal damage increasing as farm value grows, instead of expanding actor counts dramatically. This alternative remains separate from the lower-harvest/cheap-wall candidate. Neither is promoted here.

Inspected main `87471765` and original frozen e040 pilot balance. Reproduce:

```
node tools/estimate-raid-damage-scaling.mjs --self-test
node tools/estimate-raid-damage-scaling.mjs --frozen docs/qa/horde-self-consistent-pilot-e040ea6f-20/frozen-source-files.json.gz --output docs/qa/raid-damage-scaling-estimate.json
```

Six analytical checks pass. The JSON retains the frozen input SHA256, both exact crop-price baselines and per-species/per-material collapse tables. These are mathematical upper bounds, not a new simulated campaign or benchmark.

## Result: viable pressure lever, not actor equivalence

`raids.js` applies one hit to one target. Crops increment `attackHits` and die at2; structures lose the animal's `structure_hit_damage` and collapse at20% HP for walls or21% for centers. Increasing only the existing structural damage field changes no crop damage at all.

Even changing the crop increment hypothetically from1 to10 only makes each crop die in one hit. Ten animals with six committed attacks each can then destroy at most60 plants, versus30 at the current two-hit rule. A hundred animals with six attacks each can destroy at most300 under that rule. Thus ten actors at tenfold damage do not match a hundred actors' crop destruction. Shield contacts, workers, misses, intro limits and travel reduce these upper bounds.

For an intact center (600HP, collapse threshold126):

| Rhino multiplier | Current main damage60 | Prior frozen pilot damage30 |
|---|---:|---:|
|1|8 hits|16 hits|
|2|4 hits|8 hits|
|4|2 hits|4 hits|
|10|1 hit|2 hits|

The prior pilot also had higher crop prices than main. Evaluating its unchanged economy requires its own damage and payout baseline, not mixing main60 with experimental prices and calling that the old setup.

Larger damage can lower actor count for structural HP pressure and reduce simultaneous render/navigation work relative to many more actors. No CPU/GPU saving has been measured here. Structural overkill is lost, and concentrating damage can turn weak walls into one-hit obstacles. It may disproportionately punish a defended farm while doing little extra to unprotected crops: the retained20-night pilot had zero structure hits in both arms. Scaling structural damage alone cannot explain economic defeat in that observed trajectory.

## Candidate design and next evidence

- Define farm value explicitly. Existing `attraction()` sums base harvest value of living plants; it ignores crop progress, cash and defense capital. This is available cheaply, but changing harvest prices changes this signal too. Avoid counting cash by default, which would punish retaining a wage/repair reserve.
- Use a smooth capped curve rather than unbounded proportional growth or abrupt tiers. Freeze the multiplier at raid creation so harvesting or crop destruction does not change committed attack damage midway through an incursion. Preserve existing first-five-night protection. Calibration points and cap remain undecided until the paired model is evaluated.
- Test structural multipliers2/4/10 as separate diagnostics with unchanged economic values. Document single-hit collapses rather than assuming the largest multiplier is acceptable. Do not silently introduce splash damage to claim actor equivalence.
- If pressure must scale beyond the per-target crop ceiling, additional committed attacks per actor would be a separate mechanism. It extends raid duration and can postpone dawn; that cost needs measurement. It is not a free damage multiplier.
- Before long campaigns, establish physical contacts with maintained defenses and neglected crops using the same productive/magic policy. Record paid repairs, actual crop losses, structural collapses, cash/stock and meaningful activity. Then choose between damage scaling, economics or a measured combination.

No production damage, crop-hit count, prices, save state, actor count or RNG was changed.
