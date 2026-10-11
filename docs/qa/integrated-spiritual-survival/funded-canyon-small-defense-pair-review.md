# Incremental paid contour versus native no-wall control

Both runs start from the actual V6 eight-crop, one-worker state at second 25. The control removes all 31 walls through normal player commands, receiving their actual 310-coin refund. Crops, workers, RNG, planned night, suppression and simulated time remain unchanged. There are no direct geometry edits or invented funds.

The worker-day runs use identical source hashes and both deliver eight real crates for 88 coins, buy eight replacements for 40 and continue to the same native first-night plan. The strict night audit verifies identical full crop state, terrain inputs, RNG and engine sources, and explicitly requires 31 paid pieces in the defended state and none in the control. Its old default of 34 is preserved for historical fixtures; the new count is declared rather than inferred or silently ignored.

| First-night result | Paid contour | No walls |
|---|---:|---:|
| Actual strikes | 2 | 2 |
| Wall damage | 40 HP | 0 |
| Centre damage | 0 | 20 HP |
| Plants destroyed | 0 | 1 |
| Plants surviving | 8 | 7 |
| Remaining strikes on retreat | 0 | 0 |

Native day-two hiring, repair, reload and delivery then give:

| Day-two ledger | Paid contour | No walls |
|---|---:|---:|
| Opening coins | 368 | 678 |
| Crate income | 88 | 77 |
| Elder wage | 30 | 30 |
| Repair payment | 4 | 27 |
| Net increase | 54 | 20 |
| Closing coins | 422 | 698 |

The defended day-two net advantage is 34 coins: 23 less actual repair expense and 11 more actual crate income. Absolute cash is not evidence that the protected strategy is already more profitable: it spent 310 coins on the perimeter, while the control recovered that actual investment. No wall amortization or later-horde calibration is inferred from this short introductory fixture. Both animals' budget, introductory loss safeguard and the one-point crop resistance are unchanged.

Raw outputs, compressed states and strict pair audits are retained. The no-wall-preparation scope now reports its actual removal count instead of the old hard-coded 34. The audit regression rejects an incorrect declared count of 32 without producing a success artifact. This is native immediate defense/repair evidence, not a completed seven-night strategy comparison or overall balance approval.

The attempted v106 seven-night launch used the erroneous biome argument `gran_canon`. Native opening failed before any daily rows with missing `biome-undefined.json`; receipt, partial report, source and protocol are preserved. It is a harness/input failure, not an economic defeat or evidence about Canyon playability. The CLI now rejects unknown biome IDs before opening the world, and tests cover the valid `gran-canon` and invalid/ inherited-property names. Corrected pilots use new output directories, preserving the failed launch.
