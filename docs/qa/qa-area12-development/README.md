# Frozen area12 candidate — directed implementation checkpoint

Base **e040ea6f9edf62c7924e3b32bd34b28780c39e5f**, high-yield mijo33/rhino30, with root experimental selector commits84a9de27/695610e0 cherry-picked. This is an isolated candidate branch, not current main and not production acceptance. All economic prices, structure HP/damage, individual animal hit budgets, seed prices, salaries and starting money remain the frozen original. No prices or historical wall.cost are migrated. The b4f joint economic and4f mathematical alternatives remain unchanged on their own branches.

Default **OFF**: newGame and old saves have no `qaRaidArea`. The bounded diagnostic explicitly opts into `area-12-v1`; pressure is computed once at successful native raid spawn from living base crop payouts (cash excluded), persisted in `raid.areaPressure`, and validated on load. A committed old raid without pressure remains1target/1increment even if its game later opts into the candidate. Target cap is floor(1+7V/(V+10000)); radius3; increment1 below60000,2 thereafter. First-five introductory raids override radius0/one target/increment1 and original global destruction allowance. Caps never exceed8; hits saturate at2 for snapshot validity. Structures retain native damage. Late cap12/scale3/caps[8,5,4,3,2] matches frozen late configuration; candidate explicitly reaffirms this, rather than claiming a new actor increase.

Damage is within the existing completed-animation/hitApplied guard: one attackId and one actor budget debit. Every damaged crop gets CropHit/CropDestroyed with attackId/primary target. Dead crops invalidate activeCrops; a second animal's committed dead target becomes a spent miss, no repeated damage or income. Presentation areaImpact retains only **applied** IDs, pre/post counters and destroyed status; empty occluded primary and protected primary have explicit reasons. This metadata enables future VFX QA but no visual area-effect acceptance is claimed.

Primary shield consumes the original committed hit and prevents propagation. Other crops individually check their shield and native nav.segmentClear from attacking pose with radius.01, worker=false, ignoring no solids. Missing segmentClear fails closed. Native walls/gates, building hulls, props, fluids and canyon cliffs were checked with controlled native fields; flat canyon water remains traversable. These tests do not cover every procedural seed or microscopic obstacles beyond native sampling precision.

Every stage/tier/raw budget roll is checked against actual candidate composition constraints; a preferred infeasible minimum falls back to legal min1 without adding RNG calls. No empty selected group is allowed. Probability/order of the native legal pool is retained where already feasible.

## Directed validation

25 candidate/kernel/policy/activity contracts passed,0 failed,413.9386ms:

```text
node --test tests/qa-area12-defense-turnover.test.js tests/qa-area12-defense-policy.test.js tests/qa-area12-repair-activity.test.js tests/qa-area12-integration.test.js tests/qa-area12-secondary-retirement.test.js tests/area-crop-targets.test.js
```

Broad directed run including existing player-raids and acceptance-raid-planning:73 total,72passed/1failed,1063.0135ms. Existing QA-088 revised uses a navigator missing the connected-packing method (`nav[method] is not a function`). Running the unchanged frozen runtime at campaign-horde-proposal independently reproduces7pass/1fail for its eight planning tests,395.2646ms. This existing negative is preserved; it does not become a claimed green full suite. Parent retains narrower baseline source/hash evidence separately.

The first policy turnover contract initially failed because bounds could shrink after a harvest and purchase another nested ring (root-turnover-first-failure.txt retained). Policy now uses the cumulative union of every attempted envelope and new living/centre bounds; harvesting cannot shrink it. The corresponding directed test now passes. Native policy can buy fresh legal partial pieces, expand and retry missing segments; records paid count/cost, omitted coordinates/reasons, budget limits and requests. Existing inner walls are not refunded/repriced; native automatic gates remain. Whether these walls intercept animals is **not proved by construction tests**.

Raw activity remains available. Additional meaningfulObservedActivity credits a repair order at its original decision only after matching taskId to a native paid HP-restoring receipt; autonomous walking/repair duration is not activity. Uncompleted/free/zero-HP repair orders do not qualify. Paid wall placement still needs route interception evidence before calling it useful defence. The historical one-shot policy is retained for noncandidate runner calls; only opted-in candidate uses expanding policy.

## Bounded diagnostic protocol — source freeze before launch

Prepared CLI, **not executed at this checkpoint**:

```text
node tools/run_area12_opening.mjs NEW_OUTPUT_DIRECTORY 6
```

Hard maximum6nights before parent review. Paired responsible/neglect, seed712/GranCañón/Saheliana, same original productive/magic policy, olderFemale/plantsPerWorker6/mixed afterday10/dawn hiring. Initial ordinary commands and physical FIFO/delivery required; no fabricated crop or credit fixtures enter this runner. Responsible buys expanding native walls fromday2 and ordinary centre/wall repairs; neglect omits that spending. Native entry worker transport preserved. Gzip raw reports/states before audit, source hash comparisons, progress, negative gates and original failures are retained; no reroll/restart. All runtime and candidate runner inputs are hashed before launch.

The six-night opening may never reach60000 live value or late actor cap12. It can validate opening solvency, intro protection, paid walls/gaps and first area contacts at smaller cap/increment; it cannot certify late lethal capacity. A20night/contact diagnostic requires further parent review, and100matrix is prohibited now. Source can be changed only between retained runs, never during a frozen process. Broad QA failure, path gaps, empty area contacts, no structure interception, no paid repair and idle≥25% are reported, not silently waived.

No CPU/GPU improvement or100night defeat/survival probability is claimed. Root's isolated selector microbench is included with its original provenance; full native impact, geometry/pathfinding and actor navigation costs remain to be measured by the bounded physical diagnostic. The candidate has logical/persistence contracts; art/VFX integration, full procedural coverage and long balance acceptance remain pending.
