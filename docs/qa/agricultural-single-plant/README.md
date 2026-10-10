# Single-plant agricultural magic — development evidence

Feature branch: codex/agricultural-single-plant-magic, based on main 8f3c0021.
This changes neither the unmerged horde balance nor seed/harvest prices.

Growth and Multiply unlock on day one and have no cooldown. A fresh precise tap
targets one live plant identity; ground taps and drags cannot cast them. Effects
cannot overlap on the same plant. Growth retains x1.5 speed for 30 simulated
seconds and existing watering/maturity rules. Multiply retains one x2 harvest
flag after its 15-second visual effect. Repeated blessings never stack.
Selection expires ten real seconds after selection or a successful application;
expiry does not cancel effects. Shield retains its duration, cooldown and area.

Version-1 saves remain valid. Already active legacy area effects finish under
their old scope; new casts always target one identity. Old agricultural cooldown
fields are ignored and cleared on tick. Invalid new targets/progress are rejected.
Changed tutorial text is bilingual; old voice clips with incompatible wording
are not matched and the existing silent reading fallback is used.

## Evidence so far

135 final focused tests pass: native commands, target isolation, maturity, repeated
blessings, save/load, exact gesture handling, selection expiry, VFX lifecycle,
spell cards, tutorials and unlock audio. A separate 41-test suite includes five
300-night postgame controls; all pass with agricultural reminders updated.
The Vite build passes. These are CPU/domain/geometry tests, not visual GPU QA.
The seven-night compatibility pilot completes seven native incursions, five
save/reloads and 38 physically delivered crates (final balance 2,355). Its legacy
one-worker strategy is a compatibility control, not new-balance acceptance.

The initial full test-suite attempt was stopped in the legacy 100-night
active-farm test after discovering it still used the old strategy. Its partial
output is diagnostic, not a completed campaign or economic defeat. That harness
now uses the shared single-plant native policy and awaits another run. The
clock test also exposed an exact floating-point timestamp comparison. It fails
identically on untouched main 8f3c0021 (0.05 versus 0.05000000000001137 in raid
metadata); this baseline failure is independent of agricultural magic. The
timestamp comparison now uses the test's existing epsilon; all other raid
facts remain exact. Four historical entry-prototype failures also reproduced on
main. Their original seven-file-plus source is frozen at 6b253ac2 and hash-checked
against the retained reports. Current-selector tests now require exterior entry
and wall interception instead of expecting the former interior-spawn defect.
All seven prototype tests pass; no entry or attack implementation was changed.

## Controlled native daytime comparison

benchmark-agricultural-magic.mjs freezes funded, populated native procedural
farms before comparing identical inputs for 300 daytime seconds. Planting,
worker movement, initial care, tasks, picking, crate carrying and ledger
settlement use the engine. Initial fixture funding is explicitly recorded.
It is not a survival scenario or a synthetic harvest grant.

| Initial plants | Workers | No magic income | Moderate income | Intensive income |
| ---: | ---: | ---: | ---: | ---: |
| 50 | 5 | 484 | 902 | 1,078 |
| 200 | 20 | 726 | 1,034 | 1,485 |
| 500 | 50 | 22 | 77 | 275 |

The 500-plant/single-centre fixture suffers severe real worker congestion.
Do not treat it as an efficient layout or conceal it by changing navigation.
Income differences are genuinely delivered boxes; all compared crates remain
at most x2 the base female harvest. CPU runtimes include differing amounts of
real productive work and are not an isolated renderer performance comparison.

initial-native-journals retains a failed observer attempt: slicing a capped
event list missed deliveries. native-journals-v2 fixes event observation and
checks reconciliation. native-journals-v3 additionally captures completed
growth effects without losing them to the event ring. Historical inputs and
outcomes are retained; no dataset is overwritten. native-journals-v4 repeats
the comparison after the final point-overlap/observer refinements, with explicit
source commit and source hashes, distinct benefited identities, actual extra
growth, effect execution duration and CPU decision timings. Its incomes and
delivered counts are identical to v3.

## Activity accounting and integration gate

Policies allow at most one native agricultural application per decision:
intensive every 1 second, moderate every 4, scarce every 25. These are declared
opportunity cadences, never occupied-time credits. Every application records
the actual selected identity, native CPU selection/application time and
economic redundancy. Effective extra growth and distinct benefited plants
are tracked separately from visual effect duration and autonomous workers.

Human interaction time is not measured by a headless command. It stays null.
The ten-second mode timeout and ongoing effects earn zero activity credit.
The campaign's remaining non-magic decision-window metric is explicitly a
proxy; it cannot certify a human inactivity fraction below 25%.

## Poor-management short controls

The legacy ten-day defeat expectation no longer holds after the reform. Both
scarce-magic controls survive ten days with 32 coins, 323 live plants and a
centre at 225 HP. Their failed expectations and complete native states remain
in poor-management-scarce-diagnostic; they are not classified as defeats.

Repeating with the specified fourteen-day short-calibration horizon gives
authentic GameOver on day 12 (legacy entry) and day 14 (near-camera entry).
The last centre reaches zero HP. Spawned/ended raids reconcile at 12/12 and
14/14, with 11/13 successfully closed nights. No damage, prices, wages or
production rules were changed to obtain these outcomes. The unit control now
states its scarce-magic policy and fourteen-day horizon explicitly. This
preserves the native-defeat requirement while updating its observation window;
it is not approval of the new progressive-horde economy or a 100-night result.

Browser QA could not initialize the official computer-use runtime: kernel asset
initialization returns Windows os error 3. No screenshot, mobile interaction
or GPU acceptance is claimed from the headless/geometry checks above.

Before PR/merge: finish regression checks, update remaining old campaign
helpers, verify pointer/morph presentation in a real browser when available,
and review activity observer limitations. No definitive horde calibration
will use historical area-magic campaigns as acceptance evidence.
