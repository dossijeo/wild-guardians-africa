# Recorded paid-defense night 54: overlapping tree retreat

The frozen `a28c843` paid-defense campaign terminated with an unfinished real
incursion on day 54. The archived status retains that failure; this change does
not turn that historical run into a successful 100-night campaign.

`failure-state.json.gz` contains the complete recorded state, without trimming
plants, workers, structures, departed animals or the procedural seed. Its
uncompressed SHA-256 is
`17d4cb1243c34656d4b481fcd0ec926ebd21a988c6478ed68ac8e70ad0fea70c`.

On pre-fix main `10f7fef`, ten one-second `updateRaid` calls left the only live
animal, buffalo `animal-173044`, at `(100.61987060280946, 30.033877460209453)`.
Its saved exit was walkable, but its origin overlapped procedural tree `0:7:2`.
Terrain was valid; there was no fluid or structural blocker at the origin.
The tree's radius was 4.284800354927381 m and the buffalo's radius 0.97 m.
Normal swept collision rejected every connector from the overlapping origin.
The evidence establishes the saved overlap and failed retreat, not the earlier
event that first created that overlap.

The fallback applies only to an animal's expanded exit search after the normal
routes fail. It finds an outward connector to a walkable point, followed by a
normal native route to the original exit. Clearance from every already
overlapping prop must increase continuously. New prop intersections, structures
and unsafe terrain remain forbidden. It does not teleport, shrink, despawn,
change the hit budget or add a timeout. Ordinary navigation remains strict.

`tests/raid-prop-overlap-retreat.test.js` continues this exact state in 0.1-second
steps, reloads during departure and proves bounded physical speed, outward
clearance, arrival at the saved exit, one RaidEnded, unchanged ledger/structures,
and the deferred real dawn reaching day 55 with hiring open. Separate rejection
cases cover inward movement, another tree, a building and unsafe terrain.

Validation: the exact regression and rejection case pass; the directed actor
motion, paid-defense retreat, retreat-detour and traffic-corner group passes
31/31. The additional raid navigation, safe-exit, canyon retreat and shield/motion
group passes 88/88 (the two new tests are shared by both groups).
No browser or full-campaign
completion is claimed by this regression.

Production build passes (225 modules; existing bundle-size warning remains).
