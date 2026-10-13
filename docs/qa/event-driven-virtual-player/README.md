# Event-driven virtual player: development evidence

This branch is an isolated campaign-simulator experiment. It does not change
prices, wages, crop production, attack damage or live-game balance parameters.
The balance runner uses continuous native `Game.tick` calls; persistence checks
remain a separate mode. Previous campaign outputs are retained under their
original QA directories.

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
