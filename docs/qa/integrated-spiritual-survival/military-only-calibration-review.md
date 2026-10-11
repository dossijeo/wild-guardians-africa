# Military-only calibration: frozen policies, version 1

The user's latest instruction supersedes the previous proposals to improve the
virtual player's staffing or recovery decisions. No further strategy search is
authorized. No final military configuration has been approved or merged.

## Frozen representative profiles

`military-only-policy-freeze-v1.json` is the executable experiment manifest.
All profiles keep Q15 labour, older-female contracts, native cashflow crop choice,
native actions, delivery-only income and the existing agricultural power budgets.
No profile knows future random events. The automated spatial planner is more
systematic than a human player; these are reproducible representative policies,
not certified human difficulty levels.

| Profile | Fixed decisions |
| --- | --- |
| Good | Existing `good` policy, moderate agricultural magic (one decision opportunity every 4 simulated seconds), shield, paid shore perimeter from day 6, breach-first paid repairs, maintenance reserve. |
| Normal | Same production and moderate magic as good, but begins defenses on day 10 and uses the already-existing `reserveMaintenance=false` decision branch: center repair requests are delayed to below 540 HP instead of below 600 HP. Wall repair rules remain identical; this does not lower wall resistance or change repair costs. |
| Bad | Existing `bad` policy: no walls or repairs, no midday hiring, scarce agricultural magic (one opportunity every 25 seconds), shield allowed, minimal reinvestment reserves. |

The two normal-policy mistakes were selected before observing any normal-policy
campaign. They must not be strengthened or weakened after a defeat or victory.
These are choices available to the player, not hidden strategy-specific damage
multipliers. All three run against the same military configuration. Good is
exactly the already-running v118 policy; the new launcher does not affect that
process. No imported runtime or simulator module was modified for this freeze.

## Baseline and experiment controls

The baseline remains v118, launched at source `9a7aa182`, with 451 recorded
source hashes, crop HP 1, and the existing military candidate. The new baseline
launcher checks every original source hash and additionally records its own
manifest and launcher hashes. It accepts explicit seed/site/output only; it
provides no economic ceiling or economic early-stop option. Existing evidence
directories are never overwritten.

Example (plan only, no campaign launched):

```sh
node tools/run-military-only-calibration.mjs --plan normal 123 sabana mapungubwe docs/qa/integrated-spiritual-survival/military-baseline-normal-123
```

Use `--run` to execute the same frozen case to genuine native defeat or 100
nights. The existing native harness records ledger, daily rows, raid evidence,
source hashes, terminal state and genuine result. A technical exception remains
an incomplete harness case, never a defeat. The launcher deliberately refuses
changed baseline runtime sources; subsequent military candidates need their own
explicit reviewed source freeze before using the same policy manifest.

Initial paired sites: Sabana/Mapungubwe and Gran Cañón/Saheliana, seeds 712, 123,
2026. These six cases per profile are a screening cohort, insufficient to certify
an 85–95% win rate. Held-out seeds and sites are predeclared in the manifest.
Report raw wins/denominators and uncertainty; do not count incomplete runs as
losses. Expand the sample before claiming statistical acceptance.

## Authorized calibration and stopping

Change only animal crop/structure damage, attack radii and actual animal counts,
composition or night progression. Prefer one dimension per version. Preserve
all economic, agricultural, wall HP/cost, repair, magic and crop-HP rules.
Existing hits-per-animal parameters and other military-adjacent rules are frozen
too: the latest authorization lists only the three dimensions above.

Do not stop because a player's balance is fragile, negative trends are visible,
or an outcome appears unlikely. Stop only for a documented technical failure or
clearly disproportionate computational cost. Retain originals and distinguish
native economic/attack defeat, navigation failure, simulator failure and timeout.

Before adjusting damage, classify where and why real defeats occur; compare
losses, physical interception, repair expenses and native production for matched
seeds. Do not interpret the historical v116 technical-policy defeat as a new
frozen-policy military baseline. Do not treat partial v118 rows as a win or a
calibrated destruction rate. Present the final proposed military configuration
and native evidence to the user before integration in main.
