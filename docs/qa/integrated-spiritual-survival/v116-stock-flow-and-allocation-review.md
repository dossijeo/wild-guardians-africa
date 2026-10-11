# Separate replenishment from physical crop losses

The read-only terminal stock audit reconciles the actual retained inventories:
1,830 crop purchases/placements = 1,708 native pickups + 122 native destructions
+ zero living crops. All 1,708 crates were physically delivered. Verified
cumulative observers, daily census and final crop/crate arrays agree.

Between days 12 and 23 inclusive, the census falls from 247 to 49:
646 purchases minus 827 pickups minus 17 destructions = -198 crops. The dominant
stock contraction in this interval is insufficient replacement of collected
crops, not direct animal destruction. This does not establish why money allocated
to replacement was insufficient, or rule out indirect attack/repair costs.

Daily pickup counts are inferred through stock conservation; their final total
is checked against native `CropPicked` observations and crate inventory. They are
not claimed as individually timed pickup events. The one-purchase difference
between observed purchases and the `daily.planted` sum is the initial seed placed
before that counter's opening baseline; it is not free or missing inventory.
Evidence: `v116-crop-stock-flow-audit.json`.

The separate defense allocation audit verifies all 38 paid wall orders against
their actual ledger debits, protected cash, pending repair quotes and rolling
allocation. New wall purchases did not exceed their declared allocation.
Evidence: `v116-defense-allocation-audit.json`. Repair allocation's previously
identified recovery-floor defect remains a separate issue, now corrected for
future pilots. No cumulative crop losses or repair expenses are applied as a
synthetic balancing formula.

The next useful policy screen is native worker-profile comparison under the same
five introductory nights, world, prices, agricultural magic and strategy. It can
test whether the all-olderFemale choice is economically inferior to available
profiles before changing military intensity. A short profile screen cannot
approve long-horizon economics or isolate each component of a profile's wage,
productivity and shift duration. Any concurrent run times are not isolated
performance evidence.
