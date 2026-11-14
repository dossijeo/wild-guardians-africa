# Pure joint raid-pressure budget candidate

Base8f3c0021, branchcodex/raid-pressure-product-budget. This module is not imported by production raids/game/snapshots and no generated balance file is changed. The superseded calendar/economy experiments and their negatives remain untouched. Current centre800, wages30/40 and original crop prices/value are read from BALANCE; no wealth/strategy-dependent damage. No campaign, renderer, GPU, CI, PR or promotion is part of this delivery.

## API / deterministic persistence contract

`agriculturalRaidValue(plants)` sums original base_harvest_value only for living crops:11/36/13/17/23/178/32/267. Maturity, magic multipliers, harvested income, cash and corpses do not contribute.

`updateRaidPressureMemory(previous,night,V)` returns a new version1 record `{lastDay,sample,ema}`. Candidate alpha1/3 is the conventional five-sample EMA. A legacy/missing record initializes EMA to current V; no imaginary historical samples. Consecutive nights update once; repeating same day returns unchanged EMA even if V differs. Backward or skipped-day updates reject, because gaps cannot be reconstructed faithfully. Root integration must persist this record and selected plan; save/load does not itself advance it. JSON memory roundtrip is exact and tested. The module does not alter save formats or validate the full game snapshot. Full save integration remains root's task.

`raidPressureSummary` requires memory sampled for the current day, effectiveV=max(currentV,EMA). Hence growth raises threat immediately, removal fades it over actual subsequent nights. P=clamp(.45*(d-1)/99+.55*ln(1+effectiveV/1000)/ln26,0,1), ordinaryN=round(4+30P), cap=1+floor6P. Caller stores chosen pressure/group so preparing/reloading never rerolls an existing plan; this pure API must not be called to silently replace one.

## Composition / per-actor capability

Candidate weak reference is100%warthog atP0; it interpolates linearly to25/28/23/16/8 atP1. Native unlocked species are supplied explicitly by the caller, filtered then normalized. If some species remain locked, the unlocked fractions necessarily exceed the final all-species references; that is documented renormalization, not an unlock bypass. Integer counts use Hamilton largest remainders with stable species-order ties; each count is at mostceil(N*normalizedWeight). Fractions cannot be literal strict caps for all smallN when their sum is1. Thus composition counts are deterministic rounded quotas, while RNG chooses order and hit budgets. This candidate does NOT reuse old uniform legal-composition probabilities or claim old ordinary-night RNG parity.

Per species H range is original min/max+floor2P; crop damage bases1/1/2/2/3+floor1.5P; structure damage original*(1+.5P); attack radii.7/1.2/2/1.6/2.8*(1+.3P). These are attack radii, not changes to body/navigation footprints. Descriptor field `areaCap` is a cardinality limit, never automatic hits or an area multiplier.

Introductions1..5 bypass composition, scaledH/D/radii and Q entirely: return original mandatory species and minimumH with zero additional RNG draws. Existing introductory destruction cap/geometry remains production's authority. Explicit postgame returns no actors/no draws. Root's separate integration must retain those bypasses.

## Q and physically plausible referenceA — declared hypothesis

Reference crops are at1.5m spacing, target atorigin, a90-degree forward cone, original zero offset and direction+Z. Keep only crop centres inside attack radius; nearest eligible centres up tocap−1 accompany the central target. Central contribution1 and peripheral contribution.5 are candidate damage weights, not specified final runtime occlusion semantics. EffectiveA=1+.5*reachablePeripheralCount. A0.91m warthog atP1 still reaches no neighbour, so A=1 despite cap7; rhino can have larger A. This lattice is one reference direction/phase, not a universal maximum or measured crop distribution. Actual offsets, sloped terrain, occlusion,Shield and legal target ownership can reduce/change contacts. No synthetic damage/plant removal is performed.

For the rounded composition, agricultural joint envelope is Σcount*H*Dcrop*Aref. Q candidate isfloor(Σcount*mean(originalH+offset)*Dcrop*Aref*1.0, half-point), with separate min/max envelopes. It caps product overshoot caused by high hit rolls rather than independently increasing N,H,D and A without a budget. Root may calibrate this mean multiplier only through explicitly revised configuration and actual measurements; Q is NOT a desired loss percentage. A separate alternative all-hits-to-structures envelope is reported, never added to agricultural damage; the same strikes cannot hit both. The current Q controls agricultural reference capability, not an extra structural HP budget. This limitation needs explicit review before integration.

Selection retains exactlyN and rounded quotas. It shuffles the remaining species multiset with one RNG draw per actor, then rolls allowedH with one more draw, reserving minimum product for remaining actors. Q can narrow the upper hit roll to stay within its joint bound; this is conditional/truncated hit selection, not a claim of an unchanged uniform original full-range distribution. If Q is below the full cohort's minimum, return explicit `infeasible-budget`, no draws and no selected actors; integration must handle failure honestly, not spawn a silently smaller horde. No complete composition lists are enumerated. At most34 descriptors, split into arrays<=16; arrays are only scheduling suggestions, not implemented waves.

## Reference results (not original day58 reconstruction)

For353 living mijo atnight58: bootstrapV3883, P.5268, N20, Q218 reference HP-points; seed712 selection spends202.5 in waves16+4. For353 evenly mixed crops: V25399, P.8117, N28, Q670; sample spends640, waves16+12. At100 with that mixed reference, P1,N34,Q1256.5; sample spends1221, waves16+16+2. These are static bootstrapped configurations, NOT the stopped campaign's lost stock/wounds/species/EMA. They cannot establish deaths, actualE or success/defeat. `reference-envelopes.json` contains all40 exact static rows and source hashes.

## Outstanding integration / acceptance

Root/FIFO agent own raids/game/snapshots, true elapsed waves<=16, physical damage/area/Shield/occlusions and reservation semantics. Sampling must not change clock, erase workers/queue, spawn through walls or remove crops without physical attacks. Root owns postgame exponential villages50k*1.6^(n−2). No income or wage edits here. Effective exposureE must be observed, not assumed from Q or cap. Requested7/14/21-night pilots across3seeds×5strategies and later100/180 remain future work, gated on integration and cooperative early-stop raw preservation; no such run was executed by this module task.
