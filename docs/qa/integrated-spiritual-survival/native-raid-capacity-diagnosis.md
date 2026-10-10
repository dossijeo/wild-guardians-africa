# Native raid capacity and twenty-one-night control results

The bad-management pilot reached an authentic native defeat after night sixteen, at dawn of day seventeen. Its saved state has `result: defeat`, balance 11 integer coins, and a native `GameOver` event immediately after `RaidEnded` and the agricultural event. The daily ledger reconciles exactly. This is not a timeout, technical error or a defeat inferred from low money.

The productive no-wall/no-shield control completed twenty-one nights with 2,308 coins, 372 living crops and 417 crops destroyed cumulatively. Both use identical frozen source hashes. The protected twenty-one-night process remains running at this observation; its eventual result must be recorded separately, not inferred from its fourteen-night state.

## Capacity diagnosis

`tools/diagnose_native_raid_capacity.py` is read-only. It verifies completed native encounters and exact spawn exposure, then distinguishes:

1. Directional reference potential recorded by the planner.
2. Configured maximum crop HP damage if every assigned hit contacts the maximum allowed plants, with central/peripheral damage clamped to the plant's two-HP resistance.
3. Actual clamped crop HP damage, destroyed plants and native unused hit budgets.

The kill upper bound deliberately treats every previously wounded crop as a free kill, then permits one additional healthy kill for every two configured HP. This overestimates achievable losses. It applies to the original exposed cohort; the pilot does not plant during incursions. It is not a proof that targets can be reached, a casualty quota, or a permission to manufacture damage.

At night fourteen the directional reference estimate is 60 HP, while the configured all-cap maximum is 108 HP. With two wounded crops and 302 exposed, the optimistic configured upper bound is 56 destroyed crops. The 32 figure in the earlier commentary used the reference geometry alone and must not be read as a universal maximum. The orientative unprotected curve would correspond to about 65 plants, which even the more generous configured bound cannot support in this encounter. Actual losses were 26, with all assigned hit budgets consumed.

At night twenty-one, 403 crops are exposed, three are wounded, and seventeen animals have 56 hits assigned. The reference potential is 78 HP, actual crop HP damage is 72, and 31 crops are destroyed. Even a configured all-cap 134-HP attack has an optimistic upper bound of 70 plants, below the orientative 88.5. This explains why correcting reservations alone does not create the requested pressure: attacks are used, but the selected physical capacity remains too small for that reference. The orientative curves are not mandatory casualty rules.

Six capacity-diagnostic tests pass, including clipping central and peripheral damage, exact-census requirements, rejection of incomplete evidence and separation of reference potential from configured caps. These synthetic unit fixtures validate the reporting calculation; native report inputs provide the gameplay evidence.

No economic prices, damage profiles, animal counts or campaign parameters were modified while these frozen campaigns were running. The next military candidate must be explicit, versioned and checked through native short pilots; these historical results and failures remain retained. No 100-night balance, main integration, or manual-activity acceptance follows from these controls.
