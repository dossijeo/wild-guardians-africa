# Event-driven virtual player: development evidence

This branch is an isolated campaign-simulator experiment. It does not change
prices, wages, crop production, attack damage or live-game balance parameters.
The balance runner uses continuous native `Game.tick` calls; persistence checks
remain a separate mode. Previous campaign outputs are retained under their
original QA directories. `retained-native-pilots.zip` contains the unmodified
receipts, source hashes, reports, daily rows and compressed native states for
the ten Sabana pilots retained during development; it is an evidence archive,
not a runtime dependency.

## Native wall closure and worker routes

The game engine now refuses a single-piece wall edit if it would close a
playable enclosure without any traversable automatic gate. A multi-piece
stroke leaves its closing module unbuilt in the same circumstance. The
existing gate is preserved across later reconstruction and mixed-material
edits. If wall construction catches a worker inside the collision margin of
a solid segment, the worker is moved only the small penetration distance to
a walkable side with a native route to its destination. Nearby wall lookup
uses the existing navigation obstacle index.

`node --test tests/worker-wall-overlap-recovery.test.js tests/boundary-gates.test.js tests/canyon-natural-defense.test.js`
passed 30/30 before the extra four-worker regression was added; the four
worker and save/reload cases then passed in the focused test file. The
unhostable-door test deliberately forces native gate placement to reject all
candidates; it verifies that construction cannot seal the worker in.
The later native-loop regression additionally verifies that a returning worker
reaches home and is removed from the active roster before next-day hiring.

No worker-exit certificate or per-plant accessibility check was added to the
virtual player's ordinary decisions. The player asks for native paid wall
placements and accepts the resulting physical defense, including imperfect
gaps.

## Retained campaign observations

`pilot-good-sabana-123-14-wait-fix` used the planned defense policy, a
continuous native campaign, Sabana/Mapungubwe seed 123, and the previous
policy revision. It completed 14 nights with no game result, 699 coins and
142 living crops. It paid for 48 zarzas wall modules and had one automatic
gate. Eight remaining drawn slots could not be built: three intersected a
building and five intersected a large rock/tree; one also overlapped a crop.
The repeated paid-wall attempt was therefore unnecessary. The subsequent
policy revision records this as an obstructed trace once and lets actual
incursions, rather than a geometric certificate, test its effectiveness.
This pilot does **not** validate that later revision or 100-night survival.

The old 14-night attempt with a 30-second entry-observation deadline stopped
as `incomplete-harness-error` at night 10. The same native preparation took
147 seconds with a 180-second observation deadline and the 14-night run then
completed. It was not an economic or combat defeat.

## Rejected entry-preparation experiment

On the retained night-10 snapshot (16 animals), selecting the native exterior
entry took 1.23 seconds. Returning the entry without optional target hints
took 1.30 seconds, but then the first native game tick spent 123.3 seconds
selecting targets, including 51,228 path calls and 51,212 failed paths.
This merely moved a long search from the worker to the game thread. The
experiment was reverted; the campaign continues to use production target
preparation. The retained diagnostic is `day10-entry-only-ticks.json`.

The next benchmark must address redundant target-route searches themselves
without changing physical reachability or animal decisions. The campaign
results remain experimental until the planned 30-, 60- and 100-night runs,
multi-seed comparisons, and performance checks are complete.

An additional conservative grid-connectivity filter reproduced native route
acceptance on a 400-plus-pair fixture, but took 184.9 seconds on the retained
night-10 preparation, slower than the original 147.2-second worker wait. It
was removed rather than kept as unproven complexity.

The first 30-night continuation stopped as `incomplete-harness-error` on day
11. The real raid remained active after the runner's 2,400-second simulated
observation budget: eight animals were still walking or retreating with
nonempty paths. This is neither a native defeat nor a completed day. The
snapshot in `pilot-good-sabana-123-30/partial-state.json.gz` is retained for
isolated navigation/deadlock diagnosis before another long campaign.

That snapshot exposed a physical traffic deadlock. The chosen animal had a
valid place where its opposing peer could yield, but the motion code checked
the point without assigning it to the peer's path. With the one-line route
assignment, four of the eight bodies moved in the first native second and the
raid ended physically after 170 more seconds; the game advanced to day 12.
The 79,593-byte compressed snapshot is copied into
`tests/fixtures/raid-deadlock-day11.json.gz` for a deterministic regression
test. This fix changes no animal speed, collision radius, attack budget or
damage.

The continued Sabana/Mapungubwe seed-123 pilot after that fix reached a real
native defeat on night 24 (`pilot-good-sabana-123-30-yield-fix`). The raid
traffic deadlock was gone; this outcome is neither a 30-night completion nor
evidence that a reasonable defender can survive 100 nights. The current
planned policy retains an incomplete physical wall contour because eight
slots are blocked by a building or large terrain props. It does not claim
certified protection. No economy, crop, raid-damage or attack-count parameter
was changed to force a win. Later campaigns now write compact per-day CPU
timings to `runtime-days.jsonl`.

A second fixed-policy Sabana/Mapungubwe pilot (seed 712) reached a native
defeat on night 20, with 30 coins and a peak of 213 living crops. Its compact
timings show decision work generally below 0.5 seconds/day after the initial
phase, whereas native `Game.tick` rose from about 0.7 seconds on day 1 to
roughly 4–6 seconds on several later days. These are different evolving game
states, so the numbers indicate where CPU time accrues rather than an A/B
speedup claim. The 30-night target was not completed by either of these
seeds. A separate Grand Canyon/Sahelian seed-2026 pilot completed seven nights
without a trapped worker or navigation deadlock. It had 121 coins and peaked
at 178 living crops. The engine is still too costly there for an unexamined
long run: native `Game.tick` accumulated 55.24 seconds on day 6 and 189.12
seconds on day 7, while virtual-player decisions used 0.13 and 0.44 seconds
respectively. The largest individual ticks were 12.85 and 29.74 seconds.
This is a native navigation/raid performance finding, not a campaign defeat
or a proof of gate failure. The pilot is archived separately as
`pilot-good-canyon-2026-7.zip`.

The fixed `bad` policy was also run through seven native Sabana/Mapungubwe
nights on seed 123. It completed that observation horizon with 31 coins,
225 living crops, 23 crops lost on day 7, and no simulator error. Its day-7
native tick time was 1.69 seconds versus 0.02 seconds of virtual-player
decision time. This is a short coverage pilot, not evidence of a 100-night
loss or calibrated difficulty; the raw receipt, ledger, state, protocol and
timings are preserved in `pilot-bad-sabana-123-7.zip`. The runner's older
inactivity field is retained as historical output but is no longer an
acceptance criterion after unlimited agricultural magic was approved.

The fixed `expansive` policy on the same seed and biome also completed seven
native nights, with 1,205 coins, 187 living crops, 12 workers, and no crop
loss on day 7. Its day-7 native tick time was 3.39 seconds and virtual-player
decision time was 0.46 seconds. `pilot-expansive-sabana-123-7.zip` retains
the native state and daily ledgers. These two seven-night profiles have
different economic decisions and evolving world states; they do not establish
relative military difficulty or 100-night survivability.

Continuing the same `bad` policy and seed to a 14-night horizon produced a
native economic defeat at the end of night 11. The final ledger held 22
coins, below the 30-coin minimum needed for another worker day; 55 crops
remained alive and the center retained 600 HP. Day 11 lost 62 crops to
physical attacks. The runner did not force a defeat or stop early on a
forecast. `pilot-bad-sabana-123-14.zip` preserves the final state, receipt,
per-day ledgers, raid evidence, protocol and source hashes. This is one seed
and one poor-management policy, so it does not yet establish the requested
win-rate distribution.

The matching 14-night `expansive` run did **not** complete: after seven
recorded nights, native raid-entry preparation for day 8 at simulated time
385 reached its 180-second observation deadline. The entry preparer had
accepted seven of eight requests, reported no worker failure, and left the
eighth unresolved after 10,812 cooperative presentation updates. This is
`incomplete-harness-error`, not a game defeat or a balance observation. The
exact partial state, prior ledgers, entry diagnostics and source hashes are
preserved in `pilot-expansive-sabana-123-14-incomplete.zip`. Investigate
entry preparation before launching another long campaign from this policy.

`tools/experiments/profile-raid-entry-stages.mjs` replays that saved request
without advancing the campaign. On the 12-animal, 268-crop, 75-structure
snapshot, native entry selection found a valid entry in 10.51 seconds
(10.82 seconds on the second isolated run). The subsequent optional
`warmRaidApproaches` phase remained busy past the runner's 180-second entry
deadline and the isolated profiler was stopped after crossing that limit.
Thus the observed deadline is dominated by target warm-up rather than
choosing an exterior spawn; its exact full duration and any later target
choices were not measured. A fix must keep physical target decisions native
while removing redundant work or allowing the valid entry to become ready
independently of expensive optional warm-up.

A first-animal replay also exceeded 180 seconds without returning a target.
An instrumented replay logged more than 1,300 native path searches during
that first selection, including repeated failed routes from service points
around nearby crops toward the same exterior animal. This localizes the
problem inside one target search, rather than merely multiplying a cheap
search by twelve animals. A conservative closed-region flood-fill prototype
was tried against the same snapshot; the first-animal replay still failed to
finish in 30 seconds, so that prototype was removed before commit. The trace
mode remains available in `profile-raid-entry-stages.mjs`; no crop target,
raid, or navigation rule from the rejected prototype remains in this branch.

A new bounded group-reachability prefilter now uses one relaxed grid flood
over a superset of each native target corridor. It discards a service point
only when no grid connector is reachable *and* the exact direct fractional
segment is blocked; all remaining candidates still use the existing native
route finder and target ordering. The filter is disabled for small groups,
open non-canyon maps without walls, and excessive search areas. On the same
day-8 snapshot, the first-animal target warm-up completed in 8.55 seconds
instead of exceeding 180 seconds, and the full 12-animal warm-up completed
in 25.56 seconds; none of the twelve selected a target in that particular
state. Twelve rejected crop points and twelve rejected structure points were
checked against the exact native route finder, all returning no route.
Three synthetic route-property tests (barrier, detour, fractional direct
path), the focused 99-test navigation/raid suite, and the web build passed.
These are isolated measurements, not yet a successful campaign or proof that
every possible terrain layout has identical target choices. A frozen-source
native pilot and broader comparison remain required.

The frozen-source Sabana/Mapungubwe seed-123 `expansive` pilot with this
prefilter completed its 14-night horizon (`pilot-expansive-sabana-123-14-reachability.zip`).
The otherwise matching prior pilot stopped after seven nights with an entry
observation deadline on day 8. The new day-8 entry wait was 37.18 seconds;
all 18 worker requests in the 14-night pilot were accepted and none failed.
At the day-14 horizon the native ledger held 878 coins, 124 living crops and
23 workers. This is neither a 100-night victory nor evidence of acceptable
runtime: native `Game.tick` used 35.90 seconds on day 8, 49.56 on day 11,
93.61 on day 12, and 72.16 on day 13. The largest day-12 tick was 44.61
seconds. Virtual-player decision time stayed below 1.5 seconds per day on
those days. The next bottleneck is native tick/animal navigation under a
dense farm, not the virtual player's wall plan or the original day-8 entry
preparation deadline.

A repeated seven-night run with per-step timing located the costly interval
at simulated time 475–499 on day 7. Twelve of those ticks exceeded three
seconds, and the largest took 30.34 seconds. A cooperative checkpoint at
day 7, time 480 retained the exact native state. The phase trace at time 475
shows repeated animal target searches against 178 crop candidates; individual
animals spent about 2.8–3.2 seconds on approach paths while workers consumed
less than one millisecond across the traced tick. The two raw runs and the
checkpoint are in `canyon-day7-navigation-trace.zip`.

An exact-state negative-result memo for animal target selection was tested
and removed: on the day-7 checkpoint, AB/BA native ticks were 15.99 and
15.46 seconds for the reference, 16.15 and 15.95 seconds for the candidate.
All four serialized states had the same SHA-256 hash. The rejected comparison
is retained in `canyon-day7-negative-cache-abba.json`. The expensive searches
were new approach queries as other actors moved, so caching only identical
world states did not address the bottleneck. No changed raid behavior from
that experiment remains in the branch.

A second prototype memoized failed searches per crop group while tracking
nearby actor bodies, reserved approaches, shields, and native geometry. It
also preserved the exact serialized state but did not produce a stable gain:
AB/BA reference ticks were 16.17/15.06 seconds and candidate ticks were
15.43/16.09 seconds. The prototype was removed; its comparison remains in
`canyon-day7-group-cache-abba.json`. The remaining work is a shared,
conservative connectivity result for candidate approaches, with exact native
path fallback where connectivity cannot be proven.

## Test baseline and limits

## Historical crop scan audit (day-12 snapshot)

The `1,194 plants` previously reported for the expansive Sabana seed-123
pilot at day 12 counted all records retained by the save model. Only 266
were alive at the captured state. The daily live counts for nights 1–12 were
96, 126, 163, 156, 187, 142, 187, 268, 225, 305, 266, and 208. The
largest observed live count in this pilot was 311. The arbitrary figure of
200 is **not** used as a cap or balance target.

Runtime scans in the game simulation, render/VFX layer, and virtual-player
policies now use the shared `activeCrops` index where only living crops can
be relevant. Historical crop records remain in the save state, and an
explicit `historicalPlants` metric is retained for diagnostics; they are not
discarded from persistence. Focused regressions cover dead-crop exclusion
from target lookups, task selection, work effects, placement and capacity.

This change does **not** resolve the dominant day-12 stall. In the archived
state just before the night-12 raid, an AB/BA 5-second native tick comparison
with camera-derived raid entry produced identical serialized state hashes.
Reference times were 41.82/42.61 seconds, versus 43.31/41.85 seconds after
the live-crop scan change. See `day12-live-crops-native-camera-abba.json`.
The phase trace attributes almost all of the long tick to raid target
selection, specifically 1,923 native approach-path checks. An isolated
run measured roughly 40 seconds for the tick; a later instrumented run
overlapped the full test suite, inflating its absolute time, but found
123.3 seconds in approach-path checks out of 131.0 seconds total. See
`day12-live-crops-phase-profile.json`. This is a separate navigation/search
cost, so no improvement to gameplay frame stability is claimed from this
audit. The military parameters have not been changed to conceal it.
An isolated call-count profile of the same state (`day12-native-search-call-profile.json`)
measured 55,242 native `approachPath` calls, only 22 successful, consuming
35.85 of the 39.74 seconds in `Game.tick`. The group reachability prefilter
ran 125 times (1.04 seconds); the group-blocked certificate ran 1,924 times
and rejected none (0.30 seconds). The route attempts, rather than historical
crop scans or virtual-player decisions, therefore account for this stall.

A stricter grid-connectivity prefilter was tested and removed. It preserved
the exact serialized state hash in AB/BA but made the tick slower:
reference 39.05/42.83 seconds, candidate 45.62/46.01 seconds. This negative
result is retained as `day12-reachability-exact-edges-abba.json` so further
work can focus on reducing repeated route attempts, not on making this
particular prefilter more expensive.
The failure-reason probe (`day12-native-path-failure-profile.json`) found
46,203 searches rejected by an already explored bounded region, compared with
8,999 searches exhausted normally. Caching only that region's answer for the
same endpoint was insufficient: `day12-searched-region-end-memo-abba.json`
preserved the state but took 40.08/41.04 seconds versus 37.90/40.66 seconds.

The retained optimization applies the existing bounded-region certificate
*before* creating the A* frontier when all potentially valid origin cells lie
inside the proven region. It keeps the later native check as fallback. In the
day-12 AB/BA replay, `day12-early-searched-region-abba.json`, the reference
took 38.71/41.50 seconds and the candidate 23.49/22.99 seconds, with all
four serialized states sharing the same SHA-256 hash. This is a 42% reduction
in this specific five-second simulation slice; 23 seconds remains too slow
for an interactive tick or an efficient 100-night campaign. Focused navigation
tests (43) and the web build passed after removing temporary failure probes.
An additional whole-ring certificate tried to reject all 32 approach samples
for a target at once. Against the retained early certificate, AB/BA times
were 21.54/23.12 seconds for the reference and 22.34/22.28 seconds for the
candidate, with identical state hashes. The difference was within run noise;
the extra method was removed. The raw comparison remains in
`day12-searched-ring-proof-abba.json`.
The post-change call profile (`day12-early-region-call-profile.json`) still
shows 55,242 `approachPath` calls (22 successful), now taking 18.28 of 21.92
seconds. Further large gains require reducing the number of attempted
service points while retaining physically valid target selection; neither
historical-crop filtering nor a more expensive point-by-point proof does that.
Moving that same proof before `Navigation.path` was also tested and removed:
`day12-prepath-region-proof-abba.json` reports 21.73/23.49 seconds for the
retained reference and 21.79/22.41 seconds for the candidate, again with
identical state hashes. Moving the check saved no meaningful time because
the remaining cost lies in the number of distinct service-point probes.

A narrower positive-only cache now shares the bounded-region proof between
service points that round to the same navigation cell and have the same
endpoint, radius, corridor and geometry epoch. Direct fractional routes are
still checked before using it; searches with `skipDirect` bypass it. Two
day-12 AB/BA repeats against the retained early-certificate version gave
reference 21.67/23.35 and 21.68/23.33 seconds, versus candidate 21.28/21.15
and 20.19/21.18 seconds, respectively. All eight serialized states were
identical. The separate Gran Cañón day-7 snapshot showed no material speed
change (reference 3.52/3.42, candidate 3.56/3.41 seconds) and identical
states. See the `day12-searched-cell-proof-abba*.json` and
`canyon-day7-searched-cell-proof-abba.json` reports. This is a modest local
gain, not a resolution of the 100-night runtime problem.
The next profile (`day12-segment-length-profile.json`) isolated 5,484,136
short grid-edge `segmentClear` calls, costing 6.70 seconds, versus 61,564
long segments costing 1.66 seconds. The search-neighbor cache already held
walkability for each directed grid edge; it now also retains that edge's
exact animal clearance within the navigation epoch. Worker edges retain their
existing behavior. In the same snapshot, short-edge calls dropped to 69,501
(2.65 seconds) and the native tick to 16.52 seconds; see
`day12-animal-grid-edge-profile.json`.

The day-12 AB/BA comparison against the previous commit measured reference
19.84/20.79 seconds and candidate 16.66/16.39 seconds, with four identical
serialized states. A Gran Cañón day-7 replay measured reference 3.79/3.40
seconds and candidate 3.44/3.43 seconds, also with identical states. See
`day12-animal-grid-edge-abba.json` and `canyon-day7-animal-grid-edge-abba.json`.
The 94 focused navigation, actor-motion and raid tests and the web build
passed. The remaining 16-second day-12 slice still prevents treating the
100-night campaign runtime as solved.
The retained native replay showed 55,242 approach attempts but only 5,668
distinct actor/rounded-service-cell combinations; 55,144 attempts reused a
combination at least once (`day12-approach-cell-reuse.json`). A candidate
that combined several exhausted-region certificates to reject a whole cell
preserved the state but did not improve time: reference 16.21/17.00 seconds,
candidate 16.81/16.58 seconds. It was removed; the comparison is saved as
`day12-composite-region-proof-abba.json`.

The V8 CPU profile in `day12-native-astar.cpuprofile` was captured with
`tools/experiments/replay-native-tick.mjs` from the same frozen snapshot.
Largest self-time samples were `findPathSteps` 5.64 s, `findPath` 2.34 s,
`searchNeighbors` 2.11 s, and procedural terrain `lattice` 1.62 s; garbage
collection accounted for 0.97 s. Raising the search-neighbor cache from
4,096 to 8,192 entries was tested and removed: reference 15.91/17.33 s,
candidate 16.87/17.81 s (`day12-neighbor-cache-8192-abba.json`). The larger
cache did not relieve the repeated A* work and offered no favorable
memory/time tradeoff.
Line-level profile samples put the largest A* self-time on cost lookup and
frontier insertion in `findPathSteps` (lines 537 and 544 in the profiled
source). Replacing animal string grid keys with corridor-local numeric keys
passed 87 focused tests and preserved the exact day-12 state, but AB/BA
times were effectively equal: reference 16.64/17.04 seconds and candidate
16.64/16.66 seconds. The prototype was removed; see
`day12-numeric-grid-keys-abba.json`. The next useful approach must avoid
entire redundant searches, rather than changing the key representation.
The focused simulation, rendering, and virtual-player regressions passed,
and the web build passed. The full repository suite was attempted but stopped
after its legacy `campaign.test.js` child continued consuming CPU for more
than six minutes; at the stop the log contained 865 passes and 43 failures.
This branch therefore does not claim a green full suite.


The focused wall/canyon/worker suite passed 31 tests before the final
documentation update, including a worker returning through the automatic gate
after save/reload and four workers simultaneously inside a closed perimeter.
The actor-yield regression confirms that the retained night-11 raid advances
and finishes through native movement.

The full repository suite was run but is not green: 4,231 tests passed and 69
failed or were stopped, including one legacy campaign child stopped after more
than five minutes. Five affected test files were rerun in a detached checkout
of the exact branch base (`34b19e7f`) and in this branch: both runs had the
same 29 failing test names out of 76 tests. Those selected failures are
inherited; the remaining full-suite failures have not all been classified.
The web build passed. A PR must retain this distinction rather than claiming
that the full test suite passes.
