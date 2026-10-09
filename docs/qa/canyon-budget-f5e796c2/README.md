# Native Canyon routing follow-up and budget attribution

The unmodified responsible strategy on runtime f5e796c2 survives ten nights
in Grand Canyon / Sahelian, seed 712, with real pickup and carrier deliveries,
integer-ledger reconciliation, native incursions and save round trips.
This is **not campaign acceptance**: inactivity is 2326 / 3000 daylight seconds
(77.5333%), above the user's strictly-below-25% gate. Ten nights do not establish
100-night survival or the thirty-combination matrix.

The optional `onDecision` hook exposes frozen scalar observations only. The
budget diagnostic reproduces the **complete serialized final state** of the
previous ten-night run and reconciles all 2127 budget-idle seconds. It does not
change gameplay, navigation, staff selection, reserves, timing or the gate.
Its uncommitted tooling is explicitly recorded in the provenance; runtime
files remain those of f5e796c2.

| Budget-idle attribution | Seconds | Share of all daylight |
| --- | ---: | ---: |
| Additional maintenance reserve | 1731 | 57.70% |
| Next-day wages for the current team | 396 | 13.20% |
| Seed plus minimum hiring reserve unaffordable | 0 | 0% |
| Growing-team, defense or other category | 0 | 0% |

The remaining 199 unoccupied seconds are the strategy's shift-end window.
Maintenance attribution means there was enough cash for the seed and projected
labour reserve, but insufficient for that plus maintenance. This is not proof
that spending the reserve is safe: no counterfactual policy was executed and no
economy parameter was adjusted. Subsequent balancing must preserve responsible
100-night survival, meaningful bad-management loss and the existing activity gate.

## First-day routing comparison

Historical baseline is archived in `../canyon-opening-53a4a996/`.
The current three native openings preserve the same strategy and seed.

| Biome / culture | First delivery, before → now (simulated seconds) | Paid crates, before → now |
| --- | ---: | ---: |
| Grand Canyon / Mapungubwe | 193 → 187 | 26 → 25 |
| Grand Canyon / Sahelian | 234 → 217 | 17 → 21 |
| Savannah / Mapungubwe | 175 → 174 | 36 → 38 |

The Mapungubwe result is mixed: earlier first delivery, one fewer paid crate.
These are domain observations, not GPU or physical-player benchmarks.

## Reproduction and evidence

Run the unchanged case runner before the observer:

```text
node tools/check_intensive_case.mjs gran-canon saheliana 10 ABS_OUTPUT
node tools/diagnose_intensive_budget.mjs gran-canon saheliana 10 ABS_OUTPUT/gran-canon-saheliana-state.json ABS_OBSERVER_OUTPUT
```

The observer requires exact final-state parity and exact attribution coverage;
it fails rather than accepting a changed simulation. Eleven existing policy,
bad-management, accounting and activity-acceptance tests pass. Raw output,
reports, complete state, per-input provenance and source hashes are preserved
with SHA-256 hashes in `receipt.json`. No browser screenshot is claimed.
