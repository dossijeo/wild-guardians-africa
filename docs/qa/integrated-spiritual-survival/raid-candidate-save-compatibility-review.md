# Raid candidate save compatibility review

The current canonical candidate is version 1 with qMeanMultiplier = 1. The proposed 1.5 multiplier remains a counterfactual study; no runtime change is accepted by this review. Runtime source is frozen while the protected v11 campaign remains active.

## Compatibility finding

`preparePressureNight` reuses an already committed pressureVersion=1 plan on the same day, preserving its actors, RNG and EMA. However, `validatePressureSnapshot` independently recomputes that plan's expected budget through `planRaidProductComposition` using the current default candidate. Changing the canonical multiplier alone would therefore reject saved version-1 plans whose historical budget differs. Raising pressureVersion alone would instead cause a committed night to be regenerated and consume RNG again. Neither behavior is acceptable.

A subsequent candidate must preserve pressureVersion=1 as the unchanged plan format and retain the version-1 budget recipe for legacy saves. New plans need explicit candidate provenance; an absent provenance field denotes the historical candidate 1. The snapshot verifier must choose the corresponding immutable recipe before checking the recorded budget, while preserving the actual saved actors and all native hit ranges, damage profiles and agricultural-value rules. Unknown provenance must be rejected. The EMA format and once-per-night update remain version 1 because their formula is unchanged.

Required regression evidence before freezing the next candidate: a historical plan with no provenance field loads and is reused without changing RNG, EMA or descriptors; a current tagged plan loads and reuses exactly; an active multi-wave raid restores its original descriptors; the following night adopts the new candidate; malformed or unknown provenance and forged budgets fail validation. Preserve historical receipts and hashes without rewriting them.

## Latest protected native observation

At completed day 20 of the still-running Sabana/Mapungubwe seed-712 v11 protected pilot, cash is 1,012, living crops 97, delivered crates 170, and destroyed crops 0 for that day. Actual income is 2,315, wages 810, seeds 60, walls 1,390, repairs 0 and the ledger reconciliation difference 0. The preceding day had 255 living crops. A falling living census cannot be interpreted as raid destruction: harvest deliveries also remove plants. This observation does not establish final 21-night survival, 100-night viability, or measured human inactivity.

Sources inspected: src/simulation/raid-pressure-plan.js; src/simulation/raid-pressure-budget.js; src/persistence/raid-pressure-snapshot.js; the live pilot's completed daily records. Historical counterfactual evidence remains in native-q-budget-study.md. Any military change must follow terminal campaign evidence and fresh short native campaigns, not a synthetic destruction target.
