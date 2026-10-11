# Connector phase scheduling and Desert polyline validation

Experimental branch; no economy, policy, military, radius or clearance changes. No live campaign source changed.

## Connector scheduling

The impossible-search fixture found 24 walkability queries on the final radial tick: eight radial, eight half-metre origin neighbours, and eight quarter-metre origin neighbours. Completion of the radial slice now yields until the next tick before lattice fallbacks. The fixture retains its at-most-16-query bound; both lattices remain exercised, and stationary exhausted attempts perform no repeated queries. Total lifetime queries are 208, not the obsolete 200 that excluded the quarter-metre fallback. A new geometry version restarts only eight radial queries (216 cumulative). This is a bound for this fixture, not a claim that every lattice expansion costs at most 16 queries. Search frontiers already bound pops to eight per phase.

An initial test run passed four tests and failed the stale cumulative geometry-reset expectation; raw output is retained. After correcting that arithmetic without altering reset behavior, 38 native/fractional/quarter/grid/footprint/world-aligned exit tests pass. Save restoration, original body sizes, collision validity and preserved RNG/ledger are covered by the existing tests.

## Desert day-59 diagnostic

The first old assertion failure is tick 2, animal-83366 at dt=1. The straight chord between frame endpoints fails native clearance. The authoritative route suffix is unchanged, however, and the actual five consumed legs are all clear: 0.3492133727, 0.8831709112, 0.0984306785, 1.4142135624, 1.0549714752 metres, total 3.8000000000000096. No terrain-crossing correction was made.

The test now uses straight swept clearance normally. If the endpoint chord fails, it requires the retained route's suffix to match exactly, verifies every consumed leg with original native clearance, and enforces speed on total polyline length. It cannot accept an unobserved replacement route or ignore terrain. Existing exact-exit, exhausted-budget, pairwise body exclusion, completed-raid and persistence assertions remain. Both dt=0.1 and dt=1 pass.

Negative evidence from the previous revision remains under normal-123-traffic-replay. These focused checks do not constitute full-suite or campaign acceptance; balance remains unmerged.

Combined retained traffic suite: 14 pass, zero failures/skips, including all four normal seed-123 variants after the connector scheduling change. Command: node --test tests/raid-normal-traffic-deadlock.test.js tests/raid-desert-deadlock.test.js tests/raid-traffic-corners.test.js tests/raid-saheliana-exit.test.js
