# Progressive horde proposal — source review only

Base: main runtime `6c688dff`; tutorial-price generator guard `70426087` cherry-picked as `befc652f`. No production or canonical balance files were changed. The new model is imported only by diagnostic tools/tests. No campaign, world-generation benchmark or GPU run was executed.

## Fixed economics and preserved history

The next compatible candidate must keep centre cost **800**, older wage **30**, young wage **40**, initial money **1500**, seed prices and reserves unchanged. Proposed sales are three times current main values; attraction uses an explicit canonical base value rather than the increased sale price. Running quota four remains experimental. The generator guard forbids the discarded 600-centre candidate.

Historical H100 (centre600) reached 100 nights with 22.7867% global inactivity, but its first10 remained 25.4667% and final40 26.8667%. It is no longer promotable. Historical H bad6 returned six surviving ten-night cases and zero defeats: this negative control did not prove loss risk. Neither record is replaced by this proposal, and no comparable result exists for centre800 with the proposed economics.

The arithmetic model preserves **current main** structure damage 20/25/35/40/60, original strike budgets and crop destruction after two hits. Historical H instead had half structure damage 10/12.5/17.5/20/30. This difference must be decided explicitly before a runtime candidate; the model does not silently claim to reproduce H or assume its survival results transfer. To isolate a count experiment, establish a compatible centre800 economic control with the selected structure damage and keep that damage identical in both defense arms. Do not adjust damage and horde count together to obtain a favorable outcome.

## Count-first progression hypothesis

Threat tiers still depend on native attraction and unlocked species. Scale the sampled native tier budget upward by `ceil(nativeBudget * scale)` after the first five introductions. Species order below is warthog, hyena, buffalo, lion, rhino.

| Nights | Total cap | Desired minimum | Budget scale | Species caps |
|---|---:|---:|---:|---|
| 1–5 | 1 | 1 | Native intro | One new species each night |
| 6–10 | 5 | 1 | 1 | 3 / 2 / 2 / 2 / 1 |
| 11–20 | 7 | 3 | 1.5 | 5 / 3 / 2 / 2 / 1 |
| 21–40 | 9 | 4 | 2 | 6 / 4 / 3 / 2 / 2 |
| 41–100 | 12 | 6 | 3 | 8 / 5 / 4 / 3 / 2 |

The minimum is bounded by available threat budget, so a low-attraction farm is not assigned an impossible six-animal group. Spend stays between ceil(75% of budget) and the whole budget. All proposed tier/budget combinations have a legal group in this model; this proves arithmetic feasibility only, not a navigable entry or an appropriate difficulty curve. No new species unlock, daytime policy or introductory strike/destruction limit is proposed. Existing native first-five loss cap is `min(count-1, ceil(count*.2))`; one starting plant cannot be destroyed by that intro, and larger starting groups can lose a real plant.

## Required runtime wiring, not implemented

`rules.compositions` currently hardcodes five animals twice, and hardcodes .75 despite balance fields. Changing `raids.max_animals` alone would have no effect. A future implementation must pass validated stage total/species caps and minimum explicitly, retain default exact ordering/parity, and reuse `min_budget_spend_fraction`. Daytime groups must retain their own original limits. Persist or derive stage from the actual planned night rather than current day at a delayed spawn; saved plans must preserve their selected group.

Pure enumeration covered 101 stage/tier/budget cases: 11,312 group candidates in total, at most 689 groups and 2,517 recursion visits in one case. This single-pass CPU diagnostic took 17.43 ms in total. It excludes navigation, spawning and rendering, and is not a gameplay performance claim. Cache immutable composition results by budget/unlocked-species/stage caps; do not enumerate or run navigation for every composition each night. Raising caps without this bounded recipe is not authorized.

Full-group entry is a separate gate. `spawnRaid` can currently return without a raid if a complete entry is unavailable, while `Game.tick` has already marked the night plan done. A larger cap must not increase nights silently skipped. Prepared-worker entry and bounded near-camera/near-farm/boundary fallbacks must retain the whole selected group, validate terrain/footprints and native paths, and not teleport or omit actors. A deterministic deferred retry must preserve the chosen group/RNG state and avoid repeatedly rolling a new plan; its cancellation/save/dawn semantics need review before implementation. No claim is made that the current entry search supports twelve animals.

Necessary directed tests: default composition parity; stage boundaries; native intro caps and two-hit crops; saved delayed plans and active raids; complete mixed twelve-animal entry; narrow Canyon and river exceptions; prepared-entry miss/stale reply; far camera; no valid full entry; failed-entry plan not silently consumed; raids across dawn and final-night loss-before-victory. Existing `raid-entry-preparer` tests exercise five-species groups and fallback, but cannot establish larger-group coverage by extrapolation.

## Separate ordinary-command defense comparison

Name a new protocol, e.g. `defense-neglect-horde`, without changing `check_bad_management` or the frozen original responsible producer. Both arms use the same native seed, sowing rule, affordable hiring rule, day clock, domain, magic rule and campaign gates. Quantities of accepted plants/workers naturally differ because defense costs and losses change available money; commands are not forced into an artificially funded common schedule.

Responsible arm pays for walls and requests real center/wall repairs when damaged. Neglect arm builds no defensive walls and requests neither center nor wall repairs. The current `defend:false` is insufficient: its producer still requests center repairs, reserves tomorrow's wages and automatically uses Shield/Growth/Multiply. Preserve that old control; create an explicitly named protocol for the different decisions. Keep the same magic rule in both new arms so the only deliberate policy difference is paid defenses/repairs.

The existing wall policy starts day10, saves500, builds one paid zarzas perimeter and requests repairs below80% HP. Its perimeter may leave later crops outside. Review coverage and actual entry/gate behavior before adopting it. Wall costs are10/35/80 per unit for zarzas/adobe/piedra; planned spending must use actual accepted stroke pieces and charge real operations. Requested repairs are not completed repairs or paid debits. Report completed `RepairApplied` charges, HP restored, wall placement/refunds, living crops inside/outside perimeter, queue/reservation status, attack hits/animals, last-center loss, picked versus physically paid crates, all ledger components and real inactivity.

Do not force defeat, alter random seed, weaken reserve/FIFO/ledger/daily-delivery gates, expand the plot domain or reclassify historical inactivity. A neglect arm surviving a bounded horizon is a negative loss result, not evidence that losing is impossible. A responsible defeat is likewise retained. Global approval still requires native100night inactivity strictly below25%, full physical/ledger integrity, meaningful ordinary-command loss cases and the thirty-biome/culture matrix on the actual compatible source.

## Work and CPU budget before any campaign

Completed: five pure/native-planner unit tests (486 ms Node duration) and one selected existing native first-five spawn/save test (236 ms; 42 tests skipped by explicit pattern). Logs and arithmetic report are retained. No detailed physical damage loop or heavy entry-generation test ran.

Next, after root source review only: implement a canonical/configurable count candidate and bounded composition/entry/default-parity tests. First campaign experiment should be a separately labeled paired 20-night diagnostic to cross the stage11 change, with the unchanged compatible control retained. Prior dense ten-night simulations took roughly two to three minutes each; two twenty-night horde arms may take substantially longer, and that estimate is not a measurement. Request/coordinate an exclusive CPU window and record actual handles/costs. No twenty- or hundred-night producer is authorized by this document; no PR or promotion follows from these unit tests.
