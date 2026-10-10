# Living-farm local-area pressure — separate analytical alternative

Frozen original e040 productive prices (mijo33), centre800/start1500/wages30/40. No lower-yield/cheap-wall prices are applied, and b4f7233c joint-price freeze is preserved. Read root main6be16b15 per-target/dual-baseline analysis: current main rhino60/mijo11 is **not** this frozen30/mijo33 baseline. This is arithmetic using original retained positions and cash; no temporal simulation, GPU test, gameplay import or100-night acceptance.

Reproduce:

```text
python -X utf8 tools/farm_value_area_pressure.py --self-test
python -X utf8 tools/farm_value_area_pressure.py docs/qa/horde-self-consistent-pilot-e040ea6f-20 docs/qa/farm-value-area-pressure-e040ea6f/estimates.json
```

Four analytical/oracle tests passed: radius/cap locality, per-crop shield and solid-clear callbacks, deterministic equal-distance ID order, bounded monotonic curve. These are **not** native collision, reload or completed-impact tests. Parent builds the reusable native-tested selector independently; this script's selector only measures retained spatial occupancy.

## Capacity and two review options

Original terminal responsible865/neglect893 living crops have base farm values245946/235869. Terminal target-centered local neighborhoods, clipping at8: radius2 mean4.23/4.39, radius3 mean7.65/7.77, radius4 mean7.93/7.95. Radius3 therefore suffices for this terminal-density test without extending to5. These are final-state positions, **not alive-at-impact histories, completed attack destinations or evidence of wall crossing**. Neighbors may have grown later; impact distribution is not uniform over living crops.

The stationary loss model uses original daily income25053.45, seed6361.025, wages2693.25; each incremental destroyed plant costs mean replacement seed plus75% mean lost future payout. Required loss≈152.14 crops/day for−500coins/day with303 adverse delivery-rounding allowance. The original cash, crop mix and labor cannot be assumed constant after this many losses.

Compare legal top-tier10–14 budget-roll composition means, unchanged individual2–8 hits: cap5/scale1 gives13.09 mean allocated strikes, cap10/scale3 gives34.98, cap12/scale3 gives37.25. Cap5 has minimum1, whereas10/12 retain minimum6. No species RNG changes are assumed. Early/lower tier/stage legality remains an integration gate.

Two simple options in candidate-spec.json: **10 or12 maximum animals**, same late threatscale3/speciescaps[8,5,4,3,2], all species radius3 and hardmax8 affected crops. Structural damage unchanged. This common radius/cap is a minimal arithmetic candidate, not a claim that eight lethal plants per warthog looks appropriate; species-specific smaller footprints need a revised weighted-contact test before lowering caps.

Pressure based on **living base crop value only**, excluding cash, smoothly rises as `1+7*V/(V+10000)`, then floors to a deterministic integer target cap; freeze V/cap at spawn. Integer caps necessarily have discrete transitions; continuous curve does not mean continuous plant damage. This curve never reaches8 at finiteV: retained values yield **7**. Crop attackHits increment remains1 below value60000, becomes2 at/above60000 (a review-only discrete threshold), while the original first5-night one-target/increment1/two-hit/20% total-destruction cap overrides everything. No day-dependent payout or new RNG calls.

|Option|Effective cap at terminal|Mean neighbors capped7|Potential lost crops/day|Neglect net adverse|Good crop-contact.1 net before repairs|
|---|---:|---:|---:|---:|---:|
|max10|7|6.877|165.60|−2028.13|+14080.88|
|max12|7|6.877|176.34|−3247.74|+13945.37|

These assume90% strike spend,90% crop contacts for neglect versus10% for defended, **same15% per-crop geometric shield coverage**, all eligible targets within neighborhood surviving until impact, two attackHits per affected plant, no extra solid occlusion and no target starvation. The frozen defence actually had zero structure hits and no paid repairs, so defended10% exposure is entirely unverified. The same productive/magic effort is retained; no arm has magic disabled to manufacture defeat.

Only91.9%/86.3% of the post-shield terminal capacity can be lost to extra walls, depletion or reachability before the illustrative−500 threshold disappears. Thus these are fragile **capacity candidates**, not predictions. At35% shield, mean pressure is too weak for the shown negative target. A cap12/max6 area can look marginally negative at its hard ceiling, but its smooth curve yields5 and positive≈2288/day; that misleading hard-max candidate is rejected. Likewise small radii/N and increment1 mostly cannot offset original high payout with≤12actors. Per-target damage10 alone cannot supply this capacity.

Stock/cash qualification: −2028/−3248 daily would require roughly160/100days to exhaust original neglect day20 cash324466, still too late to prove defeat by100. Original day5cash9501 is much smaller, but cannot substitute for a candidate's own stock trajectory. Earlier activation may suppress that accumulation, yet must be demonstrated. No estimated stationary margin is a survival distribution or native defeat verdict.

## Integration contract and bounded pilot, OFF until review

One committed attack consumes **one** actor budget and one attackId even when several crop IDs are affected. Stage the deterministic affected IDs and atomically apply their hit counters once; persisted hitApplied must prevent reapplication after reload. No remote deletion, secondary effects or independent RNG. Select local living crops by squared distance and stableID, bounded radius3 and targets8. Each crop independently checks shield at impact and native `nav.segmentClear`/solid geometry between attacker and crop, with appropriate actor/body/radius and canyon/fluid rules. `actorSegmentClear` alone only checks actor discs and is **not** wall/natural-wall occlusion. Preserve gate leaves and destroyed crop invalidation via activeCrops/cropBecameInactive.

Spatial grid/index query per impact; do not scan dead historical crops every frame. Bound candidate examination, not just result count, without dropping legal nearby crops arbitrarily. CPU cost remains unmeasured; no performance improvement claim from actor count alone. Structural damage stays native30 maximum: optional separate bounded1–1.5 curve can be tested later but is not multiplied by areaN. Original zero structural contacts makes a structural-only damage change ineffective in that history.

Before a paired bounded pilot: native root kernel tests for solid walls, natural walls, gate opening, water/lava/canyon, individual shields, attack/reload idempotence and intro ceiling; verify all-tier/stage composition legality and source hashes. Pilot both arms from new game with identical productive/magic effort; paid responsible enclosure expands with crops and intercepts actual paths, neglect omits defence. Capture affected available/capped/occluded/shielded IDs and pre/postattackHits, spend vsdamage, repeated attacks/depletion, target species/value, physical spawn/entry routes, paid HP-restoring repairs, crop deliveries/seed stock/staff/cash, wall cost ownership and meaningful activity. Early20night test must actually reach value threshold; never initialize a stock/cash fixture as if it were an organic new game.

Reject if post-filter contact yield falls below required capacity or defended exposure is not demonstrated. Adjust economic/pressure policy only after original failure is retained. No100night matrix until contact/defence/cost evidence and candidate cash depletion bound justify it. The joint low-yield/cheap-wall alternative remains available independently.
