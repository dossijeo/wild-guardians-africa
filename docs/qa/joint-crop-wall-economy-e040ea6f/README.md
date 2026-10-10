# Joint constant crop and wall prices — review-only analytical freeze

No simulation, GPU measurement, production parameter change or 100-night acceptance is included. Baseline is frozen e040ea6f productive pilot (mijo33), **not current main mijo11**. The two original 20-night states and394 source payloads remain unchanged. Original income is reconciled against **all positive native ledger entries**, 497811/504327, with exact rational per-crate ceil; proposed prices likewise recompute each of8444 actual delivered crates. This is counterfactual price arithmetic on original throughput, not a forecast of changed crop choices.

Reproduction, from this branch:

```text
python -X utf8 tools/joint_crop_wall_screen.py --self-test
python -X utf8 tools/joint_crop_wall_screen.py docs/qa/horde-self-consistent-pilot-e040ea6f-20 docs/qa/joint-crop-wall-economy-e040ea6f/estimates.json
node tools/joint_crop_wall_native_contract.mjs
```

Seven Python contracts and the native JS persistence/repair/refund contract passed. The native contract uses this branch's actual snapshot serializer/deserializer, Game repairCost/wallRefund and ledger transact. It temporarily changes BALANCE in its isolated Node process, loads a real serialized wall cost10 and verifies it still costs3 to repair27HP and refunds8; a newly priced wall cost3 costs1 to repair and refunds3. Gate60HP with13.5remaining refunds1 and charges3 to repair. No BALANCE file is modified. Historical target.cost must never be migrated to cheap prices.

## Three conditional points

All retain centre800, initial1500, elders30/young40, seed costs, HP, gate HP, native targeting, individual animal2–8 hits, magic effort and introduction destruction limits. New wall costs are zarzas3/empalizada5/adobe9/reforzado14/piedra20 (ceil25% original). Candidate file is a **parameter diff for review**, not an executable or complete stage configuration.

|Point|Mijo/girasol/sorgo/maiz/batata/algodon/yuca/platano payout|Late max actors|Mean night actors|Weighted income scale|Good / neglect daily net|
|---|---|---:|---:|---:|---:|
|A|33/30/11/15/19/147/27/221|24|22.01|.40292|+582.48 /−570.52|
|B|20/39/14/19/25/190/35/285|24|22.01|.40110|+528.58 /−604.62|
|C|33/31/12/15/20/153/28/229|32|26.78|.41179|+757.55 /−715.71|

These are **stationary conditional means**, not measured profit or survival. Choice maximizes the smaller of good/bad margins within each example class; ±500 is an orientative screen, not a user acceptance threshold. Negative smaller margins can still justify a pilot with a measured stock/cash depletion bound. Cap32 is not preferred merely for a wider interval: CPU/navigation costs are unmeasured.

Each assumes90% allocated strikes spent, good crops receive10% contacts versus90% neglect, same15% geometric shield coverage in both arms, two hits per fresh crop, incremental lost crops above original4.175/day, and75% lost next-harvest value plus replacement seed. Actual original defence has **zero structure hits and zero paid repairs**, so this protection ratio has not been demonstrated. At25%/35% shield or higher good crop exposure some/all points fail the illustrative ±500 test. The complete nine-endpoint sensitivity is retained; **zero selected points pass every endpoint**.

Native maximum damage in the frozen animal source is30HP. Maintenance pessimistically charges one completed ordinary100HP-wall repair after each such contact: ceil(3×30/100)=1, not fractional0.9. The damage-service divisor.75 is an explicit hypothetical maintenance capacity penalty. A second reported extreme batches four contacts before a full3coin reconstruction, nominal.75/contact. Actual attack cancellation, collapse, route and manual repair completion can invalidate that grouping; it is not a claim that a worker repairs during attack. Gate60HP needs its own payment/HP trace. A303coin daily adverse delivery-rounding allowance is included separately (original peak303 deliveries); repair rounding is already charged and must not be counted twice. Future larger throughput can exceed this allowance.

Continuous aggregate diagnostic: Ag=I−Kg×P×.75, Cg=seeds+wages+Kg×unitSeed+integerMaintenance+capital; similarly Ab/Cb without defence. Required y interval is (Cg+goal+rounding)/Ag < y < (Cb−goal−rounding)/Ab. With same15% shield and cheap25% walls, width is approximately.0109 for cap24/scale12, .0249 for cap32/scale12; cap24/scale9 has **no** interval. Aggregate diagnostics are approximate and separate from exact constant per-crop mapping, which preserves/change mijo as explicitly shown.

Point A preserves the observed opening identity1500−800−5−580−210+825=730, versus old observed580 reserve. Point B allows an adjusted **arithmetic** opening: centre800,3 elders90,40 mijo seeds200 leaves410 before any delivery, above minimum30 wage reserve. This does not prove first-day planting/growth throughput or idle<25%. Keeping original116 additional plants/7workers is not required. Point A also makes mijo unusually advantageous relative to expensive seeds (cotton147 vs cost100, banana221 vs cost150); the original crop mix is unlikely to stay constant, another reason to prefer checking B rather than promoting A's spreadsheet margin.

Daily deficits do not prove defeat before100: original day5 cash9501 could deplete at~500/day in19days, whereas original day20 cash324466 would require649days. Neither original buffer is a new-candidate forecast. Record the candidate's own buffer and native defeat guard before interpreting a negative net. Last-centre loss is conditioned by native cash/next-dawn checks, not universally immediate defeat.

## Pilot protocol awaiting parent review

Do **not** dispatch100-night matrix yet. First a paired fresh opening and short bounded candidate pilot. All walls must be newly built via native commands and charged candidate costs; do not reprice fixtures. Both arms use identical productive and magic effort. Responsible defence must evolve with the actual living crop bounds and have recorded paid, legal placements and observable gaps. Reevaluate perimeter after expansion instead of the old `built` one-time day10 box. Preserve gates and natural barriers; repairs requested after damage must complete through native worker travel/payment. Neglect skips this paid maintenance only. Do not alter gameplay target selection to force wall utility.

Before20nights, require a recorded interception: target/path trace shows animals meeting maintained wall/gate routes, with structure contacts/HP damage and actual completed repair payment where applicable. Merely having a wall count or terminal crops inside bounds is insufficient. If animals reach crops through omitted fluid/prop/building pieces, correct the paid policy or reject the defence assumption. Keep all failures.

Instrumentation: allocated/spent/shielded/missed/unused strikes; target ID and value; actual entry, route and contact positions; physical crate deliveries; new wall pieces, paid cost and intercepted routes; gate/gap reasons; repair request/arrival/HP restore/charge or interruption; cash/staff/seed stock by day; native result. Count useful paid construction and completed HP-restoring repairs as player activity separately from cultivation, avoiding request spam and zero-applied strokes. Measure idle against strict<25%; arithmetic has not approved activity.

Late horde envelopes validate all top-tier budget rolls10–14 with their chosen cap/species limits; full tier/stage6–40 legality and staging are **still required** before runner configuration. The original first5 introductions remain protected, prices stay constant across days, and stage hard-cap extension is candidate-only. Freeze the final native source/runner/parameter hashes and review before executing. This package deliberately does not claim that the short pilot is ready to launch.

The separate human alternative of damage scaled to living-farm value must remain a separate analysis: crop hit10 cannot multiply destroyed targets10×, and large structure damage can one-shot centres. It is not applied in these price candidates.
