# Conservative wall sweep bounds — native CPU comparison

Candidate `84aebd61`, baseline `2b3d6810`: both already use individual reservations and shared group accessibility. This experiment changes only wall broad-phase collision rejection, not accessibility, counts, hit budgets, damage, target preference, paths, economic rules or RNG. All six complete outcomes (including final RNG, HP, claims, exit timing and overlap diagnostics) are exactly equal across A1/B1/B2/A2. `compare.mjs` asserts that equality and source provenance.

## Finding and change

A Node CPU profile of the previous implementation attributed substantial self time to exact footprint edge/distance tests and `coarseSegmentClear`. Every search edge previously performed exact wall polygon distance checks even for distant walls. The optimization first tests the conservative world bounds of the same radius-expanded oriented rectangle. Diagonal corners expand by the rotated local radius; using a world AABB padded only by radius would be incorrect.

Bounds reuse the existing rigid frame cache, which validates position, yaw, material, scale and gate type on access. Each radius cache is bounded to eight entries. Close pieces retain the original exact collision checks. Worker gate leaves retain their native moving geometry tests; this optimization never rejects those tests through a static wall envelope. No new collision approximation replaces the exact narrow phase.

## Controlled AB/BA results

Sequential local Windows processes, two samples per implementation, same six native fixtures and CPU timer around `updateRaid` only. Frozen baseline modules loaded from immutable Git blobs; no working-tree swaps. Source manifests also include `wall-collision-frame.js`. All metrics exclude probe observation, renderer, GPU and startup. These small CPU samples do not prove mobile/browser frame stability.

Arithmetic means, milliseconds:

| Fixture | Total update CPU before → after | p95 before → after | Maximum before → after |
|---|---:|---:|---:|
| Open 1 animal | 16.85 → 17.66 | 0.26 → 0.23 | 8.67 → 9.18 |
| Open 2 | 13.28 → 14.17 | 0.18 → 0.18 | 5.80 → 7.07 |
| Open 5 | 79.30 → 76.39 | 1.17 → 1.16 | 15.22 → 14.71 |
| Open 12 | 391.20 → 326.53 | 4.50 → 3.94 | 30.76 → 21.62 |
| Closed perimeter 12 | 922.09 → 214.87 | 9.30 → 1.81 | 319.59 → 71.53 |
| Center only 12 | 599.60 → 539.53 | 3.05 → 2.52 | 70.13 → 84.25 |

Closed-wall total CPU decreases about 76.7%; maximum update decreases about 77.6% in this controlled comparison. The earlier baseline average maximum was 242.94 ms, illustrating run-to-run timing variability; use the paired experiment above, not selectively mixed runs. The center-only case has no walls and does not benefit directly; its worse maximum and small open-case noise prevent a blanket all-scenarios improvement claim.

Physical outcomes remain: open 12 animals spend 32 hits, destroy 14 crops, end after 37.8 simulated seconds. Closed wall perimeter spends 32 hits, damages 640 wall HP, destroys zero crops, ends after 35.4 seconds. Center-only loses the full 480 HP, spends 25 of 32 hits, and exits after the last target is destroyed. No actual body overlaps occur. Controlled synthetic financing and flat terrain isolate reservations; this is not an economic survival campaign.

## Verification and remaining gate

82/82 tests passed in 10.39 s:

`node --test tests/wall-collision-frame.test.js tests/navigation-bounds.test.js tests/gate-passages.test.js tests/gate-articulation.test.js tests/animal-segment-clearance.test.js tests/raid-individual-reservations.test.js tests/acceptance-defensive-reservations.test.js tests/raid-contention-turns.test.js tests/raid-pressure-lifecycle.test.js tests/actor-motion.test.js`

Includes 2,000 exact original-polygon point/sweep comparisons spanning radii, scales, rotations and materials; diagonal corner/tangent protection; live edits/cache invalidation; gate articulation; exact replay; target destruction; saturation/exits; individual crop/wall ownership and independent center approaches.

`npm run build`: passed, 353 modules, 9.42 s. Existing bundle/dynamic-import warnings remain.

Reproduce audit with `node docs/qa/native-economic-balance/wall-bounds-abba-84aebd61/compare.mjs`. Original reports preserved in a1/b1/b2/a2. Native worst updates remain around 72–84 ms in this local fixture; rendered/browser/mobile performance is unverified, so this does not authorize main integration or larger hordes. The balance branch remains independent. Next work must preserve these results while addressing bounded route preparation and native short campaign calibration.
