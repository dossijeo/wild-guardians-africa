# Retained normal seed-123 raid traffic: connector yield

Experimental technical correction only; no military calibration or policy changes. The archived baseline campaign ended at its 2400 simulated-seconds guard with a live raid, not an economic defeat. Its retained day-11 snapshot is byte-identical to tests/fixtures/normal-123-raid-traffic.json.gz.

A terrain-blocked long connector returned before opposing-body yielding. The candidate uses the existing terrain-valid swept yield point before detour search. It changes no actor size, speed, attack budget, damage, prices, RNG implementation or ledger rules.

## Native comparison

Production-synchronized HEAD ca818c39 replay remains active with eight unfinished animals after 120 ticks. With the actor-motion correction, native attacks and retreat resume; all remaining waves finish after 202 seconds, emitting RaidEnded and advancing to day 12. Initial snapshot/RNG match and the final ledger is unchanged. Source hashes and complete compressed traces preserve provenance. The earlier baseline trace uses tool v1 and is exploratory; production-synchronized/candidate traces use the same v2 tool.

The regression runs dt=1 and dt=0.1, with and without reload after 30 seconds. All four pass. It enforces original speed, no new body interpenetration, real RaidEnded, day advancement and exact ledger. A baseline control without reload at dt=1 fails because the raid remains active at 360 seconds. A baseline control WITH reload passes: reload resets enough transient navigation state to escape this snapshot. That passing control is retained and must not be presented as a failing regression.

Existing actor regression selection: 18 pass. Additional Desert/Sahelian/corner traffic selection: eight pass, two fail. Both failures also occur on HEAD before the candidate (Desert dt=1 terrain clearance and bounded connector query count); raw negative output is retained. They remain unresolved and block broad acceptance. Assertions were not weakened.

## Scope and limits

This replay is not a newly completed campaign, a balance victory or full-suite acceptance. No running campaign was patched. The live quantity-recovery campaign remains frozen in its own worktree. No merge to main is approved by this evidence. Further traffic fixes, full regression and integrated native campaigns remain required.

Reproduce: node --test tests/raid-normal-traffic-deadlock.test.js

Read-only diagnostic: node tools/diagnose-retained-raid-traffic.mjs <runtime-root> <snapshot.gz> <fresh-output> 360
