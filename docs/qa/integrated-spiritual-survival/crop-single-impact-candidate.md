# One-point crop resistance candidate

Requested on 2026-10-10 after the two-point campaigns. This changes crop resistance only, on the experimental integration branch. It does not approve overall balance or change main.

All eight crops now have one impact point. A successful central impact of at least one point destroys a healthy crop immediately. Peripheral damage retains the existing half-weight recipe: a half-point peripheral contact wounds a healthy plant; two such contacts destroy it. Shield, obstacle ray, direction, radius, deduplication and individual reservation checks still precede damage. Structure health and damage, pressure candidate v3, species, strike budgets, prices, magic and wages are unchanged.

The original introductory quota remains: the first five raids cannot destroy the last surviving plant or exceed the introductory crop-loss cap. Exhausted quotas redirect native targeting; this is existing introductory protection, not a permanent defense bonus.

## Save compatibility

New plants carry `attackHitPoints: 1`. Old plants without this field retain the historical two-point interpretation. Loading alone does not wound, destroy or modify them. At their next actual hit, the existing wound fraction is normalized: old damage 0.5/1/1.5 becomes 0.25/0.5/0.75 before new damage is applied. This metadata and the resulting exact quarter-point wounds persist. Dead plants cannot be hit or destroyed twice. Invalid resistance or unrepresentable wounds are rejected by snapshot validation.

The native worker-entry request copies resistance metadata, and campaign protocols record `cropHitPoints`. Provenance hashes include the new damage module. Capacity diagnostics use each report's recorded health, defaulting to two points for historical reports. Comparisons reject undeclared mixed-resistance inputs. Historical two-point reports remain unchanged and cannot validate this candidate.

## Validation and calibration sequence

Initial impact/save/introduction checks: 72 passed. New explicit health and save-compatibility tests cover all eight species of crop, peripheral wounds, old saves, repeated destruction and malformed damage. Capacity/comparison evidence integrity: 17 Python checks passed. Production web build passed.

A broader raid regression exposed two stale expectations from previous candidates: the old two-step strike-growth formula and the old introductory target predicate. Their reference expectations were updated to the already-existing pressure v3 and the new one-point quota respectively; no pressure parameters changed. The corrected focused set passed 26 tests. The corrected full raid regression passed 397/397 tests; entry, reload, shielding, structural collapse and campaign evidence passed 122/122. The five retargeting expectations were updated from two strikes per crop to one, preserving budget and reservation assertions. Fresh native pilot outcomes will be recorded separately.

Freeze the source before paired short campaigns (good management versus no walls/no shield, seed 712, Sabana/Mapungubwe). Keep worker policy q8, cashflow crops, shore defenses from day six and 1.5 fluid clearance, matching the previous experiment settings. Check actual physical losses, unused strikes, paid repairs and reconciled ledger. No full 100-night approval until short results are coherent; no synthetic kills or economic adjustments.
