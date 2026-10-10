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

86 focused tests pass: native commands, target isolation, maturity, repeated
blessings, save/load, exact gesture handling, selection expiry, VFX lifecycle,
spell cards, tutorials and unlock audio. A separate 41-test suite includes five
300-night postgame controls; all pass with agricultural reminders updated.
The Vite build passes. These are CPU/domain/geometry tests, not visual GPU QA.

The initial full test-suite attempt was stopped in the legacy 100-night
active-farm test after discovering it still used the old strategy. Its partial
output is diagnostic, not a completed campaign or economic defeat. That harness
now uses the shared single-plant native policy and awaits another run. The
clock test also exposed an exact floating-point timestamp comparison that needs
baseline verification before changing anything unrelated.

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
outcomes are retained; no dataset is overwritten.

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

Before PR/merge: finish regression checks, update remaining old campaign
helpers, verify pointer/morph presentation in a real browser when available,
and review activity observer limitations. No definitive horde calibration
will use historical area-magic campaigns as acceptance evidence.
