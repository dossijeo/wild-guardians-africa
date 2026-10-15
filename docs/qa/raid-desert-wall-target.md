# Desierto 983: targeting a reachable crop-facing perimeter

Source of the defended day-6/day-7 raid captures: balance replay commit
`2b208619dca8c79d3bd859493e2e735db0e78a60`. The day-6 and day-7
fixtures in `tests/fixtures/raid-desert-983/` have compressed SHA-256 values
`8be39ff6fc87de8d138d0e18f69d28063bb4ececd6ac039e88772a6ceb0a5157`
and `2c5648b334790f43c76acc3f47293a22c46622924a12c5ef1fa42422af2bc8ae`.
Each capture is a real native simulation state, with its active bounds and raid
view restored by the regression test.

## Cause

The animal starts in known open-frontier enclosure 5. Crop representatives are
certified sealed in enclosures 9 (warthog) or 8 (hyena). Native routing says
the crop is blocked, yet 18/19 wall approaches are reachable from the animal.
`perimeterWallSides` builds edges only for walls whose *two sampled sides* have
known, different enclosure IDs. The crop enclosure and animal enclosure are
disconnected in this wall-only graph: some crop-facing wall sides are unknown
at the sampled point. The existing selector then rejects every wall and all
animals eventually withdraw without contact. The earlier hypothesis that the
spawn enclosure has `ids=[]` is false for these captures.

When the wall-only graph cannot connect the sealed crop to the animal, the
change considers at most eight nearby crop representatives overall from blocked
native regions. A fallback wall must intersect the animal-to-crop segment and pass the
existing native near-side connectivity and approach-path checks. It does not
change route physics, attack timing, damage, RNG, raid composition or balance.
Off-axis reachable walls are excluded. The existing graph-based choice is kept
when it has a route through known enclosure IDs.

## Bounded native replay

The same snapshot was reloaded for each 60-second replay. Numbers below are
cumulative `targetFor` wall-clock samples, not whole-tick time; a different
number of selections is expected after animals begin walking and attacking.

| Day | Selector | Selections | Selection time, two runs | Native hits | Wall damage |
| --- | --- | ---: | ---: | ---: | --- |
| 6 | main `020b6abc` | 440 | 230–247 ms | 0 | none |
| 6 | patch | 314 | 454–568 ms | 19 | 1586, 1869–1872 |
| 7 | main `020b6abc` | 570 | 288–496 ms | 0 | none |
| 7 | patch | 332 | 351–359 ms | 17 | 1586, 1868–1872 |

Day 6 reached `attacking` before hits were consumed. The 19 hits reduced wall
HP to zero on five crop-facing perimeter pieces. Repeating the patched replay
with the same source/state produced the same serialized-state SHA-256
`c42b46e5eb02a683d64687004f22dfed83571ed0fa9f0e45eca5d4913779e2f4`.
The regression also compares a fresh replay with one after snapshot
serialize/deserialize and requires the same full state, attacking time, hit
count and damaged-wall IDs.

The affected day-6 crops are **still not certified reachable** after these
60 seconds and broken walls. This fix restores physical attacks against the
crop-facing wall; it does not establish a route into the crop area or prove a
change in the 21-night balance outcome. In the mainline native ring control, a
wall is selected for a sealed crop and a wide removed section makes the crop
selectable. A separate negative test keeps a reachable off-axis wall from
being selected for a naturally isolated crop. The bounded fallback uses
geometry only for candidate nomination; each attack still requires a native
path to a physical approach point.

Focused tests: `node --test tests/raid-region-selection.test.js
tests/raid-desert-wall-target.test.js`; native ring control in
`tests/spatial-navigation-movement.test.js`. CI playable suite and build passed.
