# Incursion approach tracking

User request, 2026-10-09: after focusing the arriving animal, follow it while it
approaches the farm and stop following when it enters.

RaidCameraDirector now selects an active entering animal, performs its existing
smooth terrain-safe trip, and keeps its destination on that animal after the
initial trip completes. The first entry into raidFarmBounds freezes the
destination. If entry occurs before the initial trip ends, the trip finishes
smoothly toward that entry point rather than snapping or chasing into crops.
The shared farm envelope is captured once per raid, as for existing observers.

Manual pointer/orbit input or wheel cancellation still relinquishes control;
the same raid cannot immediately reclaim it. Blocking pauses preserve the pose.
Retreat, disappearance and raid termination stop tracking. Existing persisted
cameraFocusedAnimalId prevents replay after a save reload; no save format changes.

Directed tests cover moving approach beyond the initial trip, early entry,
manual interruption, hidden pause, departure, reload and terrain protection in
all six biomes. Native Gran Cañón/Mapungubwe verification on main 3832e40d
also observed continued following after the initial 1.2-second trip: camera and
walking animal shared X/Z (-30.684595, 50.105090), then reached Z 42.547340
before travel became null. The animal was visible, its rig loaded, and reported
errors and browser error logs were empty. [Arrival capture](raid-camera-approach-native/arrival.png)
and [DOM report](raid-camera-approach-native/arrival.json) are retained.

The first URL used an invalid biome identifier and failed before initialization;
its negative report is retained separately. The fixture pauses simulation on
arrival, so subsequent movement inside the farm is covered by directed tests,
not by that screenshot. Browser tab 872 was closed; no physical GPU disposal or
frame-time measurement is claimed. Other biomes and manual input are covered
by directed tests. This change does not activate experimental preparation flags.
