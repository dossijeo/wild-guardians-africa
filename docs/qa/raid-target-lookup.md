# Raid target lookup without farm-history copies

`updateRaid` previously spread all plants and structures into a new array before
looking up each animal's retained target, both during travel and when an attack
finished. A hundred-night farm retains thousands of dead plants for saving and
audit, so each lookup allocated a history-sized array even when its target was
near the beginning.

`raidTarget` now searches the plant array first, then the structure array if no
eligible plant matched. It applies the same predicate to both arrays, preserving
crop-first priority, dead/damaged crop rejection, introductory protection and
structure state rejection. Invalid earlier matches still do not hide a later
valid match. No new target index, stale cache or saved state is introduced.

Validation:

- 10,500 deterministic differential queries match the preceding spread-based
  reference by object identity, including duplicate IDs and missing targets.
- The large-history test rejects spread iteration and checks plant, structure
  and missing-target lookups through the production helper.
- All 400 directed navigation, gate, encounter and raid tests pass, including
  the three complete recorded incursions that previously deadlocked.
- The three-day intensive opening remains identical to SHA-256
  `2e3a31cb41bb301079b641a135810973ea9715ca05ec0dd3c7272ee66716358d`.
- Web build and package validation pass.

`raid-target-lookup/benchmark.json` retains seven samples for 400 queries against
the exact night-78 Musgum state (9,446 plants), including live, final, structure,
missing and null target IDs. The local median was 139.43 ms for the reference
and 82.04 ms for the new helper. Warmup, JIT, GC and concurrent campaign jobs
affect these timings. This isolated CPU benchmark does not measure rendered
frametime, GPU performance or physical mobile FPS. The unconditional improvement
is eliminating the complete-history array allocation on each lookup.
