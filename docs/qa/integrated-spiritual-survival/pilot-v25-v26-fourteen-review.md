# Fourteen-day variation, maintenance omission and failed exterior preparation

Native runtime remains the same one-point candidate. No prices, pressure, crop rules or damage changed during these runs. All campaign process handles are now terminal; archived originals must remain intact.

| Seed | Policy | Status | Completed nights | Cash | Live crops | Cumulative losses |
|---:|---|---|---:|---:|---:|---:|
| 123 | Good | Horizon | 14 | 590 | 168 | 132 |
| 123 | Shield, no walls | Horizon | 14 | 781 | 15 | 491 |
| 123 | No walls or Shield | Horizon | 14 | 517 | 0 | 543 |
| 2026 | Good | Preparation failure, **not defeat** | 9 | See partial state | 233 at failure | See retained journal |
| 2026 | No walls or Shield | Native last-center defeat on night 14 | 13 | 305 | 0 | 485 |

The seed-123 empty farm is not economically irreversible: its center remains intact at 358/600 HP with 517 coins. No artificial defeat should be declared. The Shield-only center remains intact at 600 HP. These terminal native horizons differ from seed 712's genuine last-center destruction and preserve the requested RNG variability.

## Control maintenance omission

The inherited productive `no-walls` and `no-shield` policies have `repair:false`, although the requested controls exclude walls and/or Shield while keeping other productive mechanics. That omission is irrelevant before any center damage, but affects subsequent recovery. Before longer definitive comparisons, allow those productive controls to request and pay normal center repairs. Keep bad management's deliberate maintenance neglect and keep wall construction disabled in both controls. Record a new frozen policy version rather than silently changing a live run or reinterpreting historical outcomes.

`probe-native-center-recovery.mjs` operates on a copy of the retained seed-123 no-Shield state. It hires one older female via the native daily contract (30 coins), requests center repair without prepaying, and advances the worker along real collision-safe terrain. A native RepairApplied event occurs after 17.6 simulated seconds, charging exactly ceil(800 × 242/600)=323 coins once. The restored center has 600 HP, cash 164, and result remains null. The original compressed snapshot's SHA256 is unchanged. All 994 historical crates were already delivered; there is no hidden pending-crate income. This is a recovery-option probe, not a simulated campaign continuation or survival acceptance.

## Seed-2026 technical failure

The good campaign reaches day 10 with 233 living crops, a full-health center and an unspawned sixteen-animal native plan. The Node preparer reports no worker exception or lost observer coverage; it completes with a null whole-group entry. The harness correctly preserves partial state, nine completed daily rows and `nativeResult:null` rather than inventing defeat or restarting.

The retained entry diagnostic reproduces the full-group null and also tests each present species individually. Lion, warthog, buffalo and hyena all have body-clear one-animal camera candidates, but those candidates fail the exterior certificate and final selection returns null. Therefore simply shrinking the horde would not resolve this case. The proof uses clear rays and a graph limited to selected birth/exit poses; a missing proof is not proof of enclosure. Investigate native exterior routes before changing composition, permitting internal spawns or accepting this campaign.

No 100-night campaigns or main integration until the entry issue and productive-control maintenance are resolved. The 2026 failure is a technical gate, not evidence against the economic candidate.
