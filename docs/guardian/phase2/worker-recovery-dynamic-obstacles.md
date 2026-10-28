# Changing obstacles during worker recovery

The previous initial sweep could become stale when a wall or gate changed during the get-up. Worker recovery now rechecks the planned root travel with the existing navigation predicates in bounded 8 cm segments. If blocked, it caps the displacement already attained; the existing renderer correction eases toward that cap as the pose completes. Save state retains the cap, and final logical reconciliation uses it exactly once.

Validation: 14 tests passed across worker-recovery-state, worker-recovery-idle-exit and worker-recovery-boundaries. New cases cover a newly blocked route after recovery starts, save/resume of the capped motion, and a blocked swept segment during a large time step. The four existing skeletal boundary checks remain passing. Production build passed.

Limits: this constrains the planned root travel, not every articulated body part. It does not resolve a structure created directly over the already occupied body, and does not change beast recovery. Graphical validation with a changing obstacle is still pending; test success is not visual acceptance.


## Runtime scenario (2026-10-28)

Added explicit fixture controls for placing a wall during a paused get-up and viewing the opposite side of the worker. Placement uses Game.placeStructure and current navigation. For this synthetic timing test only, the fixture temporarily supplies a peaceful state while placing the wall, then restores the raid/time; normal game night-building permissions are unchanged.

Ran the olderMale candidate in actual WorldScene/Game.tick on Intel UHD. Added the wall at recovery age .5383 s, then stepped forward. At 1.9783 s travelLimit was .38758027; recovery finished and status returned to fleeing with exit blend .22 s, errors empty. Evidence in worker-dynamic-wall. The rendered worker is visible upright in finished.png. Mid-recovery captures are heavily obscured by wall geometry, including from the opposite view, so they do not prove anatomical clearance or continuous absence of intersections. Full visual acceptance remains pending; do not classify these screenshots as a complete collision pass.
