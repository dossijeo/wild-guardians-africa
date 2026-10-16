# Dense-raid reload movement assertion

The frozen Sabana/712 raid with a collapsed wall failed its post-reload
static-clearance assertion at tick 461. A retreating hyena moved from
`(92.740219, 8.748081)` to `(93, 9.588131)` while consuming waypoint
`(93, 9)`. The old assertion tested the straight chord between tick endpoints
and reported a barrier crossing. Native `segmentClear` rejected that chord but
accepted **both actual legs**: start to `(93, 9)`, then `(93, 9)` to the new
position. The nearby wall at `(93.017857, 10)` was ruined; the neighboring
modules remained intact. The animal neither teleported nor crossed an intact
wall in this replay.

The test now snapshots path point identities before the tick. When the first
remaining waypoint after the tick is an old point, it checks every consumed
waypoint and the final partial leg. If the path was replaced or cancelled,
it retains the conservative direct check. The full four-case
`tests/spatial-campaign-terminal.test.js` file passes after this correction.
No movement, collision, damage, balance or WASM code changed.
