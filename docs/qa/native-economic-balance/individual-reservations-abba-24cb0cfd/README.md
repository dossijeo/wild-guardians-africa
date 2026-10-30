# Individual reservations, shared group accessibility — frozen AB/BA

Runtime candidate: `24cb0cfd44fcaddbf62f3d7a41b2f9caa2382ec4`. Immutable baseline: `eac59306`. Run order A1, B1, B2, A2, sequential processes on the same local Windows machine. The build ran between B2 and A2, not during either timed probe. Two repetitions per implementation are diagnostic, not a hardware-wide confidence interval.

## Design

Connected crop groups still determine priority and economic value. Accessibility can be rejected once for the whole group only when the native navigation search proves a closed disconnected component encompassing its possible approaches. Uncertain or boundary-spanning groups retain ordinary native path checks. Certificates invalidate when navigation changes. Within an accessible group, only the concrete selected plant is reserved. Walls reserve individual pieces; centers allow separate physical approach positions. Planned approaches and actual bodies retain exclusion radii. Occupied targets cause alternate-target search and bounded waiting, not exclusive ownership of their connected component.

No animal counts, species, hit budgets, damage multipliers, prices or crop resistance changed in this comparison. The QA loader substitutes four immutable baseline Git modules without modifying working-tree files. Common fixtures and metric tools are identical. `source.json` records hashes; `compare.mjs` checks common hashes, starting RNG, budgets, deterministic repeated outcomes, completion and absence of actual body overlap. Reproduce comparison with `node docs/qa/native-economic-balance/individual-reservations-abba-24cb0cfd/compare.mjs`.

## Native physical results

Each open case has 100 mijo plants. Counts below are baseline → candidate. The 400-second horizon differs from the earlier retained 120-second baseline, which is not substituted into this comparison.

| Fixture | Hits consumed | Plants destroyed | Maximum simultaneous target claims | Raid duration (simulated seconds) |
|---|---:|---:|---:|---:|
| Open, 1 animal | 2 → 2 | 1 → 1 | 1 → 1 | 12.6 → 12.6 |
| Open, 2 animals | 4 → 4 | 1 → 2 | 2 → 2 | 36.5 → 15.8 |
| Open, 5 animals | 14 → 14 | 5 → 7 | 2 → 5 | 62.1 → 29.0 |
| Open, 12 animals | 32 → 32 | 9 → 14 | 2 → 12 | 139.6 → 37.8 |
| Closed connected perimeter, 12 | 32 → 32 | 0 → 0 | 2 → 12 | 100.7 → 35.4 |
| Center only, 12 | 24 → 25 | 0 → 0 | 1 → 10 | 276.3 → 67.0 |

Maximum target claims includes centers as well as crops/walls. The dedicated functional tests assert independent plant claims specifically. Closed perimeter candidate has 12 simultaneous wall claims and 640 native wall HP damage. No crop damage penetrates the enclosure. Center-only consumes its remaining available HP (480); retained hit budgets after center destruction are legitimate because no other target exists. All cases exit normally. Actual body-overlap count is zero in all four runs. Conservative retrospective segment flags in raw data compare an earlier movement to later final body poses; they are not actual swept-collision failures and must not be described as such.

Fixtures use controlled funding, forced native species cohorts and simplified terrain/props to isolate ownership. They are not agricultural economic campaigns, proof of profitability, all-biome navigation coverage or production spawn-density acceptance. Attack resolution, hit spending, damage, wall collision, approach navigation and exits are native.

## CPU cost and remaining concern

Arithmetic means of two runs, milliseconds. Only `updateRaid` is timed; probe observation is excluded. No GPU, rendering, browser frame delivery, memory or mobile performance is measured.

| Fixture | Total update CPU, before → after | p95 update, before → after | Maximum update, before → after |
|---|---:|---:|---:|
| Open, 1 | 15.92 → 14.44 | 0.24 → 0.25 | 8.18 → 7.22 |
| Open, 2 | 16.68 → 11.74 | 0.09 → 0.12 | 6.22 → 5.84 |
| Open, 5 | 101.24 → 74.91 | 0.96 → 1.07 | 6.13 → 13.12 |
| Open, 12 | 259.10 → 354.81 | 1.19 → 4.05 | 7.03 → 27.60 |
| Closed perimeter, 12 | 51696.61 → 825.34 | 13.62 → 9.31 | 12784.10 → 242.94 |
| Center only, 12 | 137.03 → 595.49 | 0.11 → 2.99 | 2.38 → 62.42 |

Parallel independent approaches perform more work per update than serialized ownership. Shorter raids do not guarantee lower total CPU. Group-level closed-region reuse eliminates the baseline's repeated huge inaccessible-plant searches, but the initial complete native certificate still costs about 243 ms in this fixture. That spike is not accepted as smooth gameplay. A bounded/prepared routing solution and rendered performance verification remain necessary before main integration. Do not increase hordes or damage to compensate for ownership until its observed effect is reviewed.

## Functional verification

`node --test tests/raid-individual-reservations.test.js tests/acceptance-defensive-reservations.test.js tests/raid-contention-turns.test.js tests/raid-pressure-lifecycle.test.js tests/actor-motion.test.js`: **57/57 passed**, 10.35 seconds. Covers independent crop/wall claims, center approaches across five cultures, exact reload/RNG replay, destroyed claims, legacy migration, actual saturation, bounded waits/exits, physical body clearance, navigation-certificate invalidation, shields, gates and lifecycle.

`npm run build`: passed, 353 modules, Vite 9.29 seconds; existing large-bundle/static-plus-dynamic-import warnings remain. No Windows or visual/GPU acceptance inferred from this build.

Branch remains independent; no merge to main. Earlier failed attempts and negative economic campaigns remain preserved separately.
