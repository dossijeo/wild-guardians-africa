# Provisional playable magic and raid integration

This branch carries the runtime mechanics from `codex/integrated-spiritual-survival-balance` at `ae846841` onto `origin/main` at `63a28057`. It does not include the experimental QA caches, virtual-player policies or campaign artifacts from that branch.

The playable rules include single-plant Growth and Multiply from day one, separate shared daily power budgets with diminishing marginal benefit, native individual raid target reservations, physical area crop impacts, one-hit crop resistance, progressive horde pressure, Canyon natural defense and the candidate postgame village prices. Recent main changes to worker exit routes, tutorial dismissal, Game Juice, camera usability and native desktop exit were preserved during integration.

Validation in this checkout:

- Web build, asset verification, balance generation check, browser-script syntax, audio runtime, WebP/GLB checks and web package passed.
- 131 focused tests of the integrated magic, damage, reservations, pressure, persistence, tutorial and village-price modules passed.
- 52 regression tests for worker routes, Game Juice, camera, Library and desktop exit passed.
- A full 100-night balance campaign has **not** been completed for these rules. The previous protected seven-night pilot took about 638 seconds in its QA proof path; the no-wall control took 14.05 seconds. The 100-night test is deferred until that QA bottleneck is resolved.

Legacy whole-campaign assertions that require the old attack/crop balance are not evidence that the new candidate meets its desired win rates. Their failures must be reported, not reinterpreted as an accepted balance result. This integration is a playable provisional version, not a claim of validated 100-night difficulty.

The broad legacy suite was started and stopped after it reached an old 100-night victory assertion that now ended in defeat; it is not reported as passing. A separate inherited single-plant test still expected the pre-budget full-strength Growth effect; the test in this branch now verifies the actual diminishing benefit and the need for watering. Other old victory or fixed-payout assertions remain diagnostic until campaign calibration is complete.

Per the user's later decision, inactivity is no longer an acceptance metric; unlimited manual magic provides optional day activity. Historical inactivity telemetry is retained only as historical evidence.
# Provisional CI gate

`npm run test:playable` is the temporary release gate for this playable balance candidate. It covers the new magic, raid, Canyon, tutorial, persistence, worker-route, HUD, Library and desktop-exit behavior. It also includes the recorded Desert and Saheliana raid exit cases. The complete historical suite remains available through `npm test`; on the integration commit it recorded 3,995 passes and 149 failures, primarily because its assertions describe the replaced balance rules. A green provisional gate does **not** validate the 100-night balance or replace migration of those tests. CI uses the provisional gate so that it can still compile and publish the web artifact for human playtesting.
