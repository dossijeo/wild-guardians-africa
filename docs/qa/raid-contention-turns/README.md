# Candidate native contention turns

Isolated from main71019445. This changes only temporary raid target contention; no balance budgets, HP, prices, damage areas, campaign deadlines or active cohort limits are altered. The original seven-fixture negative is preserved in ../raid-reservation-saturation/ from diagnostic53e97fb7. Candidate source hashes are in source.json.

## Behavior

A failed target selection waits only when another active actor holds an eligible crop/defensive-group lease. Ownership remains exclusive. A just-exhausted owner still holds a temporary lease until its existing native release next tick; excluding that case caused two remaining hits to depart at dt1 and was fixed with directed coverage. A previous owner relinquishing its target joins the FIFO tail if other turns are already pending. The head may claim a newly available group using the ordinary reachable approach and movement/attack rules.

Waiters stage at their certified birth, with normal speed, radius, solids, terrain/fluid legality and body avoidance. An actor already elsewhere returns through native walkTo; a failed staging route is retried at most once a simulated second. No position corrections or overlap exemptions are added. Stationary waiters hold an existing walking pose instead of walking in place. A newly illegal staging footprint causes normal retreat rather than bypassing the obstruction.

The FIFO and optional timing/progress fields persist in saveVersion1, with identity/uniqueness/time/budget validation; old saves without these fields remain supported. Real hit-budget consumption, including shielded hits and native worker encounters, renews the90 simulated-second no-progress guard. Movement, queries or empty reservation churn do not renew it. No remaining eligible contested target leads to ordinary retreat. A head isolated by native terrain releases its turn, allowing a later accessible actor to act. The guard can retire an animal prematurely on an unusually long route without a real hit for90s; this explicit limit is not disguised as damage or victory.

## CPU work

The rejected draft rebuilt/hash a fingerprint of every crop/building on each head tick. Final waitEpoch is O(1): native navigation version, lease revision and last actual hit time. Native topology changes and lease release are immediate signals; other eligibility/Shield changes are retried within one simulated second. There is no A* per waiting tick. Queue cleanup is linear in the cohort. Only a head selection retry invokes ordinary native target/path search, and staged movement uses the existing native path lifecycle.

The helper-only diagnostic compares8 paired batches of1000 calls on a400-plant fixture. Rejected fingerprint:89.95–138.37ms per1000; constant revision:0.0484–0.1671ms per1000. This is CPU microbenchmark evidence for removing the dense scan, not a gameplay/GPU frametime promise or A* measurement. A directed test makes dense plant/structure getters throw and confirms final epoch never reads them.

## Native validation

183/183 directed regressions pass, including18 new contracts: monoculture at dt0.1/dt1; exact FIFO save/reload; mixed crops, five species and varied radii/budgets; native staging footprints and body separation; no targets; bounded no-progress guard; corrupt/legacy snapshots; just-exhausted lease; existing gate/collapse; first-five intro protection; shield consumption; and an inaccessible head followed by an accessible turn. Build passes with the existing Vite chunk-size/import warnings. No rendering QA, six-biome playthrough, campaign100 or balance certification is claimed.

Candidate fixtures end naturally within400 simulated seconds. Mono12 now consumes32/32 real hits vs original4/32, at both dt0.1 and dt1. Mono5 consumes14/14 vs4/14. Fragmented12 remains32/32. Connected-wall12 consumes32/32 vs6/32. Centre-only12 spends24/32, then remaining actors retreat legitimately after the centre becomes unavailable. Damage events, initial budgets, final budgets, native retreat transitions and RNG are retained in native-candidate.json.

SFX/capacity audits were regenerated incidentally to check the changed source and passed5 contracts, then their unrelated central artifacts were restored as requested. They are not included in this candidate. The eventual integrating balance branch must refresh its own source-pin inventories; standalone source-pin freshness on this isolated runtime commit is expected to be stale. No merge or PR is performed by this subagent; owner review/cherry-pick is required.
