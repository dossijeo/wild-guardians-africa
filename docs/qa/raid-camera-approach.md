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
all six biomes. Native visual QA remains pending; unit results are not evidence
of visual smoothness or traveling performance. This change does not activate any
experimental preparation flag.
