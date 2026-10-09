# Desert night 59: blocked elected yield

Run [37866160888](https://github.com/dossijeo/wild-guardians-africa/actions/runs/37866160888), frozen source 33937b929341c189d574c59540277a2c2e88297c, failed its unchanged responsible100 policy with "Unfinished real incursion on day59". This was a simulation deadlock, not an economic defeat. The complete failure snapshot, status and process are preserved gzip-compressed with original byte/hash receipts. No campaign completion is claimed.

The four-animal raid had two animals already gone. Walking warthog animal-83365 and exhausted retreating warthog animal-83366 faced each other beside solid terrain and 17 fleeing workers. Stable identity elected the latter to yield, but all five approved yield directions were obstructed. The former had a valid physical yield. Original source leaves the complete saved state at dawn waiting for the raid: both directed regression cases fail (regression-before.txt).

The fix retains identity election when its actor has a clear yield, and permits the other actor to yield only when that elected actor has none. All candidates still pass native swept terrain and body clearance. It does not relocate actors, relax collisions, change their size/speed/hits, change exits or increase the campaign deadline.

Both regression cases reload the full native snapshot (79 workers, four animals), using normal Game.tick at dt 0.1 and 1. Both reach day60 and mandatory hiring within120 seconds, preserve physical exits, movement speed, disjoint animal bodies, solid terrain, zero attacks for the exhausted actor, one RaidEnded and persistence roundtrip. The dt1 replay finishes after26 simulated seconds; its raw positions are retained. Related opposing traffic, Musgum, paid-defense and prop-overlap regressions:34 tests passed,0 failed (19.526s).

This is a recorded-night regression, not a new100-night victory, GPU benchmark or visual/mobile acceptance. The failed campaign remains failed; the same policy must be rerun on the fixed source.
