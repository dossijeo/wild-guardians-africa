# Mangrove retreat: occupied retained endpoints

The naturally reached Manglares/Mapungubwe night-72 checkpoint from the older
intensive campaign still stalled on main 89c38bd. Its two remaining warthogs
did not move during a further 120 simulated seconds. The complete snapshot is
preserved as `manglares-mapungubwe-state.json.gz`; its uncompressed SHA-256 is
`4bc7a09c12560b0664c66982de43d27cd11e5f704057885a4cee8543b8bb4d4b`.

A short retained exit route lay entirely inside opposing traffic. The early
occupied-goal return bypassed the existing verified yielding fallback. That
fallback now also runs before this return. Stable identity selects the yielding
actor; both terrain and body clearance must hold for its temporary waypoint.
Original routes, exits, radius, speed, damage and game timing remain unchanged.

`mangrove-domain-before.json` preserves the unresolved 120-second baseline.
`mangrove-domain-after.json` replays the lossless archive with native Game and
Navigation and reaches day 73 after four one-second ticks. The manifest adds
this exact checkpoint to the existing regression test, which checks continuous
swept body clearance, native terrain clearance, unchanged exits, bounded speed,
one RaidEnded, no defeat and save round trip. All 161 selected movement,
encounter and raid tests pass. Build and web-package validation pass.

The browser fixture loads the same digest, production WorldScene and original
rigs. Both animals reach their original exits after 3.2 simulated seconds at
the browser's capped animation-frame delta; day 73 opens hiring. Before/after
JSON and PNG evidence is alongside this note. No fixture errors or console
errors were recorded. Two shader compiler warnings report potentially
uninitialized `f_environment4`; this replay does not resolve those warnings.

This is a targeted replay with medium quality, original terrain and models,
without gameplay HUD or audio. It is not a fresh 100-night campaign, physical
mobile acceptance, frame-time measurement or proof of the full biome/culture
matrix. The historical campaign remains recorded as a failure.
