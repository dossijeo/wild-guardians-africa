# Opposing animal traffic at solid terrain corners

The intensive campaign exposed two further real motion failures after the
day-32 Musgum fix: Sabana/Musgum on night 78 and Gran Río/Mapungubwe on night 65.
Each reached the unchanged 2,400-second incursion limit. Two remaining animals
were stationary, one retreating and one approaching a crop, despite valid static
routes to their original destinations. Replaying each saved failure for another
240 seconds with the preceding implementation left the same pair stationary.

The local ring graph could not connect around the occupied corner. When that
graph fails, opposing moving actors now use stable identity to choose one actor
to yield. It first walks away into space checked against both native geometry
and the other bodies, then resumes its retained route. A stationary body cannot
trigger this fallback. It does not alter speed, radius, hits, destination or
terrain, and does not teleport or remove animals. The normal unobstructed route
and successful ring detour return before the fallback's five candidate checks.

The original complete states are preserved losslessly as gzip in
`raid-traffic-corners/`; `snapshots.json` records their original paths, sizes and
SHA-256 digests. The before reports retain the actual campaign provenance and
failure rather than relabelling those campaigns as victories.

`tests/raid-traffic-corners.test.js` decompresses and validates those exact states,
then runs the real Game tick and native Navigation. Both incursions finish:

| Case | Simulated seconds after loading failure | Result |
| --- | ---: | --- |
| Sabana/Musgum, night 78 | 28.3 | Original exits reached; day 79 |
| Gran Río/Mapungubwe, night 65 | 42.4 | Original exits reached; day 66 |

The tests verify swept body clearance in actual sequential actor order, native
terrain/building clearance, original exits, speed bounds, a single RaidEnded,
no defeat and an exact save round trip. `domain-after.jsonl` records the replay.
All 398 directed navigation, gate, encounter and raid tests pass. Build and web
package verification also pass. The three-day intensive opening remains byte
identical to the preceding reference, recorded in `opening-equivalence.json`.

These are domain reproductions, not rendered or physical mobile checks. They
do not prove completion of either 100-night campaign or the full biome/culture
matrix. Those campaigns require fresh continuous runs with the corrected code.
