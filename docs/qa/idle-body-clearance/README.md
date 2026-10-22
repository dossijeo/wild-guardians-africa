# Body clearance during ambient worker walks

Production called `updateIdle()` without a body-clearance callback. Its `moveWorker()` step therefore validated gates but could cross another worker while wandering near a village or center. Paid movement already uses `prepareActorMotion()` for a swept body and local detour. Ambient walks now use that same local avoidance, with the current game state passed from both production call sites. Resting and watching workers do no navigation work; this change makes no task or economic decision.

A stop-only prototype kept the bodies apart in its directed case but failed QA-047/048: two paid workers could remain too close to one another for the test's independent ambient positions to develop. It was replaced with local avoidance. The directed tests now cover a stationary coworker, the actual `Game.tick` waiting path, no replacement static route request, FIFO reservation, terrain and save/load behavior. All 32 selected tests pass.

Reference: `origin/main` at `2e9e9b71a`. Reproduce the campaign probe with the production WASM and policy:

```powershell
node --test tests/idle.test.js tests/acceptance-worker-routing.test.js
$env:WG_WORKER_PROBE_OUTPUT='test-results/idle-local-avoidance-14.json'
node tools/experiments/probe-worker-overlaps.mjs 14 712 good sabana mapungubwe wild-engine
$env:WG_WORKER_PROBE_OUTPUT='test-results/idle-local-avoidance-30.json'
node tools/experiments/probe-worker-overlaps.mjs 30 712 good sabana mapungubwe wild-engine
```

| Nights | State SHA-256, both variants | Deliveries | Coins | Living crops | Work-period overlap pairs |
| ---: | --- | ---: | ---: | ---: | ---: |
| 14 | `2224d0ea4889a693d5b396704b444b3dc383a44e02dd2db507d096c08741ec05` | 1317 | 899 | 145 | 43 |
| 30 | `1a0dd6350169bd09907a82eb79436011c4c051e32c120f95cfba8bde40cd276f` | 2776 | 736 | 123 | 225 |

The candidate and existing baseline have identical final hashes and metrics at both horizons. These runs do not contain a detected ambient crossing, so they establish no campaign-wide collision reduction and do not address the separate paid-worker recovery phasing. They show that this correction does not change these two frozen campaigns. `npm test` passes 4568 tests with zero failures and 62 skips; `npm run build` passes. The SFX inventory was refreshed only because its audit pins the full `game.js` source hash; its 126 items and 101 runtime assignments are unchanged. Frame-time differences from these unpaired, divergent-machine-load runs are not an A/B performance result.
