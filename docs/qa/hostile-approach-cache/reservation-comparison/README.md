# Reservation and closed-island regression follow-up

Six existing controlled flat-terrain native raid scenes were run independently
with the archived `ffa18f2e` Navigation module and the experimental candidate:
100 connected mijo plants with 1, 2, 5 and 12 warthogs; 12 warthogs against a
closed wall perimeter; and 12 against a centre. Cohorts are explicit QA inputs,
with native RNG, radii, attack budgets, collisions, animation timings and damage.
These are not ordinary procedural biome campaigns or GPU measurements.

All non-timing result fields match exactly: targets, damage, destruction,
retirements, remaining budgets and native RNG. The unguarded candidate exposed a
real CPU regression on closed walls, 4,605 ms versus 216 ms. Original reverse
search already had a complete closed-island certificate; warming the outside
component was unnecessary. The helper now checks all viable native origin
connectors for existing closed-region certificates before attempting expansion.
Incomplete coverage still falls back to warming.

The corrected wall case takes 215 ms versus original 216 ms. Other short-scene
timings are retained; one shared-host run is insufficient to claim a general
performance improvement or absence of regressions. All scenarios end normally.
The centre case legitimately consumes 26/32 attacks after destroying its target;
it is not required to manufacture another target to spend the remaining six.

Full state traces were compared after every native raid update. The first
attempt had differing input hashes because the existing fixture generated a
random save-slot UUID; both unsuccessful comparisons are preserved. The trace
tool now fixes only that QA slot identity before spawning. No RNG or economic
values change. Corrected inputs and all update hashes match exactly:

| Scene | Animals | Matching native updates |
|---|---:|---:|
| Mijo | 1 | 130 |
| Mijo | 2 | 162 |
| Mijo | 5 | 299 |
| Mijo | 12 | 388 |
| Closed perimeter | 12 | 354 |
| Centre | 12 | 640 |

**1,973 consecutive per-update hashes** match across the six scenes, including
complete final states. Hashing time is not a simulation performance benchmark.
The trace fixtures use native `updateRaid` and controlled elapsed increments,
not a virtual-player economic campaign or a rendering loop.

78 core/navigation/gate tests pass after the guard. 64 additional reservation,
contention, native-component and military-rule tests pass. An initial additional
test-file import failure was a missing local `three` dependency in the isolated
worktree; reusing the existing project dependency directory resolved it without
runtime or test expectation edits. The failed log remains preserved.

Three new source-review tests pass. The prepared family contains 468 runtime
inputs; technical delta versus the previous family is exactly Navigation and
the two new navigation modules. Candidate5/control4 share that technical delta
and differ solely in the original two pressure-recipe files. Frozen q15 policies,
economy and 100-day options are unchanged. The planner is intentionally
**planning-only** and cannot launch a campaign while acceptance remains pending.

The original full native tick control (PID 26600 at dispatch) continues separately.
The corrected candidate repeats that retained tick in 7,093 ms and matches the
prior candidate's complete resulting state hash. No full procedural-control
equality, source-qualified campaign launch or main integration is claimed yet.
