# Routing integration

Production uses the measured pre-A* geometric candidate, sharing the existing
building-corner utility instead of maintaining a duplicate cache. Direct and
one-corner routes retain swept-body, slope, fluid, watering-height and stand-off
checks; after five unsuccessful probes the original eight-side A* fallback runs.
No terrain-dependent route cache, speed, wage, crop yield or pricing change.

20 initial directed checks and18 final directed checks pass. The full suite
initially passes3713/3715. Both failures remain archived: the blocked-route
test double rejected only A*, and the Desert/Suajili night9 test searched for a
historical animal ID after physical deliveries changed IDs/composition.

The obstruction test now rejects all physical routing primitives. The native
night9 test checks every actual animal landing against unchanged terrain limits;
the lion8183 historical checkpoint remains tested in animal-slope-recovery.
The first recheck passes43/44 (the ID-only change still missed a night without
a lion); the final21/21 animal/legacy checks pass after broadening that landing
invariant to every actual animal. The game/shortcut checks in the43 passing
cases include the corrected obstruction test and all rotated building cultures.
This is reported as an initial full suite plus targeted repairs, not a fabricated
fully green rerun. The new full CI result must still be inspected.

The complete crop golden change is explicit: previous native opening27 paid
crates/409 coins, new opening28/423. The previous full save/hash remains in the
test; the new complete state and metadata-free state have separately audited
hashes. The original economy audit still requires real pickup, physical carrier
delivery, integer ledger settlement and every mandatory watering checkpoint.

The observer500-tick replay matches the complete serialized state at every tick:
44 watering routes,32 direct preflights,12 A* queries, no state modifications.
The shorter50-tick run had zero new queries and is retained with that limitation.
The two native saved detour tests separately exercise geometric corner routes
and show the observed route equals production without A*.

Build, browser syntax, balance reproduction and relative web packaging pass.
Timing under concurrent test activity is not a new performance benchmark.
Renderer/mobile and the responsible30-combination campaign matrix remain open.
Logs retain original warnings and failures. receipt.json hashes raw gzip payloads
and final integration sources; it does not reattribute earlier logs to a later
test source or claim that a snapshot proves rendered animation.
